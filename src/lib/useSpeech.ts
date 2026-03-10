"use client";

import { useState, useCallback, useRef, useEffect } from "react";

const TTS_MAX_CHARS = 4096;

function chunkText(text: string, maxLen: number): string[] {
  const chunks: string[] = [];
  let rest = text.trim();
  while (rest.length > 0) {
    if (rest.length <= maxLen) {
      chunks.push(rest);
      break;
    }
    const slice = rest.slice(0, maxLen);
    const lastSpace = slice.lastIndexOf(" ");
    const cut = lastSpace > maxLen >> 1 ? lastSpace : maxLen;
    chunks.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  return chunks.filter(Boolean);
}

function getPreferredVoice(lang: string): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  let voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;
  const target = lang.startsWith("ko") ? "ko-KR" : "en-US";
  const match = voices.find((v) => v.lang === target || v.lang.startsWith(target.split("-")[0]));
  return match ?? voices.find((v) => v.lang.startsWith("en")) ?? voices[0] ?? null;
}

function speakWithBrowser(text: string, lang: string, onEnd: () => void): () => void {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    onEnd();
    return () => {};
  }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang.startsWith("ko") ? "ko-KR" : "en-US";
  u.rate = 0.92;
  u.pitch = 1;
  const voice = getPreferredVoice(lang);
  if (voice) u.voice = voice;
  u.onend = () => onEnd();
  u.onerror = () => onEnd();
  window.speechSynthesis.speak(u);
  return () => window.speechSynthesis.cancel();
}

export function useSpeech() {
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const browserCancelRef = useRef<(() => void) | null>(null);

  const stop = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    browserCancelRef.current?.();
    browserCancelRef.current = null;
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    setPlaying(false);
    setLoading(false);
  }, []);

  const play = useCallback(async (text: string, lang: string = "en-US") => {
    const trimmed = text.trim();
    if (!trimmed) return;

    stop();

    const tryApi = async (chunk: string, signal?: AbortSignal): Promise<Response> => {
      const res = await fetch("/api/speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: chunk }),
        signal,
      });
      return res;
    };

    const playBlob = (blob: Blob): Promise<void> =>
      new Promise((resolve, reject) => {
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => {
          audioRef.current = null;
          URL.revokeObjectURL(url);
          resolve();
        };
        audio.onerror = () => {
          audioRef.current = null;
          URL.revokeObjectURL(url);
          reject(new Error("Playback failed"));
        };
        audio.play().catch(reject);
      });

    setPlaying(true);
    setLoading(true);
    const controller = new AbortController();
    abortRef.current = controller;

    const playOrFallback = (chunk: string) => {
      setLoading(false);
      browserCancelRef.current = speakWithBrowser(chunk, lang, () => {
        browserCancelRef.current = null;
        setPlaying(false);
      });
    };

    if (trimmed.length <= TTS_MAX_CHARS) {
      try {
        const res = await tryApi(trimmed, controller.signal);
        if (res.ok) {
          const blob = await res.blob();
          setLoading(false);
          try {
            await playBlob(blob);
          } catch {
            playOrFallback(trimmed);
            return;
          }
        } else {
          playOrFallback(trimmed);
          return;
        }
      } catch (e) {
        if ((e as Error).name === "AbortError") {
          abortRef.current = null;
          setPlaying(false);
          setLoading(false);
          return;
        }
        playOrFallback(trimmed);
        return;
      }
      abortRef.current = null;
      setPlaying(false);
      return;
    }

    const chunks = chunkText(trimmed, 4000);
    try {
      for (const chunk of chunks) {
        if (controller.signal.aborted) break;
        const res = await tryApi(chunk, controller.signal);
        if (!res.ok) {
          playOrFallback(trimmed);
          abortRef.current = null;
          setPlaying(false);
          return;
        }
        const blob = await res.blob();
        setLoading(false);
        try {
          await playBlob(blob);
        } catch {
          playOrFallback(trimmed);
          return;
        }
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") playOrFallback(trimmed);
    }
    abortRef.current = null;
    setPlaying(false);
    setLoading(false);
  }, [stop]);

  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
      audioRef.current?.pause();
      browserCancelRef.current?.();
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    };
  }, []);

  return { play, stop, playing, loading };
}
