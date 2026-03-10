import { cookies } from "next/headers";

const GUEST_SESSION_COOKIE = "essay_guest_session";
const GUEST_SESSION_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export function getGuestSessionIdFromCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`${GUEST_SESSION_COOKIE}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export async function getOrCreateGuestSessionId(): Promise<string> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(GUEST_SESSION_COOKIE)?.value;
  if (existing) return existing;
  const newId = `guest_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
  cookieStore.set(GUEST_SESSION_COOKIE, newId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: GUEST_SESSION_MAX_AGE,
    path: "/",
  });
  return newId;
}

export function getGuestSessionIdFromRequest(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie");
  return getGuestSessionIdFromCookie(cookieHeader);
}
