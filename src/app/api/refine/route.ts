import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(request: NextRequest) {
  try {
    const { essay, feedback } = await request.json();

    if (!essay?.trim() || !feedback?.trim()) {
      return NextResponse.json(
        { error: "Essay and feedback are both required" },
        { status: 400 },
      );
    }

    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "your_openai_api_key_here") {
      return NextResponse.json(
        { error: "OpenAI API key is not configured. Add it to your .env file." },
        { status: 500 },
      );
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert essay editor. The user will provide an existing essay and feedback on how to improve it. Revise the essay according to their feedback while preserving the overall structure and voice unless they ask to change it.

Rules:
- Apply the requested changes thoughtfully
- Keep the same TITLE: format at the top (update the title only if the feedback warrants it)
- Maintain the essay's original language unless asked to change it
- Output ONLY the revised essay, no commentary or explanations about what you changed`,
        },
        {
          role: "user",
          content: `Here is my essay:\n\n${essay}\n\nHere is my feedback — please revise accordingly:\n\n${feedback}`,
        },
      ],
      max_tokens: 2500,
      temperature: 0.7,
    });

    const refined = completion.choices[0].message.content;

    if (!refined) {
      throw new Error("No content generated");
    }

    return NextResponse.json({ essay: refined });
  } catch (error: unknown) {
    console.error("Refine error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to refine essay";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
