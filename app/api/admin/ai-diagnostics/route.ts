import { guard } from "@/lib/api/helpers";
import { assertRateLimit, ok } from "@/lib/http";
import { requireAdmin } from "@/lib/session";
import { generateTextGemini, geminiConfigured } from "@/lib/ai/provider";
import { generateTextNaraRouter, naraRouterConfigured } from "@/lib/ai/nararouter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Real provider probe for administrators.
 *
 * /api/health is configuration-only. This route performs a tiny authenticated
 * provider request so an admin can distinguish "env is present" from
 * "the provider actually answers".
 */
export async function POST() {
  return guard("admin.ai-diagnostics", async () => {
    const context = await requireAdmin();
    assertRateLimit("admin-ai-diagnostic:" + context.user.id, 3, 5 * 60 * 1000);

    const results = {
      naraRouter: {
        configured: naraRouterConfigured(),
        ok: false,
        latencyMs: null as number | null,
        model: null as string | null,
        error: null as string | null,
      },
      gemini: {
        configured: geminiConfigured(),
        ok: false,
        latencyMs: null as number | null,
        model: null as string | null,
        error: null as string | null,
      },
    };

    const messages = [
      {
        role: "user" as const,
        parts: [{ text: "Reply with exactly OK." }],
      },
    ];

    if (results.naraRouter.configured) {
      const started = Date.now();
      try {
        const response = await generateTextNaraRouter({
          messages,
          maxOutputTokens: 8,
          temperature: 0,
          timeoutMs: 12_000,
          label: "admin-diagnostic",
        });
        results.naraRouter.ok = response.text.trim().length > 0;
        results.naraRouter.latencyMs = Date.now() - started;
        results.naraRouter.model = response.model;
      } catch (error) {
        results.naraRouter.latencyMs = Date.now() - started;
        results.naraRouter.error = error instanceof Error ? error.message : "Provider probe failed.";
      }
    }

    if (results.gemini.configured) {
      const started = Date.now();
      try {
        const response = await generateTextGemini({
          messages,
          maxOutputTokens: 8,
          temperature: 0,
          timeoutMs: 12_000,
          label: "admin-diagnostic",
        });
        results.gemini.ok = response.text.trim().length > 0;
        results.gemini.latencyMs = Date.now() - started;
        results.gemini.model = response.model;
      } catch (error) {
        results.gemini.latencyMs = Date.now() - started;
        results.gemini.error = error instanceof Error ? error.message : "Provider probe failed.";
      }
    }

    return ok({
      checkedAt: new Date().toISOString(),
      primary: "nararouter",
      results,
      healthy:
        (results.naraRouter.configured && results.naraRouter.ok) ||
        (results.gemini.configured && results.gemini.ok),
    });
  });
}
