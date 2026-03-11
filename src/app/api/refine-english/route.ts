import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import type { ChatCompletionContentPart } from "openai/resources/chat/completions";

const CORS_ORIGINS = (process.env.ESSAY_CORS_ORIGIN || "http://localhost:8000")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

function getAllowedOrigin(request: NextRequest): string | null {
  const origin = request.headers.get("origin");
  if (!origin) return null;
  return CORS_ORIGINS.includes(origin) ? origin : null;
}

function withCors(request: NextRequest, res: NextResponse): NextResponse {
  const allow = getAllowedOrigin(request);
  if (allow) res.headers.set("Access-Control-Allow-Origin", allow);
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Accept");
  return res;
}

export async function OPTIONS(request: NextRequest) {
  return withCors(request, new NextResponse(null, { status: 200 }));
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const images = formData.getAll("image") as File[];
    const text = formData.get("text") as string | null;
    const language = (formData.get("language") as string) || "English";

    const hasImages = images.length > 0 && images.every((f) => f && f.size > 0);
    if (!hasImages && !text?.trim()) {
      return withCors(
        request,
        NextResponse.json(
          { error: "Please provide an image or text to refine in English" },
          { status: 400 },
        ),
      );
    }

    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "your_openai_api_key_here") {
      return withCors(
        request,
        NextResponse.json(
          { error: "OpenAI API key is not configured. Add it to your .env file." },
          { status: 500 },
        ),
      );
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const userContent: ChatCompletionContentPart[] = [];

    for (const image of images) {
      if (!image?.size) continue;
      const bytes = await image.arrayBuffer();
      const base64 = Buffer.from(bytes).toString("base64");
      const mimeType = image.type || "image/png";
      userContent.push({
        type: "image_url",
        image_url: { url: `data:${mimeType};base64,${base64}`, detail: "high" },
      });
    }

    let userPrompt = "Refine the above into clear, natural English.";
    if (userContent.length > 0 && text?.trim()) {
      userPrompt = `Additional context or text from the user:\n\n${text.trim()}\n\nRefine everything (image(s) and text) into one clear, natural ${language} version.`;
    } else if (text?.trim()) {
      userPrompt = `Refine the following into clear, natural ${language}. Preserve meaning; fix grammar, clarity, and flow.\n\n${text.trim()}`;
    } else {
      userPrompt = `Describe or extract the content of the image(s) above and present it in clear, natural ${language}.`;
    }
    userContent.push({ type: "text", text: userPrompt });

    const systemContent = `You are a clear, natural writing assistant. The user will provide image(s) and/or text (rough notes, another language, or unclear phrasing). Your job is to output a single, refined version in clear, natural ${language}.

Rules:
- Preserve the user's intent and all key information.
- Fix grammar, spelling, and clarity; improve flow and word choice.
- If the input is in another language or mixed, translate or normalize into ${language}.
- If the input is already structured (e.g. an essay with TITLE:), you may keep that structure only if it fits; otherwise output one coherent block of refined text.
- Output ONLY the refined text. No labels, explanations, or commentary.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemContent },
        { role: "user", content: userContent },
      ],
      max_tokens: 2500,
      temperature: 0.5,
    });

    const essay = completion.choices[0].message.content?.trim();
    if (!essay) throw new Error("No content generated");
    return withCors(request, NextResponse.json({ essay }));
  } catch (error: unknown) {
    console.error("Refine English error:", error);
    const raw = error instanceof Error ? error.message : "Failed to refine in English";
    const userMessage =
      raw.length > 120 ? "Refine failed. Please try again." : raw;
    return withCors(request, NextResponse.json({ error: userMessage }, { status: 500 }));
  }
}
