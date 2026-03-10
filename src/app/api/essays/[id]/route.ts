import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthIdentity } from "@/lib/auth-identity";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const identity = await getAuthIdentity(request);
    const essay = await prisma.essay.findFirst({
      where: {
        id,
        ...(identity.userId
          ? { userId: identity.userId }
          : identity.anonymousSessionId
            ? { anonymousSessionId: identity.anonymousSessionId }
            : { userId: null, anonymousSessionId: null }),
      },
    });
    if (!essay) {
      return NextResponse.json({ error: "Essay not found" }, { status: 404 });
    }
    const body = await request.json();
    const updated = await prisma.essay.update({
      where: { id },
      data: body,
      include: { sources: true },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update essay error:", error);
    return NextResponse.json(
      { error: "Failed to update essay" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const identity = await getAuthIdentity(request);
    const essay = await prisma.essay.findFirst({
      where: {
        id,
        ...(identity.userId
          ? { userId: identity.userId }
          : identity.anonymousSessionId
            ? { anonymousSessionId: identity.anonymousSessionId }
            : { userId: null, anonymousSessionId: null }),
      },
    });
    if (!essay) {
      return NextResponse.json({ error: "Essay not found" }, { status: 404 });
    }
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
