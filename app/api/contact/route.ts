import { guard, readJson } from "@/lib/api/helpers";
import { assertRateLimit, clientKey, ok } from "@/lib/http";
import { getSessionContext } from "@/lib/session";
import { saveFeedback } from "@/lib/data/feedback";
import { contactSchema } from "@/lib/validation";

/** Public contact form. Heavily rate limited; stored for support follow-up. */
export async function POST(request: Request) {
  return guard("contact.post", async () => {
    assertRateLimit(`contact:${clientKey(request)}`, 5, 60 * 60 * 1000);

    const parsed = contactSchema.parse(await readJson(request));
    const context = await getSessionContext().catch(() => null);

    const result = await saveFeedback(context, {
      category: "contact",
      message: `[${parsed.subject}] ${parsed.message}`,
      email: parsed.email,
      name: parsed.name,
      page: "/contact",
    });

    return ok({ id: result.id });
  });
}
