import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    const where = search
      ? {
          OR: [
            { word: { contains: search } },
            { translation: { contains: search } },
          ],
        }
      : {};

    const entries = await prisma.dictionaryEntry.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(entries);
  } catch (error) {
    console.error("Dictionary fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dictionary" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { word, translation, definition, example, sourceLang, targetLang } =
      await request.json();

    if (!word?.trim() || !translation?.trim()) {
      return NextResponse.json(
        { error: "Word and translation are required" },
        { status: 400 },
      );
    }

    const entry = await prisma.dictionaryEntry.upsert({
      where: {
        word_sourceLang: { word: word.trim(), sourceLang },
      },
      update: {
        translation,
        definition: definition || "",
        example: example || "",
        targetLang,
      },
      create: {
        word: word.trim(),
        translation,
        definition: definition || "",
        example: example || "",
        sourceLang,
        targetLang,
      },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error("Dictionary save error:", error);
    return NextResponse.json(
      { error: "Failed to save word" },
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

    await prisma.dictionaryEntry.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Dictionary delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete entry" },
      { status: 500 },
    );
  }
}
