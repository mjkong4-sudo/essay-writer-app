"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useToast } from "@/components/Toast";
import { formatDate } from "@/lib/utils";
import SpeakButton from "@/components/SpeakButton";

interface DictionaryEntry {
  id: string;
  word: string;
  translation: string;
  definition: string;
  example: string;
  sourceLang: string;
  targetLang: string;
  createdAt: string;
}

export default function DictionaryPage() {
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
    fetchEntries();
  }, [fetchEntries]);

  const deleteEntry = async (id: string) => {
    try {
      const response = await fetch(`/api/dictionary?id=${id}`, {
        method: "DELETE",
      });
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

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-12">
      <div className="mb-6 sm:mb-8">
        <h1 className="font-serif text-2xl font-bold sm:text-3xl">My Dictionary</h1>
        <p className="mt-1 text-sm text-muted">
          Words you&apos;ve translated are automatically saved here. {entries.length} word{entries.length !== 1 && "s"} total.
        </p>
      </div>

      <div className="mb-6">
        <div className="relative">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search words or translations..."
            className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-4 text-sm placeholder:text-muted/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-0"
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-5 shadow-card">
              <div className="skeleton mb-2 h-5 w-24" />
              <div className="skeleton h-4 w-48" />
            </div>
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="mx-auto mb-4 h-12 w-12 text-muted/30">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
          </svg>
          <p className="font-serif text-lg font-medium text-muted/50">No words yet</p>
          <p className="mt-1 text-sm text-muted/40">
            {search
              ? "No matches found"
              : "Words you look up in an essay are saved here. Open an essay on the Writer, then double-click a word or select a phrase and click Look up."}
          </p>
          {!search && (
            <Link href="/" className="mt-4 inline-block rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover">
              Go to Writer
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {koreanEntries.length > 0 && (
            <WordSection
              title="Korean → English"
              entries={koreanEntries}
              deleteConfirm={deleteConfirm}
              onDeleteConfirm={setDeleteConfirm}
              onDelete={deleteEntry}
            />
          )}

          {englishEntries.length > 0 && (
            <WordSection
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
  );
}

function WordSection({
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
      <h2 className="mb-3 flex items-center gap-2 font-serif text-sm font-semibold text-muted">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 01-3.827-5.802" />
        </svg>
        {title}
        <span className="rounded-full bg-primary-light px-2 py-0.5 text-xs text-primary">
          {entries.length}
        </span>
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="group rounded-xl border border-border bg-card p-4 shadow-card transition-shadow duration-200 hover:shadow-hover"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-serif text-base font-semibold flex items-center gap-1">
                  {entry.word}
                  <SpeakButton
                    text={entry.word}
                    lang={entry.sourceLang === "Korean" ? "ko-KR" : "en-US"}
                    title="Hear word"
                    size="md"
                  />
                </p>
                <p className="mt-0.5 text-sm text-primary flex items-center gap-1">
                  {entry.translation}
                  <SpeakButton
                    text={entry.translation}
                    lang={entry.targetLang === "Korean" ? "ko-KR" : "en-US"}
                    title="Hear translation"
                    size="md"
                  />
                </p>
              </div>
              {deleteConfirm === entry.id ? (
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => onDelete(entry.id)}
                    className="rounded-xl bg-danger px-2 py-1 text-xs font-medium text-white hover:bg-danger-hover"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => onDeleteConfirm(null)}
                    className="rounded-xl px-2 py-1 text-xs text-muted hover:bg-surface"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => onDeleteConfirm(entry.id)}
                  className="shrink-0 rounded-xl p-1 text-muted transition-opacity hover:bg-red-100 dark:hover:bg-red-900/40 hover:text-danger sm:opacity-0 sm:group-hover:opacity-100"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </button>
              )}
            </div>
            {entry.definition && (
              <p className="mt-2 text-xs leading-relaxed text-muted">
                {entry.definition}
              </p>
            )}
            {entry.example && (
              <p className="mt-1 text-xs italic leading-relaxed text-muted/70">
                &ldquo;{entry.example}&rdquo;
              </p>
            )}
            <p className="mt-2 text-[10px] text-muted/50">
              {formatDate(entry.createdAt)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
