"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useToast } from "@/components/Toast";

interface HighlightEntry {
  id: string;
  text: string;
  essayTitle: string;
  sourceId: string;
  essayContent: string | null;
  color: string;
  note: string;
  createdAt: string;
}

function renderWithHighlight(content: string, highlightText: string): React.ReactNode {
  if (!content) return null;
  const idx = content.indexOf(highlightText);
  if (idx === -1) return content;
  return (
    <>
      {content.slice(0, idx)}
      <mark className="rounded bg-yellow-100 dark:bg-yellow-900/40 px-0.5">{highlightText}</mark>
      {content.slice(idx + highlightText.length)}
    </>
  );
}

interface GroupedHighlights {
  essayTitle: string;
  highlights: HighlightEntry[];
}

function groupByEssay(highlights: HighlightEntry[]): GroupedHighlights[] {
  const byTitle: Record<string, HighlightEntry[]> = {};
  for (const h of highlights) {
    if (!byTitle[h.essayTitle]) byTitle[h.essayTitle] = [];
    byTitle[h.essayTitle].push(h);
  }
  return Object.entries(byTitle).map(([essayTitle, list]) => ({
    essayTitle,
    highlights: list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
  }));
}

export default function HighlightsPage() {
  const [highlights, setHighlights] = useState<HighlightEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchHighlights = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const response = await fetch(`/api/highlights?${params}`);
      if (!response.ok) throw new Error();
      setHighlights(await response.json());
    } catch {
      toast("Failed to load highlights", "error");
    } finally {
      setLoading(false);
    }
  }, [search, toast]);

  useEffect(() => {
    fetchHighlights();
  }, [fetchHighlights]);

  const deleteHighlight = async (id: string) => {
    try {
      const response = await fetch(`/api/highlights?id=${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error();
      setHighlights((prev) => prev.filter((h) => h.id !== id));
      setDeleteConfirm(null);
      toast("Highlight removed", "success");
    } catch {
      toast("Failed to delete highlight", "error");
    }
  };

  const grouped = groupByEssay(highlights);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-12">
      <div className="mb-6 sm:mb-8">
        <h1 className="font-serif text-2xl font-bold sm:text-3xl">Highlights</h1>
        <p className="mt-1 text-sm text-muted">
          Sentences you&apos;ve highlighted from your essays. {highlights.length} highlight{highlights.length !== 1 ? "s" : ""} total.
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
            placeholder="Search highlights or essay titles..."
            className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-4 text-sm placeholder:text-muted/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-0"
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-5 shadow-card">
              <div className="skeleton mb-2 h-4 w-1/3" />
              <div className="skeleton mb-2 h-5 w-full" />
              <div className="skeleton h-4 w-24" />
            </div>
          ))}
        </div>
      ) : highlights.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="mx-auto mb-4 h-12 w-12 text-muted/30">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 3 3 0 004.78 2.122 3 3 0 005.78-1.128 3 3 0 00-4.78-2.122zm0 0L15 16.5" />
          </svg>
          <p className="font-serif text-lg font-medium text-muted/50">No highlights yet</p>
          <p className="mt-1 text-sm text-muted/40">
            {search ? "No matches found" : "Select text in an essay and click Highlight to save it here. Open an essay on the Writer first."}
          </p>
          {!search && (
            <Link href="/" className="mt-4 inline-block rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover">
              Go to Writer
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map((group) => (
            <div key={group.essayTitle}>
              <h2 className="mb-4 flex items-center gap-2 font-serif text-sm font-semibold text-muted">
                <span className="rounded-full bg-primary-light px-2 py-0.5 text-xs text-primary">
                  {group.highlights.length}
                </span>
                {group.essayTitle}
              </h2>
              <div className="space-y-3">
                {group.highlights.map((h) => (
                  <div
                    key={h.id}
                    className="rounded-xl border border-border bg-card shadow-card transition-shadow duration-200 hover:shadow-hover"
                  >
                    <div className="p-4">
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                        <span className="rounded bg-yellow-100 dark:bg-yellow-900/40 px-0.5">{h.text}</span>
                      </p>
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[11px] text-muted">
                          {new Date(h.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <div className="flex items-center gap-1">
                          {h.essayContent != null && (
                            <button
                              type="button"
                              onClick={() => setExpandedId(expandedId === h.id ? null : h.id)}
                              className="rounded-xl px-2 py-1.5 text-xs font-medium text-primary hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-primary/20"
                            >
                              {expandedId === h.id ? "Hide context" : "View context"}
                            </button>
                          )}
                          {deleteConfirm === h.id ? (
                            <>
                              <button
                                onClick={() => deleteHighlight(h.id)}
                                className="rounded-xl bg-danger px-2 py-1.5 text-xs font-medium text-white hover:bg-danger-hover focus:outline-none focus:ring-2 focus:ring-danger/30"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                className="rounded-xl px-2 py-1.5 text-xs text-muted hover:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirm(h.id)}
                              className="rounded-xl p-1.5 text-muted transition-opacity hover:bg-red-100 dark:hover:bg-red-900/40 hover:text-danger"
                              title="Remove highlight"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    {expandedId === h.id && (
                      <div className="border-t border-border bg-surface/50 px-4 py-3">
                        <p className="text-xs font-semibold text-muted mb-2">Full essay</p>
                        <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                          {renderWithHighlight(
                            h.essayContent?.replace(/^TITLE:.*\n?/m, "").trim() ?? "",
                            h.text,
                          )}
                        </div>
                      </div>
                    )}
                    {expandedId === h.id && h.essayContent == null && (
                      <div className="border-t border-border bg-surface/50 px-4 py-3">
                        <p className="text-sm text-muted">Context was not saved for this highlight.</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
