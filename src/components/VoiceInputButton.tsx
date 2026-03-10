"use client";

import { useState, useRef, useCallback } from "react";
import { useToast } from "@/components/Toast";

interface ResultItem {
  isFinal: boolean;
  0: { transcript: string };
}
interface ResultEvent {
  resultIndex: number;
  results: { length: number; [key: number]: ResultItem };
}
interface RecognitionLike {
  start(): void;
  stop(): void;
  onresult: ((e: ResultEvent) => void) | null;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((e: unknown) => void) | null;
  continuous: boolean;
  interimResults: boolean;
  lang: string;
}
const SpeechRecognition: (new () => RecognitionLike) | undefined =
  typeof window !== "undefined"
    ? (window as unknown as { SpeechRecognition?: new () => RecognitionLike }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => RecognitionLike }).webkitSpeechRecognition
    : undefined;

function isSecureContext(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window as unknown as { isSecureContext?: boolean }).isSecureContext;
}

interface Props {
  onText: (text: string) => void;
  disabled?: boolean;
  className?: string;
}

export default function VoiceInputButton({ onText, disabled, className }: Props) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<RecognitionLike | null>(null);
  const { toast } = useToast();

  const toggle = useCallback(() => {
    if (!SpeechRecognition) {
      toast("Dictation is not supported in this browser. Try Chrome or Edge.", "error");
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      setListening(false);
      return;
    }
    if (!isSecureContext()) {
      toast("Dictation requires HTTPS or localhost.", "error");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onstart = () => setListening(true);
    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };
    recognition.onerror = (event: unknown) => {
      setListening(false);
      recognitionRef.current = null;
      const err = (event as { error?: string })?.error ?? "unknown";
      const msg =
        err === "not-allowed"
          ? "Microphone access denied. Allow the site to use your microphone."
          : err === "no-speech"
            ? "No speech heard. Try again."
            : err === "network"
              ? "Network error. Check your connection and try again."
              : err === "audio-capture"
                ? "No microphone found."
                : `Dictation failed: ${err}`;
      toast(msg, "error");
    };
    recognition.onresult = (event: ResultEvent) => {
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        if (result.isFinal) final += transcript;
      }
      const trimmed = final?.trim();
      if (trimmed) onText(trimmed);
    };
    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (err) {
      recognitionRef.current = null;
      setListening(false);
      const message = err instanceof Error ? err.message : "Could not start dictation.";
      toast(message, "error");
    }
  }, [listening, onText, toast]);

  const isSupported = !!SpeechRecognition && (typeof window !== "undefined" && isSecureContext());

  return (
    <div className={className}>
      {listening ? (
        <button
          type="button"
          onClick={toggle}
          className="flex items-center gap-1.5 rounded-xl bg-danger/15 px-2.5 py-1.5 text-sm font-medium text-danger hover:bg-danger/25"
          title="Stop listening"
        >
          <span className="h-2 w-2 animate-pulse rounded-full bg-danger" />
          Listening… (click to stop)
        </button>
      ) : (
        <button
          type="button"
          onClick={toggle}
          disabled={disabled || !isSupported}
          className="flex items-center gap-1.5 rounded-xl border border-border bg-surface px-2.5 py-1.5 text-sm font-medium text-muted hover:border-primary/30 hover:text-foreground disabled:opacity-50"
          title={isSupported ? "Dictate (voice input)" : "Voice input not supported in this browser"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
          </svg>
          Dictate
        </button>
      )}
    </div>
  );
}
