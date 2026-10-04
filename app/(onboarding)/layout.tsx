import Link from "next/link";

import { StarviaLogo } from "@/components/brand/logo";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="mx-auto flex w-full max-w-2xl items-center justify-between px-4 py-5">
        <Link href="/" aria-label="Starvia home">
          <StarviaLogo />
        </Link>
        <span className="text-[12px] text-muted-foreground">Takes about a minute</span>
      </header>

      <main id="main" className="mx-auto w-full max-w-2xl flex-1 px-4 pb-12">
        {children}
      </main>

      <footer className="border-t border-border/60 py-5 text-center text-[12px] text-muted-foreground">
        Your details stay private and are only used to personalise your learning.
      </footer>
    </div>
  );
}
