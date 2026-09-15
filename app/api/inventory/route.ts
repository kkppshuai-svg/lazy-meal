import { NextResponse } from "next/server";
import { getD1 } from "@/db";
import { categoryFor, deriveExpiry, quantityParts } from "@/lib/inventory";
import { resolveOwner, withOwnerCookie } from "@/lib/owner";
import { eventStatement } from "@/lib/events";

function json(data: unknown, cookie: string | null, init?: ResponseInit) {
  return withOwnerCookie(NextResponse.json(data, init), cookie);
}

export async function GET(request: Request) {
  const { ownerId, cookie } = resolveOwner(request);
  const db = getD1();
  const [itemsResult, statsResult] = await Promise.all([
    db.prepare(`SELECT id, name, emoji, category, quantity, unit, min_quantity AS minQuantity,
      estimated_expires_at AS estimatedExpiresAt, condition, confidence, source, updated_at AS updatedAt
      FROM inventory_items WHERE owner_id = ? AND status = 'active'
      ORDER BY CASE WHEN estimated_expires_at IS NULL THEN 1 ELSE 0 END, estimated_expires_at ASC, updated_at DESC`).bind(ownerId).all(),
    db.prepare(`SELECT total_saved AS totalSaved, items_rescued AS itemsRescued, meals_cooked AS mealsCooked
      FROM user_stats WHERE owner_id = ? LIMIT 1`).bind(ownerId).first(),
  ]);

  const items = (itemsResult.results as Array<Record<string, unknown>>).map((row) => ({
    ...row,
    ...deriveExpiry((row.estimatedExpiresAt as number | null) ?? null),
  }));
  const urgentCount = items.filter((item: Record<string, unknown>) => item.status === "soon" || item.status === "expired").length;
  return json({
    items,
    urgentCount,
    stats: statsResult ?? { totalSaved: 0, itemsRescued: 0, mealsCooked: 0 },
    safetyNote: "到期时间由包装日期、录入时间和视觉状态综合估计；异味、发黏、霉变时请直接丢弃。",
  }, cookie);
}

export async function POST(request: Request) {
  const { ownerId, cookie } = resolveOwner(request);
  const body = await request.json();
  const incoming = Array.isArray(body.items) ? body.items : [body];
  if (!incoming.length || incoming.length > 30) return json({ error: "食材数量不正确" }, cookie, { status: 400 });

  const now = Date.now();
  const statements = incoming.map((item: Record<string, unknown>) => {
    const name = String(item.name || "").trim().slice(0, 40);
    if (!name) throw new Error("食材名称不能为空");
    const parsed = quantityParts(String(item.amount || "1 份"));
    const estimatedDays = Number(item.estimatedDays ?? item.estimated_days ?? 4);
    const expiresAt = Number.isFinite(estimatedDays) ? now + Math.max(0, Math.min(90, estimatedDays)) * 86_400_000 : null;
    return getD1().prepare(`INSERT INTO inventory_items
      (id, owner_id, name, emoji, category, quantity, unit, min_quantity, estimated_expires_at, condition, confidence, source, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
      ON CONFLICT(owner_id, name, status) DO UPDATE SET
        emoji = excluded.emoji, category = excluded.category, quantity = excluded.quantity,
        unit = excluded.unit, estimated_expires_at = excluded.estimated_expires_at,
        condition = excluded.condition, confidence = excluded.confidence,
        source = excluded.source, updated_at = excluded.updated_at`)
      .bind(
        crypto.randomUUID(), ownerId, name, String(item.emoji || "🥬"),
        String(item.category || categoryFor(name)), Number(item.quantity ?? parsed.quantity),
        String(item.unit || parsed.unit), Number(item.minQuantity ?? 0), expiresAt,
        String(item.condition || "看起来正常").slice(0, 80),
        Math.max(0, Math.min(1, Number(item.confidence ?? 0.6))),
        String(item.source || body.source || "manual"), now, now,
      );
  });
  const source = String(body.source || incoming[0]?.source || "manual");
  await getD1().batch([...statements, eventStatement(ownerId, source === "scan" ? "inventory_saved" : "inventory_added", { count: statements.length, source })]);
  return json({ ok: true, saved: statements.length }, cookie);
}

export async function PATCH(request: Request) {
  const { ownerId, cookie } = resolveOwner(request);
  const body = await request.json();
  const id = String(body.id || "");
  if (!id) return json({ error: "缺少食材 ID" }, cookie, { status: 400 });
  const now = Date.now();

  if (body.action === "consume" || body.action === "discard") {
    await getD1().prepare(`UPDATE inventory_items SET status = ?, updated_at = ? WHERE id = ? AND owner_id = ?`)
      .bind(body.action === "consume" ? "consumed" : "discarded", now, id, ownerId).run();
    return json({ ok: true }, cookie);
  }

  const quantity = Number(body.quantity);
  const expiresAt = body.daysFromNow == null ? null : now + Math.max(0, Number(body.daysFromNow)) * 86_400_000;
  await getD1().prepare(`UPDATE inventory_items SET
    quantity = COALESCE(?, quantity), estimated_expires_at = COALESCE(?, estimated_expires_at),
    min_quantity = COALESCE(?, min_quantity), updated_at = ?
    WHERE id = ? AND owner_id = ?`)
    .bind(Number.isFinite(quantity) ? quantity : null, expiresAt, body.minQuantity ?? null, now, id, ownerId).run();
  return json({ ok: true }, cookie);
}
