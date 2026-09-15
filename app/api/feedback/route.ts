import { NextResponse } from "next/server";
import { getD1 } from "@/db";
import { eventStatement } from "@/lib/events";
import { resolveOwner, withOwnerCookie } from "@/lib/owner";

export async function POST(request: Request) {
  const { ownerId, cookie } = resolveOwner(request);
  const body = await request.json();
  const content = String(body.content || "").trim().slice(0, 1000);
  const contact = String(body.contact || "").trim().slice(0, 120) || null;
  const kind = ["bug", "idea", "other"].includes(body.kind) ? body.kind : "idea";
  if (content.length < 5) return withOwnerCookie(NextResponse.json({ error: "再多说一点点，至少 5 个字" }, { status: 400 }), cookie);
  await getD1().batch([
    getD1().prepare(`INSERT INTO feedback (id, owner_id, kind, content, contact, status, created_at)
      VALUES (?, ?, ?, ?, ?, 'new', ?)`).bind(crypto.randomUUID(), ownerId, kind, content, contact, Date.now()),
    eventStatement(ownerId, "feedback_submitted", { kind }),
  ]);
  return withOwnerCookie(NextResponse.json({ ok: true }), cookie);
}
