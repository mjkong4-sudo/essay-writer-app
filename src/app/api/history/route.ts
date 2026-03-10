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

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const where: Record<string, unknown> = {
      ...buildWhere(identity),
      createdAt: { gte: sevenDaysAgo },
    };

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { content: { contains: search } },
      ];
    }

    const entries = await prisma.generationHistory.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(entries);
  } catch (error) {
    console.error("Fetch history error:", error);
    return NextResponse.json(
      { error: "Failed to fetch history" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const identity = await getWriteIdentity(request);
    const { title, content, tone, language, imageData } = await request.json();

    if (!content?.trim()) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 },
      );
    }

    const entry = await prisma.generationHistory.create({
      data: {
        title: title || "Untitled Essay",
        content,
        tone: tone || "formal academic style",
        language: language || "English",
        imageData: imageData || null,
        userId: identity.userId ?? undefined,
        anonymousSessionId: identity.anonymousSessionId ?? undefined,
      },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error("Create history entry error:", error);
    return NextResponse.json(
      { error: "Failed to save history" },
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

    const entry = await prisma.generationHistory.findFirst({
      where: {
        id,
        ...(identity.userId
          ? { userId: identity.userId }
          : identity.anonymousSessionId
            ? { anonymousSessionId: identity.anonymousSessionId }
            : { userId: null, anonymousSessionId: null }),
      },
    });
    if (!entry) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.generationHistory.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete history entry error:", error);
    return NextResponse.json(
      { error: "Failed to delete history entry" },
      { status: 500 },
    );
  }
}
