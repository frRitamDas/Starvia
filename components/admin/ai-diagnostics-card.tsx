"use client";

import * as React from "react";
import { Activity, CheckCircle2, Loader2, RefreshCw, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch, ApiClientError } from "@/lib/client/api";

type ProviderResult = {
  configured: boolean;
  ok: boolean;
  latencyMs: number | null;
  model: string | null;
  error: string | null;
};

type DiagnosticResponse = {
  checkedAt: string;
  primary: string;
  healthy: boolean;
  results: {
    naraRouter: ProviderResult;
    gemini: ProviderResult;
  };
};

function ProviderRow({ label, result }: { label: string; result: ProviderResult | null }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 p-3.5">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {result ? (
            result.ok ? (
              <CheckCircle2 className="size-4 text-success" />
            ) : (
              <XCircle className="size-4 text-destructive" />
            )
          ) : (
            <Activity className="size-4 text-muted-foreground" />
          )}
          <p className="text-[13px] font-medium">{label}</p>
          <Badge
            variant={
              result
                ? result.ok
                  ? "success"
                  : result.configured
                    ? "secondary"
                    : "outline"
                : "outline"
            }
          >
            {result
              ? result.ok
                ? "responding"
                : result.configured
                  ? "configured"
                  : "missing key"
              : "not checked"}
          </Badge>
        </div>
        <p className="mt-1 text-[11.5px] text-muted-foreground">
          {!result
            ? "Run the live provider test to verify an actual response."
            : result.ok
              ? `${result.model ?? "unknown model"} · ${result.latencyMs ?? 0} ms`
              : result.error ?? "Provider did not answer successfully."}
        </p>
      </div>
    </div>
  );
}

export function AiDiagnosticsCard() {
  const [result, setResult] = React.useState<DiagnosticResponse | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function runProbe() {
    setBusy(true);
    try {
      const response = await apiFetch<DiagnosticResponse>("/api/admin/ai-diagnostics", {
        method: "POST",
        json: {},
      });
      setResult(response);
      if (response.healthy) toast.success("At least one AI provider answered successfully.");
      else toast.error("No configured AI provider completed the live probe.");
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "The AI diagnostics probe failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="size-4 text-primary" />
          Live AI provider health
          {result ? (
            <Badge variant={result.healthy ? "success" : "destructive"} className="ml-auto">
              {result.healthy ? "Healthy" : "Action needed"}
            </Badge>
          ) : null}
        </CardTitle>
        <p className="text-[12px] text-muted-foreground">
          This is a real provider request, not an environment-variable check.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <ProviderRow label="NaraRouter" result={result?.results.naraRouter ?? null} />
        <ProviderRow label="Gemini" result={result?.results.gemini ?? null} />
        <Button onClick={() => void runProbe()} disabled={busy} variant="outline" className="w-full">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          {busy ? "Testing providers…" : "Run live provider test"}
        </Button>
        {result ? (
          <p className="text-[11px] text-muted-foreground">
            Last checked {new Date(result.checkedAt).toLocaleString("en-IN")}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
