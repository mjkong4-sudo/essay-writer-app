import { auth } from "@/auth";
import { getOrCreateGuestSessionId, getGuestSessionIdFromRequest } from "@/lib/guest-session";

export type AuthIdentity = {
  userId: string | null;
  anonymousSessionId: string | null;
};

/**
 * Use in API routes (server): get current user id or guest session id.
 * Call getOrCreateGuestSessionId() only when you are about to write data (so we don't set a cookie on read-only requests).
 */
export async function getAuthIdentity(request?: Request): Promise<AuthIdentity> {
  const session = await auth();
  if (session?.user?.id) {
    return { userId: session.user.id, anonymousSessionId: null };
  }
  const guestId = request ? getGuestSessionIdFromRequest(request) : null;
  return { userId: null, anonymousSessionId: guestId };
}

/**
 * Use when creating data: ensures we have either userId or a new guest session id.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- signature kept for API consistency
export async function getWriteIdentity(_request: Request): Promise<AuthIdentity> {
  const session = await auth();
  if (session?.user?.id) {
    return { userId: session.user.id, anonymousSessionId: null };
  }
  const anonymousSessionId = await getOrCreateGuestSessionId();
  return { userId: null, anonymousSessionId };
}
