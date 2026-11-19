import { NextResponse } from "next/server";
import { HttpError } from "@/lib/appwrite/tasks";
import { handleError } from "@/lib/appwrite/http";
import {
  getProfileContext,
  readAvatar,
  removeAvatar,
  replaceAvatar,
} from "@/lib/appwrite/profile";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { bytes, type } = await readAvatar(await getProfileContext());
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": type,
        // URL carries ?v=<fileId>, so it is safe to cache per-user.
        "Cache-Control": "private, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getProfileContext();
    let file: FormDataEntryValue | null = null;
    try {
      file = (await request.formData()).get("file");
    } catch {}
    if (!(file instanceof File)) throw new HttpError(400, "Missing image file.");
    return NextResponse.json(await replaceAvatar(ctx, file));
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE() {
  try {
    return NextResponse.json(await removeAvatar(await getProfileContext()));
  } catch (error) {
    return handleError(error);
  }
}
