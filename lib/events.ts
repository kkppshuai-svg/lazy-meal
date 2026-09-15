import { getD1 } from "@/db";

export function eventStatement(ownerId: string, eventName: string, metadata?: Record<string, unknown>) {
  return getD1().prepare(`INSERT INTO product_events (id, owner_id, event_name, metadata, created_at)
    VALUES (?, ?, ?, ?, ?)`)
    .bind(crypto.randomUUID(), ownerId, eventName, metadata ? JSON.stringify(metadata).slice(0, 1000) : null, Date.now());
}

export async function clientHash(request: Request) {
  const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const salt = process.env.RATE_LIMIT_SALT || "lazy-meal-public-fallback";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${salt}:${ip}`));
  return Array.from(new Uint8Array(digest)).slice(0, 16).map((value) => value.toString(16).padStart(2, "0")).join("");
}
