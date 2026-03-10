import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthIdentity, getWriteIdentity } from "@/lib/auth-identity";

function buildWhere(identity: { userId: string | null; anonymousSessionId: string | null }) {
  if (identity.userId) return { userId: identity.userId };
  if (identity.anonymousSessionId) return { anonymousSessionId: identity.anonymousSessionId };
  return { userId: null, anonymousSessionId: null };
}

export async function GET(request: NextRequest) {
  try {
    const identity = await getAuthIdentity(request);
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    const where: Record<string, unknown> = { ...buildWhere(identity) };

    if (search) {
      where.OR = [
        { text: { contains: search, mode: "insensitive" as const } },
        { essayTitle: { contains: search, mode: "insensitive" as const } },
      ];
    }

    const highlights = await prisma.highlight.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(highlights);
  } catch (error) {
    console.error("Highlights fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch highlights" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const identity = await getWriteIdentity(request);
    const { text, essayTitle, sourceId, essayContent } = await request.json();

    if (!text?.trim() || !essayTitle?.trim() || !sourceId?.trim()) {
      return NextResponse.json(
        { error: "text, essayTitle, and sourceId are required" },
        { status: 400 },
      );
    }

    const highlight = await prisma.highlight.create({
      data: {
        text: text.trim(),
        essayTitle: essayTitle.trim(),
        sourceId: sourceId.trim(),
        essayContent: typeof essayContent === "string" ? essayContent : undefined,
        userId: identity.userId ?? undefined,
        anonymousSessionId: identity.anonymousSessionId ?? undefined,
      },
    });

    return NextResponse.json(highlight, { status: 201 });
  } catch (error) {
    console.error("Highlights save error:", error);
    return NextResponse.json(
      { error: "Failed to save highlight" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const identity = await getAuthIdentity(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const highlight = await prisma.highlight.findFirst({
      where: {
        id,
        ...(identity.userId
          ? { userId: identity.userId }
          : identity.anonymousSessionId
            ? { anonymousSessionId: identity.anonymousSessionId }
            : { userId: null, anonymousSessionId: null }),
      },
    });
    if (!highlight) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.highlight.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Highlights delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete highlight" },
      { status: 500 },
    );
  }
}
