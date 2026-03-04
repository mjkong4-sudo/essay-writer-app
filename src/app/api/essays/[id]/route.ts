import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const essay = await prisma.essay.update({
      where: { id },
      data: body,
      include: { sources: true },
    });

    return NextResponse.json(essay);
  } catch (error) {
    console.error("Update essay error:", error);
    return NextResponse.json(
      { error: "Failed to update essay" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    await prisma.essay.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete essay error:", error);
    return NextResponse.json(
      { error: "Failed to delete essay" },
      { status: 500 },
    );
  }
}
