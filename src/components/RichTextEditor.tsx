"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { wordCount, charCount } from "@/lib/utils";
import { useToast } from "./Toast";
import SpeakButton from "./SpeakButton";

interface Props {
  content: string;
  highlights?: string[];
  onHighlight?: (text: string) => void;
  onSave?: (title: string, content: string) => Promise<void>;
  onSaveSuccess?: () => void;
  onRefine?: (feedback: string) => Promise<void>;
  isRefining?: boolean;
  versionLabel?: string;
}

type Segment = { start: number; end: number; type: "yellow" | "pink" };

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Find all whole-word or exact phrase ranges for dictionary words (pink). */
function findDictionaryRanges(content: string, words: string[]): Segment[] {
  const segments: Segment[] = [];
  for (const w of words) {
    if (!w.trim()) continue;
    const trimmed = w.trim();
    if (trimmed.includes(" ")) {
      let i = 0;
      while (i < content.length) {
        const idx = content.indexOf(trimmed, i);
        if (idx === -1) break;
        segments.push({ start: idx, end: idx + trimmed.length, type: "pink" });
        i = idx + trimmed.length;
      }
    } else {
      const re = new RegExp(`\\b${escapeRegex(trimmed)}\\b`, "gi");
      let m: RegExpExecArray | null;
      while ((m = re.exec(content)) !== null) {
        segments.push({ start: m.index, end: m.index + m[0].length, type: "pink" });
      }
    }
  }
  return segments;
}

/** Merge segments: yellow (highlights) take precedence over pink (dictionary) when overlapping. */
function mergeSegments(yellow: Segment[], pink: Segment[]): Segment[] {
  const result: Segment[] = [];
  for (const p of pink) {
    let s = p.start;
    const e = p.end;
    for (const y of yellow) {
      if (y.end <= s || y.start >= e) continue;
      if (y.start > s) result.push({ start: s, end: y.start, type: "pink" });
      s = Math.max(s, y.end);
      if (s >= e) break;
    }
    if (s < e) result.push({ start: s, end: e, type: "pink" });
  }
  const all = [...yellow.map((seg) => ({ ...seg, type: "yellow" as const })), ...result];
  all.sort((a, b) => a.start - b.start);
  const merged: Segment[] = [];
  for (const seg of all) {
    if (merged.length === 0 || seg.start >= merged[merged.length - 1].end) merged.push(seg);
  }
  return merged;
}

/** Renders content with yellow highlights and light-pink dictionary-word highlights. */
function renderContentWithHighlightsAndDictionary(
  content: string,
  highlights: string[],
  dictionaryWords: string[],
): React.ReactNode {
  const yellowSegs: Segment[] = [];
  for (const h of highlights) {
    if (!h.trim()) continue;
    let i = 0;
    while (i < content.length) {
      const idx = content.indexOf(h, i);
      if (idx === -1) break;
      yellowSegs.push({ start: idx, end: idx + h.length, type: "yellow" });
      i = idx + h.length;
    }
  }
  const pinkSegs = findDictionaryRanges(content, dictionaryWords);
  const merged = mergeSegments(yellowSegs, pinkSegs);
  if (merged.length === 0) return content;
  const nodes: React.ReactNode[] = [];
  let last = 0;
  for (const { start, end, type } of merged) {
    if (start > last) nodes.push(content.slice(last, start));
    const cls = type === "yellow" ? "bg-yellow-100 dark:bg-yellow-900/40" : "bg-pink-100 dark:bg-pink-900/40";
    nodes.push(<mark key={`${type}-${start}-${end}`} className={`${cls} text-foreground rounded px-0.5`}>{content.slice(start, end)}</mark>);
    last = end;
  }
  if (last < content.length) nodes.push(content.slice(last));
  return nodes;
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
  highlights = [],
  onHighlight,
  onSave,
  onSaveSuccess,
  onRefine,
  isRefining,
  versionLabel,
}: Props) {
  const [translation, setTranslation] = useState("");
  const [dictionaryEntry, setDictionaryEntry] = useState<{
    word: string;
    translation: string;
    definition: string;
    example: string;
    sourceLang?: string;
    targetLang?: string;
    justSaved?: boolean;
  } | null>(null);
  const [lookedUpWords, setLookedUpWords] = useState<string[]>([]);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [highlightToolbar, setHighlightToolbar] = useState<{
    text: string;
    top: number;
    left: number;
    canLookUp?: boolean;
    canHighlight?: boolean;
  } | null>(null);
  const essayContainerRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    if (!highlightToolbar) return;
    const clearIfSelectionGone = () => {
      if (!window.getSelection()?.toString().trim()) setHighlightToolbar(null);
    };
    document.addEventListener("selectionchange", clearIfSelectionGone);
    return () => document.removeEventListener("selectionchange", clearIfSelectionGone);
  }, [highlightToolbar]);

  const addLookedUpWords = useCallback((words: string[]) => {
    setLookedUpWords((prev) => {
      let next = [...prev];
      for (const w of words) {
        if (!w.trim()) continue;
        const t = w.trim();
        if (!next.some((x) => x.toLowerCase() === t.toLowerCase())) next = [...next, t];
      }
      return next;
    });
  }, []);

  const saveToDictionary = useCallback(
    async (
      word: string,
      translationText: string,
      sourceLang: string,
      targetLang: string,
    ): Promise<{ word: string; translation: string; definition: string; example: string } | null> => {
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
        const res = await fetch("/api/dictionary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ word, translation: mainTranslation, definition, example, sourceLang, targetLang }),
        });
        const entry = await res.json();
        if (!res.ok) return null;
        return {
          word: entry.word,
          translation: entry.translation,
          definition: entry.definition ?? "",
          example: entry.example ?? "",
        };
      } catch {
        return null;
      }
    },
    [],
  );

  const translateText = useCallback(
    async (text: string, mode: "full" | "word" = "full") => {
      if (!text.trim()) return;
      setIsTranslating(true);
      try {
        if (mode === "word") {
          const norm = text.trim().toLowerCase();
          const searchRes = await fetch(`/api/dictionary?search=${encodeURIComponent(text.trim())}`);
          if (searchRes.ok) {
            const entries: { word: string; translation: string; definition: string; example: string; sourceLang?: string; targetLang?: string }[] = await searchRes.json();
            const existing = entries.find((e) => e.word.trim().toLowerCase() === norm);
            if (existing) {
              setDictionaryEntry({
                word: existing.word,
                translation: existing.translation,
                definition: existing.definition ?? "",
                example: existing.example ?? "",
                sourceLang: existing.sourceLang,
                targetLang: existing.targetLang,
                justSaved: false,
              });
              addLookedUpWords([text.trim(), existing.word]);
              toast(`"${existing.word}" from your dictionary`, "success");
              setIsTranslating(false);
              return;
            }
          }
          const response = await fetch("/api/translate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, mode }),
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error);
          const entry = await saveToDictionary(text, data.translation, data.sourceLang, data.targetLang);
          if (entry) {
            setDictionaryEntry({ ...entry, sourceLang: data.sourceLang, targetLang: data.targetLang, justSaved: true });
            addLookedUpWords([text.trim(), entry.word]);
            toast(`"${text}" saved to your dictionary`, "success");
          } else {
            setDictionaryEntry({
              word: text,
              translation: data.translation,
              definition: "",
              example: "",
              sourceLang: data.sourceLang,
              targetLang: data.targetLang,
              justSaved: true,
            });
            addLookedUpWords([text.trim()]);
            toast(`"${text}" saved to your dictionary`, "success");
          }
        } else {
          const response = await fetch("/api/translate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, mode }),
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error);
          setTranslation(data.translation);
          toast("Translation complete!", "success");
        }
      } catch (error) {
        toast(error instanceof Error ? error.message : "Translation failed", "error");
      } finally {
        setIsTranslating(false);
      }
    },
    [toast, saveToDictionary, addLookedUpWords],
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

  const checkSelectionForHighlight = useCallback(() => {
    const sel = window.getSelection();
    const text = sel?.toString().trim() ?? "";
    if (!essayContainerRef.current) return;
    if (!sel?.rangeCount || !text) return;
    const range = sel.getRangeAt(0);
    if (!essayContainerRef.current.contains(range.commonAncestorContainer)) return;
    const wordCount = text.split(/\s+/).length;
    const canLookUp = wordCount >= 1 && wordCount <= 6;
    const canHighlight = onHighlight && text.length >= 4 && wordCount > 1;
    if (!canLookUp && !canHighlight) return;
    const rect = range.getBoundingClientRect();
    const containerRect = essayContainerRef.current.getBoundingClientRect();
    setHighlightToolbar({
      text,
      top: rect.top - containerRect.top - 36,
      left: Math.max(0, rect.left - containerRect.left + rect.width / 2 - 80),
      canLookUp,
      canHighlight: !!canHighlight,
    });
  }, [onHighlight]);

  const handleMouseUp = useCallback(() => {
    setTimeout(checkSelectionForHighlight, 10);
  }, [checkSelectionForHighlight]);

  const handleTouchEnd = useCallback(() => {
    setTimeout(checkSelectionForHighlight, 300);
  }, [checkSelectionForHighlight]);

  const handleLookUpClick = useCallback(() => {
    if (highlightToolbar?.canLookUp) {
      handleWordSelect(highlightToolbar.text);
      window.getSelection()?.removeAllRanges();
      setHighlightToolbar(null);
    }
  }, [highlightToolbar, handleWordSelect]);

  const handleHighlightClick = useCallback(() => {
    if (highlightToolbar && onHighlight && highlightToolbar.canHighlight) {
      onHighlight(highlightToolbar.text);
      window.getSelection()?.removeAllRanges();
      setHighlightToolbar(null);
      toast("Highlight saved!", "success");
    }
  }, [highlightToolbar, onHighlight, toast]);

  const handleSave = async () => {
    if (!onSave || !content.trim()) return;
    setIsSaving(true);
    try {
      const titleMatch = content.match(/^TITLE:\s*(.+)/m);
      const title = titleMatch ? titleMatch[1].trim() : "Untitled Essay";
      await onSave(title, content);
      onSaveSuccess?.();
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
    <div className="rounded-xl border border-border bg-card p-4 shadow-card sm:p-6">
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
        {/* Read-only essay display + floating dictionary card */}
        <div className="relative">
          <div
            ref={essayContainerRef}
            onClick={handleClick}
            onDoubleClick={handleDoubleClick}
            onMouseUp={handleMouseUp}
            onTouchEnd={handleTouchEnd}
            className="min-h-[200px] cursor-text select-text whitespace-pre-wrap rounded-xl bg-transparent p-4 text-sm leading-relaxed text-foreground"
          >
            {renderContentWithHighlightsAndDictionary(displayContent, highlights, lookedUpWords)}
          </div>
          {highlightToolbar && (
            <div
              className="absolute z-20 flex items-center gap-1 rounded-xl border border-border bg-card px-2 py-1.5 shadow-hover"
              style={{ top: highlightToolbar.top, left: highlightToolbar.left }}
            >
              {highlightToolbar.canLookUp && (
                <button
                  type="button"
                  onClick={handleLookUpClick}
                  className="flex items-center gap-1.5 rounded bg-pink-100 dark:bg-pink-900/40 px-2.5 py-1 text-xs font-medium text-foreground hover:bg-pink-200 dark:hover:bg-pink-800/50"
                  title="Look up in dictionary (word or idiom)"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-3.5 w-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                  </svg>
                  Look up
                </button>
              )}
              {highlightToolbar.canHighlight && (
                <button
                  type="button"
                  onClick={handleHighlightClick}
                  className="flex items-center gap-1.5 rounded bg-yellow-100 dark:bg-yellow-900/40 px-2.5 py-1 text-xs font-medium text-foreground hover:bg-yellow-200 dark:hover:bg-yellow-800/50"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-3.5 w-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 3 3 0 004.78 2.122 3 3 0 005.78-1.128 3 3 0 00-4.78-2.122zm0 0L15 16.5" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 17.25v-4.875m0 0a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm3.75 3.75v-4.875m0 0a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0z" />
                  </svg>
                  Highlight
                </button>
              )}
            </div>
          )}
          <p className="mt-1 text-xs text-muted">
            <span className="sm:hidden">Tip: Tap a word to look up; select a word or phrase (idiom) for Look up; select a sentence to highlight</span>
            <span className="hidden sm:inline">Tip: Double-click a word, or select a phrase and click Look up for idioms; select text to highlight</span>
          </p>

          {/* Floating dictionary card — on mobile fixed at bottom above tab bar; on desktop top-right of essay */}
          {dictionaryEntry && (
            <div className="fixed bottom-0 left-0 right-0 z-30 px-4 pb-[max(1rem,calc(3.5rem+env(safe-area-inset-bottom,0px)))] pt-4 sm:absolute sm:right-0 sm:top-0 sm:left-auto sm:bottom-auto sm:z-20 sm:w-full sm:min-w-[280px] sm:max-w-md sm:p-0 sm:pb-0 sm:pt-0 sm:px-0">
              <div className="mx-auto max-w-sm rounded-xl border border-border border-l-4 border-l-secondary bg-card p-4 shadow-hover sm:mx-0 sm:max-w-none">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-secondary">
                      &ldquo;{dictionaryEntry.word}&rdquo;
                    </span>
                    <SpeakButton
                      text={dictionaryEntry.word}
                      lang={dictionaryEntry.sourceLang === "Korean" ? "ko-KR" : "en-US"}
                      title="Hear word"
                    />
                    <span className="rounded-full bg-secondary/10 px-2 py-0.5 text-[10px] font-medium text-secondary">
                      {dictionaryEntry.justSaved ? "saved to dictionary" : "from your dictionary"}
                    </span>
                  </div>
                  <button
                    onClick={() => setDictionaryEntry(null)}
                    className="min-h-[44px] min-w-[44px] rounded-xl text-muted hover:bg-surface hover:text-foreground"
                    aria-label="Close"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-1">
                    <span className="font-medium text-muted">Translation: </span>
                    <span className="text-foreground">{dictionaryEntry.translation}</span>
                    <SpeakButton
                      text={dictionaryEntry.translation}
                      lang={dictionaryEntry.targetLang === "Korean" ? "ko-KR" : "en-US"}
                      title="Hear translation"
                    />
                  </div>
                  {dictionaryEntry.definition && (
                    <div>
                      <span className="font-medium text-muted">Definition: </span>
                      <span className="text-foreground/90">{dictionaryEntry.definition}</span>
                    </div>
                  )}
                  {dictionaryEntry.example && (
                    <div>
                      <span className="font-medium text-muted">Example: </span>
                      <span className="text-foreground/90 italic">&ldquo;{dictionaryEntry.example}&rdquo;</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Feedback / Refine */}
        {onRefine && (
          <div className="rounded-xl border border-primary/20 bg-primary-light p-4">
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
                className="flex-1 rounded-xl border border-primary/20 bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-0 disabled:opacity-50"
              />
              <button
                onClick={() => {
                  if (feedback.trim()) { onRefine(feedback); setFeedback(""); }
                }}
                disabled={isRefining || !feedback.trim()}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
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
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-secondary/30 bg-secondary/5 px-4 py-2.5 text-sm font-medium text-secondary hover:bg-secondary/10 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-initial sm:justify-start"
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
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm font-medium text-primary hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-initial sm:justify-start"
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
          <div className="rounded-xl border border-border border-l-4 border-l-primary bg-surface p-4">
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
