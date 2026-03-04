import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const SYSTEM_PROMPT = `You are a skilled editor who creates concise, compelling summaries. Given an essay, produce a summary that:

- Captures the core message and key insights in 3-5 sentences
- Preserves the author's voice and tone
- Highlights the most memorable or impactful points
- Is self-contained — a reader should understand the essence without reading the full essay
- Uses clear, elegant prose (no bullet points or lists)

Return ONLY the summary text, nothing else.`;

export async function POST(request: NextRequest) {
  try {
    const { essay } = await request.json();

    if (!essay?.trim()) {
      return NextResponse.json({ error: "Essay is required" }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "your_openai_api_key_here") {
      return NextResponse.json(
        { error: "OpenAI API key is not configured." },
        { status: 500 },
      );
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Here is the essay to summarize:\n\n${essay}` },
      ],
      max_tokens: 500,
      temperature: 0.5,
    });

    const summary = completion.choices[0].message.content;

    if (!summary) {
      throw new Error("No summary generated");
    }

    return NextResponse.json({ summary });
  } catch (error: unknown) {
    console.error("Summarize error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to summarize essay";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
