"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, LogOut, Moon, Sun } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "@/components/theme/theme-provider";
import { initialsOf } from "@/lib/utils";

export function AvatarUploader({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [preview, setPreview] = React.useState<string | null>(avatarUrl);
  const [pending, setPending] = React.useState(false);

  async function upload(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Avatar must be smaller than 2 MB.");
      return;
    }

    setPending(true);
    // Optimistic local preview so the change feels instant.
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/profile/avatar", { method: "POST", body: formData });
      const body = (await response.json().catch(() => null)) as
        | { ok: boolean; data?: { avatarUrl: string | null }; error?: { message: string } }
        | null;

      if (!response.ok || !body?.ok) {
        throw new Error(body?.error?.message ?? "Could not upload that image.");
      }

      setPreview(body.data?.avatarUrl ?? localUrl);
      toast.success("Profile photo updated");
      router.refresh();
    } catch (error) {
      setPreview(avatarUrl);
      toast.error(error instanceof Error ? error.message : "Could not upload that image.");
    } finally {
      URL.revokeObjectURL(localUrl);
      setPending(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar className="size-16">
        {preview ? <AvatarImage src={preview} alt={name} /> : null}
        <AvatarFallback className="text-base">{initialsOf(name) || "S"}</AvatarFallback>
      </Avatar>

      <div className="space-y-1.5">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
          }}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={pending}
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
          Change photo
        </Button>
        <p className="text-[11.5px] text-muted-foreground">PNG or JPG, up to 2 MB.</p>
      </div>
    </div>
  );
}

export function ThemeSetting() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const options = [
    { value: "light" as const, label: "Light", icon: Sun },
    { value: "dark" as const, label: "Dark", icon: Moon },
  ];

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-[13.5px] font-medium">Appearance</p>
        <p className="text-[12px] text-muted-foreground">
          Currently following your {theme === "system" ? "system" : "saved"} preference
          {resolvedTheme === "dark" ? " · dark" : " · light"}.
        </p>
      </div>
      <div className="flex gap-2">
        {options.map((option) => (
          <Button
            key={option.value}
            variant={theme === option.value ? "default" : "outline"}
            size="sm"
            onClick={() => setTheme(option.value)}
          >
            <option.icon className="size-4" />
            {option.label}
          </Button>
        ))}
        <Button variant={theme === "system" ? "default" : "outline"} size="sm" onClick={() => setTheme("system")}>
          System
        </Button>
      </div>
    </div>
  );
}

export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function signOut() {
    setPending(true);
    try {
      await fetch("/api/auth/signout", { method: "POST" });
      toast.success("Signed out");
      router.push("/");
      router.refresh();
    } catch {
      toast.error("Something went wrong. Please try again.");
      setPending(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={signOut} disabled={pending} className={className}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
      Sign out
    </Button>
  );
}

export function SettingsCard({
  email,
  planName,
  dangerZone = false,
}: {
  email: string | null;
  planName: string;
  dangerZone?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Account settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[13.5px] font-medium">Email</p>
            <p className="text-[12px] text-muted-foreground">{email ?? "Not available"}</p>
          </div>
          <span className="text-[11.5px] text-muted-foreground">
            Email changes are handled from your account email link
          </span>
        </div>

        <Separator />

        <ThemeSetting />

        <Separator />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[13.5px] font-medium">Plan & billing</p>
            <p className="text-[12px] text-muted-foreground">You&apos;re on the {planName} plan.</p>
          </div>
          <Button asChild variant="outline" size="sm">
            <a href="/upgrade#billing">Manage subscription</a>
          </Button>
        </div>

        {dangerZone ? (
          <>
            <Separator />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[13.5px] font-medium">Session</p>
                <p className="text-[12px] text-muted-foreground">
                  Sign out of Starvia on this device.
                </p>
              </div>
              <SignOutButton />
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
