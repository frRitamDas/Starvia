import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { StarviaLogo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/[0.07] via-transparent to-transparent" />
      <header className="container flex h-16 items-center justify-between">
        <StarviaLogo />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Home
          </Link>
        </div>
      </header>

      <main id="main" className="flex flex-1 items-center justify-center px-4 py-10 sm:py-14">
        <div className="w-full max-w-md">{children}</div>
      </main>

      <footer className="container py-6 text-center text-xs text-muted-foreground">
        By continuing you agree to our{" "}
        <Link href="/terms" className="underline hover:text-foreground">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline hover:text-foreground">
          Privacy Policy
        </Link>
        .
      </footer>
    </div>
  );
}
