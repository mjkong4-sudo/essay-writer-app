import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const PLATFORM_PROMPTS: Record<string, string> = {
  substack: `You are an expert Substack newsletter writer. Adapt the following essay into a compelling Substack post:
- Write a catchy headline that makes people want to open the email
- Add a short hook/preview line at the top
- Break content into short, scannable paragraphs
- Use a conversational, personal tone (first person)
- Add section headers where appropriate
- End with a call-to-action or thought-provoking question to encourage comments
- Keep it engaging for email readers — they should want to read to the end

Format:
HEADLINE: [headline]
PREVIEW: [one-line preview for email subject]

[post body]`,

  instagram: `You are an expert Instagram content creator. Adapt the following essay into an Instagram caption:
- Start with a strong hook line that stops the scroll (first line is crucial)
- Keep it personal, authentic, and emotionally resonant
- Use short paragraphs with line breaks between them
- Max 2200 characters (Instagram limit)
- End with a call-to-action (ask a question, invite comments, etc.)
- Add a line break then suggest 20-30 relevant hashtags on a separate line
- Do NOT use markdown formatting — plain text only

Format the output as:
CAPTION:
[caption text]

HASHTAGS:
[hashtags]`,

  threads: `You are an expert Threads (by Meta) content creator. Adapt the following essay into a Threads post or thread:
- Keep each post under 500 characters
- If the content needs multiple posts, number them (1/n, 2/n, etc.)
- Start with a bold, attention-grabbing opening
- Use casual, conversational tone
- Make it shareable and discussion-worthy
- End with a question or hot take to spark replies
- No hashtags (Threads doesn't emphasize them)
- Do NOT use markdown formatting — plain text only

Format:
[post content, with --- between each post if it's a thread]`,
};

export async function POST(request: NextRequest) {
  try {
    const { essay, platform } = await request.json();

    if (!essay?.trim()) {
      return NextResponse.json({ error: "Essay is required" }, { status: 400 });
    }

    if (!PLATFORM_PROMPTS[platform]) {
      return NextResponse.json(
        { error: "Invalid platform. Use: substack, instagram, or threads" },
        { status: 400 },
      );
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
        { role: "system", content: PLATFORM_PROMPTS[platform] },
        {
          role: "user",
          content: `Here is the essay to adapt:\n\n${essay}`,
        },
      ],
      max_tokens: 2000,
      temperature: 0.7,
    });

    const adapted = completion.choices[0].message.content;

    if (!adapted) {
      throw new Error("No content generated");
    }

    return NextResponse.json({ content: adapted });
  } catch (error: unknown) {
    console.error("Adapt error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to adapt essay";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
