import { NextResponse } from "next/server";
import { eventStatement } from "@/lib/events";
import { resolveOwner, withOwnerCookie } from "@/lib/owner";

const allowed = new Set(["app_open", "demo_opened", "feedback_opened"]);

export async function POST(request: Request) {
  const { ownerId, cookie } = resolveOwner(request);
  const body = await request.json();
  const eventName = String(body.event || "");
  if (!allowed.has(eventName)) return withOwnerCookie(NextResponse.json({ error: "未知事件" }, { status: 400 }), cookie);
  await eventStatement(ownerId, eventName).run();
  return withOwnerCookie(NextResponse.json({ ok: true }), cookie);
}
