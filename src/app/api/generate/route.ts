import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import type { ChatCompletionContentPart } from "openai/resources/chat/completions";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const image = formData.get("image") as File | null;
    const text = formData.get("text") as string | null;
    const toneInput = (formData.get("tone") as string) || "formal academic style";
    const language = (formData.get("language") as string) || "English";

    if (!image && !text?.trim()) {
      return NextResponse.json(
        { error: "Please provide an image or text to generate an essay from" },
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

    const userContent: ChatCompletionContentPart[] = [];

    if (image) {
      const bytes = await image.arrayBuffer();
      const base64 = Buffer.from(bytes).toString("base64");
      const mimeType = image.type || "image/png";

      userContent.push({
        type: "image_url",
        image_url: { url: `data:${mimeType};base64,${base64}`, detail: "high" },
      });
    }

    let userPrompt = "Write an essay.";
    if (image && text?.trim()) {
      userPrompt = `Here is some additional context:\n\n${text.trim()}\n\nWrite an essay.`;
    } else if (text?.trim()) {
      userPrompt = `${text.trim()}\n\nWrite an essay.`;
    }

    userContent.push({ type: "text", text: userPrompt });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a talented essayist. You will receive an image and/or text as creative inspiration. Use the themes, emotions, and ideas they evoke to write an original essay in ${language} with a ${toneInput} tone.

Critical rules:
- Write as if YOU are the author sharing your own thoughts, reflections, and perspective. First person is welcome.
- NEVER reference "the image", "the text", "the source", "the photo", or "the provided content". Do not describe or analyze the input. Instead, absorb its meaning and write as if the ideas are your own.
- The essay must read like a genuine, standalone piece — as if published in a magazine or personal blog — not like a response to an assignment.

Structure:
- A compelling title
- A clear introduction
- 2-4 body paragraphs with depth and personal insight
- A strong conclusion

Format:
TITLE: [essay title]

[essay body]`,
        },
        {
          role: "user",
          content: userContent,
        },
      ],
      max_tokens: 2500,
      temperature: 0.7,
    });

    const essay = completion.choices[0].message.content;

    if (!essay) {
      throw new Error("No content generated");
    }

    return NextResponse.json({ essay });
  } catch (error: unknown) {
    console.error("Essay generation error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to generate essay";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
