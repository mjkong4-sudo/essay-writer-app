import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * Assigns all legacy data (essays, history, highlights with no user or guest session)
 * to the currently logged-in user. Does not delete anything.
 * Optional: set LEGACY_MIGRATION_EMAIL in .env to restrict to that account only.
 */
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }

    const allowedEmail = process.env.LEGACY_MIGRATION_EMAIL?.trim().toLowerCase();
    if (allowedEmail && session.user.email?.toLowerCase() !== allowedEmail) {
      return NextResponse.json(
        { error: "Only the configured admin/test account can run this" },
        { status: 403 },
      );
    }

    const legacyWhere = {
      userId: null,
      anonymousSessionId: null,
    };

    const [essays, history, highlights] = await Promise.all([
      prisma.essay.updateMany({
        where: legacyWhere,
        data: { userId: session.user.id, anonymousSessionId: null },
      }),
      prisma.generationHistory.updateMany({
        where: legacyWhere,
        data: { userId: session.user.id, anonymousSessionId: null },
      }),
      prisma.highlight.updateMany({
        where: legacyWhere,
        data: { userId: session.user.id, anonymousSessionId: null },
      }),
    ]);

    const total = essays.count + history.count + highlights.count;
    return NextResponse.json({
      success: true,
      migrated: {
        essays: essays.count,
        generationHistory: history.count,
        highlights: highlights.count,
      },
      total,
      message: total > 0 ? `Assigned ${total} legacy item(s) to your account.` : "No legacy data to assign.",
    });
  } catch (error) {
    console.error("Migrate legacy error:", error);
    return NextResponse.json(
      { error: "Migration failed" },
      { status: 500 },
    );
  }
}
