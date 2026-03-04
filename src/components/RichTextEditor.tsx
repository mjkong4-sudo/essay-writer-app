"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { wordCount, charCount } from "@/lib/utils";
import { useToast } from "./Toast";

interface Props {
  content: string;
  onSave?: (title: string, content: string) => Promise<void>;
  onRefine?: (feedback: string) => Promise<void>;
  isRefining?: boolean;
  versionLabel?: string;
}

function getWordAtPoint(x: number, y: number): string | null {
  let range: Range | null = null;

  if (document.caretRangeFromPoint) {
    range = document.caretRangeFromPoint(x, y);
  } else if ((document as unknown as { caretPositionFromPoint: (x: number, y: number) => { offsetNode: Node; offset: number } | null }).caretPositionFromPoint) {
    const pos = (document as unknown as { caretPositionFromPoint: (x: number, y: number) => { offsetNode: Node; offset: number } | null }).caretPositionFromPoint(x, y);
    if (pos) {
      range = document.createRange();
      range.setStart(pos.offsetNode, pos.offset);
      range.setEnd(pos.offsetNode, pos.offset);
    }
  }

  if (!range || !range.startContainer.textContent) return null;

  const text = range.startContainer.textContent;
  const offset = range.startOffset;
  let start = offset;
  let end = offset;

  while (start > 0 && /\S/.test(text[start - 1])) start--;
  while (end < text.length && /\S/.test(text[end])) end++;

  const word = text.slice(start, end).replace(/[.,;:!?"'()[\]{}]/g, "").trim();
  return word.length > 0 && word.split(/\s+/).length <= 3 ? word : null;
}

export default function RichTextEditor({
  content,
  onSave,
  onRefine,
  isRefining,
  versionLabel,
}: Props) {
  const [translation, setTranslation] = useState("");
  const [wordTranslation, setWordTranslation] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedWord, setSelectedWord] = useState("");
  const [feedback, setFeedback] = useState("");
  const isTouchRef = useRef(false);
  const { toast } = useToast();

  useEffect(() => {
    const markTouch = () => { isTouchRef.current = true; };
    const markMouse = () => { isTouchRef.current = false; };
    window.addEventListener("touchstart", markTouch, { passive: true });
    window.addEventListener("mousemove", markMouse, { passive: true });
    return () => {
      window.removeEventListener("touchstart", markTouch);
      window.removeEventListener("mousemove", markMouse);
    };
  }, []);

  const saveToDictionary = useCallback(
    async (word: string, translationText: string, sourceLang: string, targetLang: string) => {
      try {
        const lines = translationText.split("\n");
        let mainTranslation = translationText;
        let definition = "";
        let example = "";
        for (const line of lines) {
          if (line.startsWith("Translation:")) mainTranslation = line.replace("Translation:", "").trim();
          else if (line.startsWith("Definition:")) definition = line.replace("Definition:", "").trim();
          else if (line.startsWith("Example:")) example = line.replace("Example:", "").trim();
        }
        await fetch("/api/dictionary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ word, translation: mainTranslation, definition, example, sourceLang, targetLang }),
        });
      } catch { /* silent */ }
    },
    [],
  );

  const translateText = useCallback(
    async (text: string, mode: "full" | "word" = "full") => {
      if (!text.trim()) return;
      if (mode === "word") setSelectedWord(text);
      setIsTranslating(true);
      try {
        const response = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, mode }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        if (mode === "word") {
          setWordTranslation(data.translation);
          saveToDictionary(text, data.translation, data.sourceLang, data.targetLang);
          toast(`"${text}" saved to your dictionary`, "success");
        } else {
          setTranslation(data.translation);
          toast("Translation complete!", "success");
        }
      } catch (error) {
        toast(error instanceof Error ? error.message : "Translation failed", "error");
      } finally {
        setIsTranslating(false);
      }
    },
    [toast, saveToDictionary],
  );

  const handleWordSelect = useCallback(
    (word: string) => {
      if (word && word.length > 0) {
        translateText(word, "word");
      }
    },
    [translateText],
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isTouchRef.current) return;
      const word = getWordAtPoint(e.clientX, e.clientY);
      if (word) handleWordSelect(word);
    },
    [handleWordSelect],
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isTouchRef.current) return;
      const selection = window.getSelection()?.toString().trim();
      if (selection && selection.split(/\s+/).length <= 3) {
        handleWordSelect(selection);
      } else {
        const word = getWordAtPoint(e.clientX, e.clientY);
        if (word) handleWordSelect(word);
      }
    },
    [handleWordSelect],
  );

  const handleSave = async () => {
    if (!onSave || !content.trim()) return;
    setIsSaving(true);
    try {
      const titleMatch = content.match(/^TITLE:\s*(.+)/m);
      const title = titleMatch ? titleMatch[1].trim() : "Untitled Essay";
      await onSave(title, content);
      toast("Essay saved to archive!", "success");
    } catch {
      toast("Failed to save essay", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const wc = wordCount(content);
  const cc = charCount(content);
  const displayContent = content.replace(/^TITLE:.*\n?/m, "").trim();

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="font-serif text-lg font-semibold">Your Essay</h3>
          {versionLabel && (
            <span className="rounded-full bg-primary-light px-2 py-0.5 text-[11px] font-semibold text-primary">
              {versionLabel}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted sm:gap-3">
          <span>{wc} words</span>
          <span className="h-3 w-px bg-border" />
          <span>{cc} chars</span>
          <span className="hidden h-3 w-px bg-border sm:block" />
          <span className="hidden sm:inline">~{Math.ceil(wc / 200)} min read</span>
        </div>
      </div>

      <div className="space-y-4">
        {/* Read-only essay display */}
        <div>
          <div
            onClick={handleClick}
            onDoubleClick={handleDoubleClick}
            className="min-h-[200px] cursor-text select-text whitespace-pre-wrap rounded-md border border-border bg-white p-4 text-sm leading-relaxed text-foreground"
          >
            {displayContent}
          </div>
          <p className="mt-1 text-xs text-muted">
            <span className="sm:hidden">Tip: Tap a word to translate it</span>
            <span className="hidden sm:inline">Tip: Double-click a word to translate it instantly</span>
          </p>
        </div>

        {/* Word translation popup */}
        {wordTranslation && (
          <div className="rounded-md border border-border border-l-4 border-l-secondary bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-secondary">
                  &ldquo;{selectedWord}&rdquo;
                </span>
                <span className="rounded-full bg-secondary/10 px-2 py-0.5 text-[10px] font-medium text-secondary">
                  saved to dictionary
                </span>
              </div>
              <button
                onClick={() => { setWordTranslation(""); setSelectedWord(""); }}
                className="text-muted hover:text-foreground"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="whitespace-pre-wrap text-sm text-foreground/80">{wordTranslation}</p>
          </div>
        )}

        {/* Feedback / Refine */}
        {onRefine && (
          <div className="rounded-md border border-primary/20 bg-primary-light p-4">
            <label className="mb-2 block text-sm font-semibold text-primary">
              Want to improve this essay? Give feedback:
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && feedback.trim() && !isRefining) {
                    onRefine(feedback);
                    setFeedback("");
                  }
                }}
                placeholder="e.g., Make it more concise, add examples..."
                disabled={isRefining}
                className="flex-1 rounded-md border border-primary/20 bg-white px-3 py-2.5 text-sm text-foreground placeholder:text-muted/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 disabled:opacity-50"
              />
              <button
                onClick={() => {
                  if (feedback.trim()) { onRefine(feedback); setFeedback(""); }
                }}
                disabled={isRefining || !feedback.trim()}
                className="flex w-full items-center justify-center gap-1.5 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                {isRefining ? (
                  <>
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Refining...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                    </svg>
                    Refine
                  </>
                )}
              </button>
            </div>
            <p className="mt-1.5 text-[11px] text-primary/60">
              Each refinement creates a new version you can go back to
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button
            onClick={() => translateText(content, "full")}
            disabled={isTranslating || !content.trim()}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-secondary/30 bg-secondary/5 px-4 py-2.5 text-sm font-medium text-secondary hover:bg-secondary/10 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-initial sm:justify-start"
          >
            {isTranslating ? (
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-secondary border-t-transparent" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 01-3.827-5.802" />
              </svg>
            )}
            Translate Full Text
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving || !content.trim()}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm font-medium text-primary hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-initial sm:justify-start"
          >
            {isSaving ? (
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25-2.25m-2.25 2.25V3m-4.5 15H5.625c-.621 0-1.125-.504-1.125-1.125v-1.5c0-.621.504-1.125 1.125-1.125h3.75m7.5 0h3.375c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125H14.25" />
              </svg>
            )}
            Save to Archive
          </button>
        </div>

        {/* Full translation result */}
        {translation && (
          <div className="rounded-md border border-border border-l-4 border-l-primary bg-surface p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-serif text-sm font-semibold text-primary">Full Translation</span>
              <div className="flex gap-2">
                <button
                  onClick={() => { navigator.clipboard.writeText(translation); toast("Translation copied!", "success"); }}
                  className="text-xs text-primary hover:underline"
                >
                  Copy
                </button>
                <button onClick={() => setTranslation("")} className="text-muted hover:text-foreground">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">{translation}</p>
          </div>
        )}
      </div>
    </div>
  );
}
