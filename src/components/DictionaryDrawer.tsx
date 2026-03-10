"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useToast } from "@/components/Toast";
import SpeakButton from "@/components/SpeakButton";

export interface DictionaryEntry {
  id: string;
  word: string;
  translation: string;
  definition: string;
  example: string;
  sourceLang: string;
  targetLang: string;
  createdAt: string;
}

interface DictionaryDrawerProps {
  open: boolean;
  onClose: () => void;
}

function WordSectionCompact({
  title,
  entries,
  deleteConfirm,
  onDeleteConfirm,
  onDelete,
}: {
  title: string;
  entries: DictionaryEntry[];
  deleteConfirm: string | null;
  onDeleteConfirm: (id: string | null) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div>
      <h2 className="mb-2 flex items-center gap-2 font-serif text-xs font-semibold text-muted">
        {title}
        <span className="rounded-full bg-primary-light px-2 py-0.5 text-[10px] text-primary">
          {entries.length}
        </span>
      </h2>
      <div className="space-y-2">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="group rounded-lg border border-border bg-card p-3 shadow-card"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-serif text-sm font-semibold flex items-center gap-1">
                  {entry.word}
                  <SpeakButton
                    text={entry.word}
                    lang={entry.sourceLang === "Korean" ? "ko-KR" : "en-US"}
                    title="Hear word"
                    size="sm"
                  />
                </p>
                <p className="mt-0.5 text-xs text-primary flex items-center gap-1">
                  {entry.translation}
                  <SpeakButton
                    text={entry.translation}
                    lang={entry.targetLang === "Korean" ? "ko-KR" : "en-US"}
                    title="Hear translation"
                    size="sm"
                  />
                </p>
              </div>
              {deleteConfirm === entry.id ? (
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => onDelete(entry.id)}
                    className="rounded-lg bg-danger px-2 py-0.5 text-[10px] font-medium text-white hover:bg-danger-hover"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => onDeleteConfirm(null)}
                    className="rounded-lg px-2 py-0.5 text-[10px] text-muted hover:bg-surface"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => onDeleteConfirm(entry.id)}
                  className="shrink-0 rounded-lg p-1 text-muted hover:bg-red-100 dark:hover:bg-red-900/40 hover:text-danger"
                  aria-label="Remove from dictionary"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-3.5 w-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </button>
              )}
            </div>
            {(entry.definition || entry.example) && (
              <div className="mt-1.5 space-y-0.5">
                {entry.definition && (
                  <p className="text-[11px] leading-relaxed text-muted">{entry.definition}</p>
                )}
                {entry.example && (
                  <p className="text-[11px] italic text-muted/70">&ldquo;{entry.example}&rdquo;</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DictionaryDrawer({ open, onClose }: DictionaryDrawerProps) {
  const [entries, setEntries] = useState<DictionaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchEntries = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const response = await fetch(`/api/dictionary?${params}`);
      if (!response.ok) throw new Error();
      setEntries(await response.json());
    } catch {
      toast("Failed to load dictionary", "error");
    } finally {
      setLoading(false);
    }
  }, [search, toast]);

  useEffect(() => {
    if (open) {
      setLoading(true);
      fetchEntries();
    }
  }, [open, fetchEntries]);

  const deleteEntry = async (id: string) => {
    try {
      const response = await fetch(`/api/dictionary?id=${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error();
      setEntries((prev) => prev.filter((e) => e.id !== id));
      setDeleteConfirm(null);
      toast("Word removed from dictionary", "success");
    } catch {
      toast("Failed to delete entry", "error");
    }
  };

  const koreanEntries = entries.filter((e) => e.sourceLang === "Korean");
  const englishEntries = entries.filter((e) => e.sourceLang === "English");

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] sm:bg-black/20"
        aria-hidden
        onClick={onClose}
      />
      <aside
        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-border bg-background shadow-hover sm:max-w-sm"
        role="dialog"
        aria-label="Dictionary"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
          <h2 className="font-serif text-lg font-semibold">My Dictionary</h2>
          <div className="flex items-center gap-2">
            <Link
              href="/dictionary"
              className="rounded-xl px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10"
            >
              Full page
            </Link>
            <button
              onClick={onClose}
              className="min-h-[44px] min-w-[44px] rounded-xl text-muted hover:bg-surface hover:text-foreground"
              aria-label="Close dictionary"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="flex shrink-0 px-4 py-3">
          <div className="relative">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search words..."
              className="w-full rounded-xl border border-border bg-card py-2 pl-10 pr-3 text-sm placeholder:text-muted/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-0"
            />
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-xl border border-border bg-card p-4">
                  <div className="skeleton mb-2 h-4 w-20" />
                  <div className="skeleton h-3 w-32" />
                </div>
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-10 text-center">
              <p className="text-sm font-medium text-muted">
                {search ? "No matches" : "No words yet"}
              </p>
              <p className="mt-1 text-xs text-muted/80">
                {!search && "Look up words in your essay to save them here."}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {koreanEntries.length > 0 && (
                <WordSectionCompact
                  title="Korean → English"
                  entries={koreanEntries}
                  deleteConfirm={deleteConfirm}
                  onDeleteConfirm={setDeleteConfirm}
                  onDelete={deleteEntry}
                />
              )}
              {englishEntries.length > 0 && (
                <WordSectionCompact
                  title="English → Korean"
                  entries={englishEntries}
                  deleteConfirm={deleteConfirm}
                  onDeleteConfirm={setDeleteConfirm}
                  onDelete={deleteEntry}
                />
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
