"use client";

import { useCallback } from "react";
import { useSpeech } from "@/lib/useSpeech";

interface Props {
  text: string;
  lang?: string;
  title?: string;
  className?: string;
  size?: "sm" | "md";
}

export default function SpeakButton({ text, lang = "en-US", title = "Listen", className = "", size = "sm" }: Props) {
  const { play, stop, playing } = useSpeech();

  const toggle = useCallback(() => {
    if (playing) stop();
    else play(text, lang);
  }, [playing, stop, play, text, lang]);

  const iconClass = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  return (
    <button
      type="button"
      onClick={toggle}
      title={playing ? "Stop" : title}
      className={`inline-flex items-center justify-center rounded p-1 text-muted hover:bg-pink-100 dark:hover:bg-pink-900/40 hover:text-foreground ${className}`}
      aria-label={playing ? "Stop" : title}
    >
      {playing ? (
        <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={iconClass}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
        </svg>
      )}
    </button>
  );
}
