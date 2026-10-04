import { guard } from "@/lib/api/helpers";
import { ApiError, ok } from "@/lib/http";
import { requireUser } from "@/lib/session";
import { uploadAvatar, upsertProfile } from "@/lib/data/profile";

const MAX_BYTES = 2 * 1024 * 1024;

/** Avatar upload — validated server-side, stored in the user's own folder. */
export async function POST(request: Request) {
  return guard("profile.avatar", async () => {
    const context = await requireUser();

    const formData = await request.formData().catch(() => null);
    const file = formData?.get("file");
    if (!(file instanceof File)) {
      throw new ApiError("BAD_REQUEST", "Choose an image to upload.");
    }
    if (file.size > MAX_BYTES) {
      throw new ApiError("BAD_REQUEST", "Avatar must be smaller than 2 MB.");
    }

    const url = await uploadAvatar(context, file);
    if (!url) {
      throw new ApiError(
        "NOT_CONFIGURED",
        "File storage isn't configured on this deployment yet.",
      );
    }

    const profile = await upsertProfile(context, { avatar_url: url });
    return ok({ avatarUrl: profile.avatar_url });
  });
}
