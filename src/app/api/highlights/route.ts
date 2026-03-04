import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    const where = search
      ? {
          OR: [
            { text: { contains: search, mode: "insensitive" as const } },
            { essayTitle: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

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
    const { text, essayTitle, sourceId } = await request.json();

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
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
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
