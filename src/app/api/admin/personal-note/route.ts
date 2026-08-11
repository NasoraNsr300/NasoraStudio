import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import { saveAdminPersonalNote } from "@/features/site-settings/data/admin-site-settings-repository.server";

const bodySchema = z.object({ note: z.string().trim().max(2_000) }).strict();

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }
  if (request.headers.get("content-type")?.split(";", 1)[0] !== "application/json") {
    return NextResponse.json({ error: "Expected application/json" }, { status: 415 });
  }

  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Invalid personal note" }, { status: 400 });

  try {
    const settings = await saveAdminPersonalNote(body.data.note);
    revalidatePath("/admin");
    return NextResponse.json({ note: settings.adminNote });
  } catch {
    return NextResponse.json({ error: "Unable to save personal note" }, { status: 500 });
  }
}
