"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { FirebaseError, getApps, initializeApp } from "@firebase/app";
import { GoogleAuthProvider, getAuth, signInWithPopup } from "@firebase/auth";
import { AlertCircle, Loader2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export interface FirebasePublicConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
  messagingSenderId?: string;
}

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.4a5.5 5.5 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.6-5.2 3.6-8.8Z" />
      <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1 .7-2.4 1.2-4 1.2-3 0-5.6-2-6.6-4.8H1.4v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.4 14.5a7.2 7.2 0 0 1 0-4.9V6.5H1.4a12 12 0 0 0 0 11l4-3Z" />
      <path fill="#EA4335" d="M12 4.8c1.7 0 3.2.6 4.4 1.7l3.3-3.3A11.6 11.6 0 0 0 12 0 12 12 0 0 0 1.4 6.5l4 3.1C6.4 6.8 9 4.8 12 4.8Z" />
    </svg>
  );
}

export function GoogleAuthButton({
  config,
  next = "/dashboard",
  label = "Continue with Google",
}: {
  config: FirebasePublicConfig | null;
  next?: string;
  label?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function signIn() {
    setError(null);
    if (!config) {
      setError("Google sign-in needs Firebase keys on this deployment. You can still explore the demo below.");
      return;
    }
    setPending(true);
    try {
      const app = getApps()[0] ?? initializeApp(config);
      const auth = getAuth(app);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const credential = await signInWithPopup(auth, provider);
      const idToken = await credential.user.getIdToken(true);

      const response = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, next }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; data?: { redirect?: string }; error?: { message?: string } }
        | null;
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error?.message || "Google sign-in could not be completed.");
      }

      router.push(payload.data?.redirect || next);
      router.refresh();
    } catch (caught) {
      if (caught instanceof FirebaseError && caught.code === "auth/popup-closed-by-user") {
        setError("Google sign-in was cancelled.");
      } else if (caught instanceof FirebaseError && caught.code === "auth/popup-blocked") {
        setError("Your browser blocked the Google sign-in window. Allow pop-ups and try again.");
      } else {
        setError(caught instanceof Error ? caught.message : "Google sign-in could not be completed.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full border-border/80 bg-background/80 shadow-sm hover:border-primary/30 hover:bg-background"
        onClick={signIn}
        disabled={pending}
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <GoogleGlyph />}
        {pending ? "Connecting securely…" : label}
      </Button>
      {error ? (
        <Alert variant="destructive" className="py-2.5">
          <AlertCircle className="size-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
