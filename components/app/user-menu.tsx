"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CreditCard, LogOut, Settings, Shield, Sparkles, User } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { PlanId } from "@/lib/plans";
import { initialsOf } from "@/lib/utils";

const PLAN_LABEL: Record<PlanId, string> = {
  free: "Starter · Free",
  pro: "Pro",
  ultra: "Ultra",
};

export function UserMenu({
  name,
  email,
  avatarUrl,
  plan,
  isAdmin = false,
  compact = false,
}: {
  name: string;
  email: string | null;
  avatarUrl: string | null;
  plan: PlanId;
  isAdmin?: boolean;
  compact?: boolean;
}) {
  const router = useRouter();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={compact ? "icon-sm" : "icon"}
          className="rounded-full"
          aria-label="Account menu"
        >
          <Avatar className={compact ? "size-8" : "size-9"}>
            {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
            <AvatarFallback>{initialsOf(name)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="normal-case">
          <div className="space-y-0.5">
            <p className="truncate text-sm font-medium text-foreground">{name}</p>
            <p className="truncate text-xs font-normal text-muted-foreground">{email ?? "—"}</p>
          </div>
        </DropdownMenuLabel>
        <div className="px-2.5 pb-2">
          <Badge variant={plan === "free" ? "secondary" : "gradient"}>{PLAN_LABEL[plan]}</Badge>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile">
            <User className="size-4" />
            Your profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/profile#settings">
            <Settings className="size-4" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/upgrade">
            <CreditCard className="size-4" />
            Plans & billing
          </Link>
        </DropdownMenuItem>
        {isAdmin ? (
          <DropdownMenuItem asChild>
            <Link href="/admin">
              <Shield className="size-4" />
              Admin panel
            </Link>
          </DropdownMenuItem>
        ) : null}
        {plan === "free" ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/upgrade" className="text-primary">
                <Sparkles className="size-4" />
                Upgrade plan
              </Link>
            </DropdownMenuItem>
          </>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={async (event) => {
            event.preventDefault();
            try {
              await fetch("/api/auth/signout", { method: "POST" });
              toast.success("Signed out. See you soon!");
              router.push("/");
              router.refresh();
            } catch {
              toast.error("Could not sign out. Please try again.");
            }
          }}
        >
          <LogOut className="size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
