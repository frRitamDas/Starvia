"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, LayoutDashboard, Menu, Sparkles } from "lucide-react";

import { StarviaLogo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

interface SiteHeaderProps {
  signedIn?: boolean;
}

export function SiteHeader({ signedIn = false }: SiteHeaderProps) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-border/70 bg-background/90 pt-[env(safe-area-inset-top)] backdrop-blur-2xl supports-[backdrop-filter]:bg-background/75">
        <div className="container flex h-16 min-w-0 items-center justify-between gap-3">
          <StarviaLogo />

          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            {siteConfig.nav.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-full px-3.5 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                    active && "bg-accent text-foreground",
                  )}
                >
                  {item.title}
                </Link>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <ThemeToggle className="hidden sm:inline-flex" />
            {signedIn ? (
              <Button asChild size="sm" variant="gradient" className="hidden sm:inline-flex">
                <Link href="/dashboard">
                  <LayoutDashboard className="size-4" />
                  Dashboard
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                  <Link href="/login">Sign in</Link>
                </Button>
                <Button asChild size="sm" variant="gradient" className="hidden sm:inline-flex">
                  <Link href="/signup">
                    Start learning
                    <ArrowRight className="size-3.5" />
                  </Link>
                </Button>
              </>
            )}

            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon-sm"
                  className="md:hidden"
                  aria-label="Open navigation"
                >
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="flex w-[min(88vw,360px)] flex-col border-l border-border bg-background">
                <SheetHeader className="border-b border-border/70 pb-5 text-left">
                  <SheetTitle>
                    <StarviaLogo href={null} />
                  </SheetTitle>
                  <p className="text-left text-xs font-normal text-muted-foreground">
                    Your focused AI study space.
                  </p>
                </SheetHeader>

                <nav aria-label="Mobile" className="mt-5 flex flex-col gap-1">
                  {siteConfig.nav.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "rounded-2xl px-4 py-3.5 text-[15px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                        pathname === item.href && "bg-accent text-foreground",
                      )}
                    >
                      {item.title}
                    </Link>
                  ))}
                </nav>

                <div className="mt-auto space-y-2 border-t border-border/70 pt-5">
                  {signedIn ? (
                    <Button asChild variant="gradient" size="lg" className="w-full" onClick={() => setOpen(false)}>
                      <Link href="/dashboard">Open my study space <ArrowRight /></Link>
                    </Button>
                  ) : (
                    <>
                      <Button asChild variant="gradient" size="lg" className="w-full" onClick={() => setOpen(false)}>
                        <Link href="/signup">Create free account <Sparkles /></Link>
                      </Button>
                      <Button asChild variant="outline" size="lg" className="w-full" onClick={() => setOpen(false)}>
                        <Link href="/login">Sign in</Link>
                      </Button>
                    </>
                  )}
                  <div className="flex justify-center pt-1">
                    <ThemeToggle />
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
    </>
  );
}
