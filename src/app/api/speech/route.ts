import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const TTS_MAX_CHARS = 4096;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const text = typeof body?.text === "string" ? body.text.trim() : "";
    const voice = typeof body?.voice === "string" && body.voice ? body.voice : "alloy";

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    if (text.length > TTS_MAX_CHARS) {
      return NextResponse.json(
        { error: `Text must be ${TTS_MAX_CHARS} characters or less` },
        { status: 400 },
      );
    }

    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "your_openai_api_key_here") {
      return NextResponse.json(
        { error: "TTS not configured" },
        { status: 501 },
      );
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await openai.audio.speech.create({
      model: "tts-1-hd",
      voice: ["alloy", "echo", "fable", "onyx", "nova", "shimmer"].includes(voice) ? voice : "alloy",
      input: text,
    });

    const buffer = Buffer.from(await response.arrayBuffer());
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    console.error("TTS error:", err);
    return NextResponse.json(
      { error: "Speech generation failed" },
      { status: 500 },
    );
  }
}
