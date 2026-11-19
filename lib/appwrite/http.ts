import "server-only";
import { NextResponse } from "next/server";
import { HttpError } from "./tasks";

export function handleError(error: unknown) {
  if (error instanceof HttpError)
    return NextResponse.json({ error: error.message }, { status: error.status });
  const status = (error as { code?: number })?.code;
  if (status === 401)
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const detail = error as { message?: string; type?: string };
  console.error("api error", status ?? "", detail?.type ?? "", detail?.message);
  // Appwrite 4xx errors (bad permissions, missing bucket, file too large…) are
  // safe and useful to show; anything else stays generic.
  if (typeof status === "number" && status >= 400 && status < 500 && detail?.message)
    return NextResponse.json({ error: detail.message }, { status });
  return NextResponse.json({ error: "Request failed." }, { status: 500 });
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    if (body && typeof body === "object" && !Array.isArray(body))
      return body as Record<string, unknown>;
  } catch {}
  throw new HttpError(400, "Invalid JSON body.");
}
