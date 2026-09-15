const COOKIE_NAME = "lm_device";

function readCookie(header: string | null, name: string) {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return null;
}

export function resolveOwner(request: Request) {
  const existing = readCookie(request.headers.get("cookie"), COOKIE_NAME);
  const deviceOwnerId = existing && /^[0-9a-f-]{36}$/i.test(existing) ? `device:${existing}` : null;
  const email = request.headers.get("oai-authenticated-user-email")?.trim().toLowerCase();
  if (email) return { ownerId: `user:${email}`, deviceOwnerId, cookie: null };

  if (deviceOwnerId) {
    return { ownerId: deviceOwnerId, deviceOwnerId, cookie: null };
  }

  const id = crypto.randomUUID();
  return {
    ownerId: `device:${id}`,
    deviceOwnerId: `device:${id}`,
    cookie: `${COOKIE_NAME}=${id}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=31536000`,
  };
}

export function withOwnerCookie(response: Response, cookie: string | null) {
  if (cookie) response.headers.set("Set-Cookie", cookie);
  return response;
}

export function clearOwnerCookie(response: Response) {
  response.headers.set("Set-Cookie", `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
  return response;
}
