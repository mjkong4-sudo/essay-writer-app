"use client";

import { useCallback } from "react";
import { useSpeech } from "@/lib/useSpeech";

function getEssayBody(content: string): string {
  return content.replace(/^TITLE:.*\n?/m, "").trim();
}

interface Props {
  content: string;
  language?: string;
  className?: string;
}

export default function VoiceOutputButton({ content, language = "en", className }: Props) {
  const { play, stop, playing } = useSpeech();

  const toggle = useCallback(() => {
    if (playing) stop();
    else {
      const text = getEssayBody(content);
      if (text) play(text, language);
    }
  }, [playing, stop, play, content, language]);

  return (
    <button
      type="button"
      onClick={toggle}
      className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl p-1.5 text-muted hover:bg-surface hover:text-foreground sm:min-h-0 sm:min-w-0 ${className ?? ""}`}
      title={playing ? "Stop playback" : "Listen to essay"}
    >
      {playing ? (
        <>
          <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
          <span className="text-xs font-medium">Stop</span>
        </>
      ) : (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
          </svg>
          <span className="text-xs font-medium">Listen</span>
        </>
      )}
    </button>
  );
}
