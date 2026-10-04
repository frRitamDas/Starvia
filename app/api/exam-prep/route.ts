import { guard, readJson } from "@/lib/api/helpers";
import { ApiError, ok } from "@/lib/http";
import { requireOnboarded, touchActivity } from "@/lib/session";
import { consumeQuota, logAiEvent } from "@/lib/usage";
import { listExamPlans, saveExamPlan, listStudyProgress } from "@/lib/data/progress";
import { generateExamPlan } from "@/lib/ai";
import { demoExamPlan } from "@/lib/ai/demo-generator";
import { demoMode } from "@/lib/env";
import { examPlanSchema } from "@/lib/validation";
import { getCapabilities } from "@/lib/plans";
import { examTypeLabel } from "@/lib/curriculum";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  return guard("examprep.list", async () => {
    const context = await requireOnboarded();
    const [plans, topics] = await Promise.all([
      listExamPlans(context),
      listStudyProgress(context, 200),
    ]);
    return ok({ plans, topics });
  });
}

/** Generate a revision plan (+ mock test blueprint) for an exam. */
export async function POST(request: Request) {
  return guard("examprep.generate", async () => {
    const context = await requireOnboarded();
    const input = examPlanSchema.parse(await readJson(request));

    const capabilities = getCapabilities(context.plan);
    if (!capabilities.advancedExamPrep && input.plannedDays > 3) {
      throw new ApiError(
        "PAYMENT_REQUIRED",
        "Multi-day revision plans are part of Pro and Ultra. Upgrade to unlock full exam preparation.",
        { upgrade: true },
      );
    }

    await consumeQuota(context, "exam_prep");

    const payload = demoMode()
      ? demoExamPlan(input)
      : (
          await generateExamPlan(
            {
              board: input.board,
              classLevel: input.classLevel,
              subject: input.subject,
              chapter: input.chapter,
              examType: examTypeLabel(input.examType),
              plannedDays: input.plannedDays,
            },
            context.admin ?? context.db,
          )
        ).payload;

    const plan = await saveExamPlan(context, {
      board: input.board,
      classLevel: input.classLevel,
      subject: input.subject,
      chapter: input.chapter,
      examType: input.examType,
      plannedDays: input.plannedDays,
      payload,
      model: demoMode() ? "demo" : "gemini",
      cacheKey: `${input.subject}:${input.examType}:${input.plannedDays}`,
    });

    await touchActivity(context, 5);
    await logAiEvent(context, { feature: "exam_prep", status: "success" });

    return ok({ plan });
  });
}
