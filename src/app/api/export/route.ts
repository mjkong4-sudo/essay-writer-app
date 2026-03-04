import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { content, title, format } = await request.json();

    if (!content?.trim()) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 },
      );
    }

    if (format === "docx") {
      const HTMLtoDOCX = (await import("html-to-docx")).default;

      const htmlContent = `
        <html>
          <body>
            <h1>${escapeHtml(title || "Essay")}</h1>
            ${content
              .split("\n")
              .map((p: string) => `<p>${escapeHtml(p)}</p>`)
              .join("")}
          </body>
        </html>
      `;

      const buffer = await HTMLtoDOCX(htmlContent, null, {
        title: title || "Essay",
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
      });

      const uint8 = new Uint8Array(buffer);
      return new NextResponse(uint8, {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename="${title || "essay"}.docx"`,
        },
      });
    }

    return NextResponse.json({ error: "Unsupported format" }, { status: 400 });
  } catch (error) {
    console.error("Export error:", error);
    const message =
      error instanceof Error ? error.message : "Export failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
