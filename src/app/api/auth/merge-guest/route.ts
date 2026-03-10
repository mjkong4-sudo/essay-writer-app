import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

const GUEST_SESSION_COOKIE = "essay_guest_session";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const cookieStore = await cookies();
  const guestId = cookieStore.get(GUEST_SESSION_COOKIE)?.value;
  if (!guestId) {
    return NextResponse.json({ success: true, merged: 0 });
  }
  const [essays, history, highlights] = await Promise.all([
    prisma.essay.updateMany({
      where: { anonymousSessionId: guestId },
      data: { userId: session.user.id, anonymousSessionId: null },
    }),
    prisma.generationHistory.updateMany({
      where: { anonymousSessionId: guestId },
      data: { userId: session.user.id, anonymousSessionId: null },
    }),
    prisma.highlight.updateMany({
      where: { anonymousSessionId: guestId },
      data: { userId: session.user.id, anonymousSessionId: null },
    }),
  ]);
  const merged = essays.count + history.count + highlights.count;
  cookieStore.delete(GUEST_SESSION_COOKIE);
  return NextResponse.json({ success: true, merged });
}
