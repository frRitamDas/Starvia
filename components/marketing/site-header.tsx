"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, LayoutDashboard, Menu, Sparkles } from "lucide-react";

import { StarviaLogo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Badge } from "@/components/ui/badge";
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
  const [scrolled, setScrolled] = React.useState(false);
  const [hash, setHash] = React.useState("");

  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    const onHashChange = () => setHash(window.location.hash);
    onScroll();
    onHashChange();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("hashchange", onHashChange);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("hashchange", onHashChange);
    };
  }, []);

  const isActive = (href: string) => {
    if (href.startsWith("/#")) {
      return pathname === "/" && hash === href.slice(1);
    }
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 border-b pt-[env(safe-area-inset-top)] backdrop-blur-2xl transition-[background-color,box-shadow,border-color] duration-200 supports-[backdrop-filter]:bg-background/75",
          scrolled
            ? "border-border/80 bg-background/95 shadow-[0_8px_30px_-20px_hsl(var(--foreground)/.35)]"
            : "border-border/60 bg-background/90",
        )}
      >
        <div className="container flex h-16 min-w-0 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <StarviaLogo />
            <Badge variant="secondary" className="hidden gap-1.5 border-border/70 text-[10px] font-medium sm:inline-flex">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              AI study workspace
            </Badge>
          </div>

          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            {siteConfig.nav.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
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
                      aria-current={isActive(item.href) ? "page" : undefined}
                      className={cn(
                        "rounded-2xl px-4 py-3.5 text-[15px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                        isActive(item.href) && "bg-accent text-foreground",
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
