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
    const favoritesOnly = searchParams.get("favorites") === "true";

    const where: Record<string, unknown> = { ...buildWhere(identity) };

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { content: { contains: search } },
      ];
    }

    if (favoritesOnly) {
      where.isFavorite = true;
    }

    const essays = await prisma.essay.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { sources: true },
    });

    return NextResponse.json(essays);
  } catch (error) {
    console.error("Fetch essays error:", error);
    return NextResponse.json(
      { error: "Failed to fetch essays" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const identity = await getWriteIdentity(request);
    const { title, content, tone, sourceText } = await request.json();

    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json(
        { error: "Title and content are required" },
        { status: 400 },
      );
    }

    const essay = await prisma.essay.create({
      data: {
        title,
        content,
        tone: tone || "formal academic style",
        userId: identity.userId ?? undefined,
        anonymousSessionId: identity.anonymousSessionId ?? undefined,
        sources: sourceText
          ? {
              create: [{ type: "ocr", content: sourceText }],
            }
          : undefined,
      },
      include: { sources: true },
    });

    return NextResponse.json(essay, { status: 201 });
  } catch (error) {
    console.error("Create essay error:", error);
    return NextResponse.json(
      { error: "Failed to save essay" },
      { status: 500 },
    );
  }
}
