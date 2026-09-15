import { NextResponse } from "next/server";
import { getD1 } from "@/db";
import { clearOwnerCookie, resolveOwner } from "@/lib/owner";

function signedInOwner(request: Request) {
  const email = request.headers.get("oai-authenticated-user-email")?.trim().toLowerCase();
  if (!email) return null;
  return { email, ownerId: `user:${email}`, displayName: request.headers.get("oai-authenticated-user-full-name") || email };
}

export async function POST(request: Request) {
  const user = signedInOwner(request);
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const { deviceOwnerId } = resolveOwner(request);
  const now = Date.now();
  const statements = [getD1().prepare(`INSERT INTO user_profiles (owner_id, email, display_name, created_at, last_seen_at)
    VALUES (?, ?, ?, ?, ?) ON CONFLICT(owner_id) DO UPDATE SET display_name = excluded.display_name, last_seen_at = excluded.last_seen_at`)
    .bind(user.ownerId, user.email, user.displayName, now, now)];

  if (deviceOwnerId && deviceOwnerId !== user.ownerId) {
    const [inventory, shopping, stats] = await Promise.all([
      getD1().prepare("SELECT * FROM inventory_items WHERE owner_id = ?").bind(deviceOwnerId).all(),
      getD1().prepare("SELECT * FROM shopping_items WHERE owner_id = ?").bind(deviceOwnerId).all(),
      getD1().prepare("SELECT * FROM user_stats WHERE owner_id = ?").bind(deviceOwnerId).first(),
    ]);
    for (const row of inventory.results) statements.push(getD1().prepare(`INSERT INTO inventory_items
      (id, owner_id, name, emoji, category, quantity, unit, min_quantity, estimated_expires_at, condition, confidence, source, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(owner_id, name, status) DO UPDATE SET quantity = inventory_items.quantity + excluded.quantity,
        estimated_expires_at = CASE WHEN inventory_items.estimated_expires_at IS NULL THEN excluded.estimated_expires_at
          WHEN excluded.estimated_expires_at IS NULL THEN inventory_items.estimated_expires_at
          ELSE MIN(inventory_items.estimated_expires_at, excluded.estimated_expires_at) END,
        condition = excluded.condition, confidence = MAX(inventory_items.confidence, excluded.confidence), updated_at = excluded.updated_at`)
      .bind(crypto.randomUUID(), user.ownerId, row.name, row.emoji, row.category, row.quantity, row.unit, row.min_quantity,
        row.estimated_expires_at, row.condition, row.confidence, row.source, row.status, row.created_at, now));
    for (const row of shopping.results) statements.push(getD1().prepare(`INSERT INTO shopping_items
      (id, owner_id, name, amount, unit, reason, checked, auto_generated, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(owner_id, name) DO UPDATE SET amount = MAX(shopping_items.amount, excluded.amount),
        checked = MIN(shopping_items.checked, excluded.checked), reason = excluded.reason, updated_at = excluded.updated_at`)
      .bind(crypto.randomUUID(), user.ownerId, row.name, row.amount, row.unit, row.reason, row.checked, row.auto_generated, row.created_at, now));
    if (stats) statements.push(getD1().prepare(`INSERT INTO user_stats (owner_id, total_saved, items_rescued, meals_cooked, updated_at)
      VALUES (?, ?, ?, ?, ?) ON CONFLICT(owner_id) DO UPDATE SET
        total_saved = user_stats.total_saved + excluded.total_saved,
        items_rescued = user_stats.items_rescued + excluded.items_rescued,
        meals_cooked = user_stats.meals_cooked + excluded.meals_cooked, updated_at = excluded.updated_at`)
      .bind(user.ownerId, stats.total_saved, stats.items_rescued, stats.meals_cooked, now));
    statements.push(
      getD1().prepare("UPDATE scan_events SET owner_id = ? WHERE owner_id = ?").bind(user.ownerId, deviceOwnerId),
      getD1().prepare("UPDATE product_events SET owner_id = ? WHERE owner_id = ?").bind(user.ownerId, deviceOwnerId),
      getD1().prepare("UPDATE feedback SET owner_id = ? WHERE owner_id = ?").bind(user.ownerId, deviceOwnerId),
      getD1().prepare("DELETE FROM inventory_items WHERE owner_id = ?").bind(deviceOwnerId),
      getD1().prepare("DELETE FROM shopping_items WHERE owner_id = ?").bind(deviceOwnerId),
      getD1().prepare("DELETE FROM user_stats WHERE owner_id = ?").bind(deviceOwnerId),
    );
  }
  await getD1().batch(statements);
  return clearOwnerCookie(NextResponse.json({ ok: true, adopted: Boolean(deviceOwnerId) }));
}

export async function GET(request: Request) {
  const user = signedInOwner(request);
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const [inventory, shopping, stats, scans, events, messages] = await Promise.all([
    getD1().prepare("SELECT * FROM inventory_items WHERE owner_id = ? ORDER BY updated_at DESC").bind(user.ownerId).all(),
    getD1().prepare("SELECT * FROM shopping_items WHERE owner_id = ? ORDER BY created_at DESC").bind(user.ownerId).all(),
    getD1().prepare("SELECT * FROM user_stats WHERE owner_id = ?").bind(user.ownerId).first(),
    getD1().prepare("SELECT id, status, model, item_count, latency_ms, error_code, created_at FROM scan_events WHERE owner_id = ? ORDER BY created_at DESC LIMIT 200").bind(user.ownerId).all(),
    getD1().prepare("SELECT event_name, metadata, created_at FROM product_events WHERE owner_id = ? ORDER BY created_at DESC LIMIT 500").bind(user.ownerId).all(),
    getD1().prepare("SELECT kind, content, contact, status, created_at FROM feedback WHERE owner_id = ? ORDER BY created_at DESC").bind(user.ownerId).all(),
  ]);
  const response = NextResponse.json({ exportedAt: new Date().toISOString(), account: { email: user.email }, inventory: inventory.results, shopping: shopping.results, stats, scans: scans.results, events: events.results, feedback: messages.results });
  response.headers.set("Content-Disposition", `attachment; filename="lazy-meal-data-${new Date().toISOString().slice(0, 10)}.json"`);
  return response;
}

export async function DELETE(request: Request) {
  const user = signedInOwner(request);
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  await getD1().batch([
    getD1().prepare("DELETE FROM inventory_items WHERE owner_id = ?").bind(user.ownerId),
    getD1().prepare("DELETE FROM shopping_items WHERE owner_id = ?").bind(user.ownerId),
    getD1().prepare("DELETE FROM user_stats WHERE owner_id = ?").bind(user.ownerId),
    getD1().prepare("DELETE FROM scan_events WHERE owner_id = ?").bind(user.ownerId),
    getD1().prepare("DELETE FROM product_events WHERE owner_id = ?").bind(user.ownerId),
    getD1().prepare("DELETE FROM feedback WHERE owner_id = ?").bind(user.ownerId),
    getD1().prepare("DELETE FROM user_profiles WHERE owner_id = ?").bind(user.ownerId),
  ]);
  return clearOwnerCookie(NextResponse.json({ ok: true }));
}
