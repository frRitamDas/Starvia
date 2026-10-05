import { guard } from "@/lib/api/helpers";
import { generateStudyMindMap } from "@/lib/ai";
import { ApiError, ok } from "@/lib/http";
import { getStudyNote, saveStudyNoteMindMap } from "@/lib/data/notes";
import { buildDemoMindMap } from "@/lib/notes/mind-map";
import { requireOnboarded, touchActivity } from "@/lib/session";
import { addTokenUsage, consumeQuota, logAiEvent, refundQuota } from "@/lib/usage";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return guard("notes.mind_map", async () => {
    const context = await requireOnboarded();
    const { id } = await params;
    const note = await getStudyNote(context, id);
    if (!note) throw new ApiError("NOT_FOUND", "That note no longer exists.");
    if (!note.content.trim()) {
      throw new ApiError("BAD_REQUEST", "Add some notes before creating a mind map.");
    }

    // Mind maps share the transparent daily AI study quota used for tutorials.
    await consumeQuota(context, "tutorial");
    let settled = false;

    try {
      let mindMap;
      let model = "demo";
      let tokens = 0;

      if (context.demo) {
        mindMap = buildDemoMindMap(note.topic || note.title, note.content);
      } else {
        const generated = await generateStudyMindMap({
          title: note.title,
          subject: note.subject,
          topic: note.topic,
          classLevel: context.profile.class_level,
          board: context.profile.board,
          content: note.content,
        });
        mindMap = generated.payload;
        model = generated.model;
        tokens = generated.tokens;
      }

      const updatedNote = await saveStudyNoteMindMap(context, id, mindMap);
      settled = true;

      await Promise.allSettled([
        touchActivity(context, 2),
        addTokenUsage(context, "tutorial", tokens),
        logAiEvent(context, { feature: "tutorial", status: "success", model, tokens }),
      ]);

      return ok({ note: updatedNote, model });
    } catch (error) {
      if (!settled) {
        await refundQuota(context, "tutorial").catch((refundError) => {
          console.error("[notes] mind-map quota refund failed:", refundError);
        });
        await logAiEvent(context, { feature: "tutorial", status: "error" });
      }
      throw error;
    }
  });
}
