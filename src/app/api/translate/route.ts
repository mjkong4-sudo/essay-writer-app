import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

function containsKorean(text: string): boolean {
  return /[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(text);
}

export async function POST(request: NextRequest) {
  try {
    const { text, mode } = await request.json();

    if (!text?.trim()) {
      return NextResponse.json(
        { error: "Text is required" },
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

    const hasKorean = containsKorean(text);
    const sourceLang = hasKorean ? "Korean" : "English";
    const targetLang = hasKorean ? "English" : "Korean";

    let systemPrompt: string;

    if (mode === "word") {
      systemPrompt = `You are a bilingual dictionary. Translate the given word or short phrase from ${sourceLang} to ${targetLang}. Provide:
1. The translation
2. A brief definition
3. An example sentence in ${targetLang}

Format:
Translation: [word]
Definition: [brief meaning]
Example: [sentence]`;
    } else {
      systemPrompt = `You are a professional translator fluent in both Korean and English. Translate the following text from ${sourceLang} to ${targetLang}. Preserve the tone, style, and formatting of the original. Only output the translation, nothing else.`;
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text },
      ],
      max_tokens: mode === "word" ? 200 : 2000,
      temperature: 0.3,
    });

    const translation = completion.choices[0].message.content;

    if (!translation) {
      throw new Error("No translation generated");
    }

    return NextResponse.json({
      translation,
      sourceLang,
      targetLang,
    });
  } catch (error: unknown) {
    console.error("Translation error:", error);
    const message =
      error instanceof Error ? error.message : "Translation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
