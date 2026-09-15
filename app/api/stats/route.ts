import { NextResponse } from "next/server";
import { getD1 } from "@/db";
import { resolveOwner, withOwnerCookie } from "@/lib/owner";
import { eventStatement } from "@/lib/events";

export async function POST(request: Request) {
  const { ownerId, cookie } = resolveOwner(request);
  const body = await request.json();
  const saved = Math.max(0, Math.min(500, Number(body.saved || 0)));
  const rescued = Math.max(0, Math.min(30, Number(body.rescued || 0)));
  const now = Date.now();
  await getD1().batch([getD1().prepare(`INSERT INTO user_stats (owner_id, total_saved, items_rescued, meals_cooked, updated_at)
    VALUES (?, ?, ?, 1, ?)
    ON CONFLICT(owner_id) DO UPDATE SET
      total_saved = total_saved + excluded.total_saved,
      items_rescued = items_rescued + excluded.items_rescued,
      meals_cooked = meals_cooked + 1, updated_at = excluded.updated_at`)
    .bind(ownerId, saved, rescued, now), eventStatement(ownerId, "meal_completed", { saved, rescued })]);
  const response = NextResponse.json({ ok: true });
  return withOwnerCookie(response, cookie);
}
