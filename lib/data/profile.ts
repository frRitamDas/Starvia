import "server-only";

import { demoStore } from "@/lib/demo/store";
import { ApiError } from "@/lib/http";
import type { SessionContext } from "@/lib/session";
import type { Profile } from "@/lib/types";
import type { ProfileRow } from "@/lib/supabase/types";
import type { ProfileInput } from "@/lib/validation";

/** Student profile read/write. */

export async function getProfile(context: SessionContext): Promise<Profile | null> {
  if (!context.user) return null;
  if (context.demo) return demoStore().profile;
  const { data } = await context.db!
    .from("profiles")
    .select("*")
    .eq("id", context.user.id)
    .maybeSingle();
  return (data as unknown as Profile | null) ?? null;
}

export async function upsertProfile(
  context: SessionContext,
  input: Partial<ProfileInput> & { avatar_url?: string | null },
  options: { markOnboarded?: boolean } = {},
): Promise<Profile> {
  if (!context.user) throw new ApiError("UNAUTHORIZED");

  const patch: Partial<ProfileRow> = {
    ...(input.full_name !== undefined ? { full_name: input.full_name } : {}),
    ...(input.class_level !== undefined ? { class_level: input.class_level } : {}),
    ...(input.board !== undefined ? { board: input.board } : {}),
    ...(input.subjects !== undefined ? { subjects: input.subjects } : {}),
    ...(input.learning_level !== undefined ? { learning_level: input.learning_level } : {}),
    ...(input.exam_target !== undefined ? { exam_target: input.exam_target ?? null } : {}),
    ...(input.avatar_url !== undefined ? { avatar_url: input.avatar_url ?? null } : {}),
    ...(options.markOnboarded ? { onboarded_at: new Date().toISOString() } : {}),
  };

  if (context.demo) {
    const profile = demoStore().profile;
    Object.assign(profile, patch, { updated_at: new Date().toISOString() });
    return profile;
  }

  // Completing onboarding should also stamp the email so admin lists are useful.
  if (options.markOnboarded && context.user.email && !context.profile?.email) {
    patch.email = context.user.email;
  }

  if (!context.profile) {
    const { data, error } = await context.db!
      .from("profiles")
      .upsert({ id: context.user.id, email: context.user.email, ...patch }, { onConflict: "id" })
      .select("*")
      .single();
    if (error || !data) {
      console.error("[profile] upsert:", error?.message);
      throw new ApiError("SERVER_ERROR", "Could not save your profile. Please try again.");
    }
    return data as unknown as Profile;
  }

  const { data, error } = await context.db!
    .from("profiles")
    .update(patch)
    .eq("id", context.user.id)
    .select("*")
    .single();

  if (error || !data) {
    console.error("[profile] update:", error?.message);
    throw new ApiError("SERVER_ERROR", "Could not save your profile. Please try again.");
  }
  return data as unknown as Profile;
}

/** Avatar upload to Supabase Storage (folder per user, RLS enforced). */
export async function uploadAvatar(
  context: SessionContext,
  file: File,
): Promise<string | null> {
  if (!context.user) throw new ApiError("UNAUTHORIZED");
  if (context.demo || !context.db) return null;

  const allowed = ["image/png", "image/jpeg", "image/webp"];
  if (!allowed.includes(file.type)) {
    throw new ApiError("BAD_REQUEST", "Please upload a PNG, JPEG or WebP image.");
  }
  if (file.size > 2 * 1024 * 1024) {
    throw new ApiError("BAD_REQUEST", "Avatar must be smaller than 2 MB.");
  }

  const extension = file.type.split("/")[1];
  const path = `${context.user.id}/avatar-${Date.now()}.${extension}`;
  const { error } = await context.db.storage
    .from("avatars")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) {
    console.error("[profile] uploadAvatar:", error.message);
    throw new ApiError("SERVER_ERROR", "Could not upload that image.");
  }

  const { data } = context.db.storage.from("avatars").getPublicUrl(path);
  return data.publicUrl ?? null;
}
