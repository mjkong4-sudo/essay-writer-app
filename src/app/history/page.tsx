"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/Toast";
import { truncate } from "@/lib/utils";

interface HistoryEntry {
  id: string;
  title: string;
  content: string;
  tone: string;
  language: string;
  createdAt: string;
}

interface GroupedEntries {
  label: string;
  entries: HistoryEntry[];
}

function groupByDate(entries: HistoryEntry[]): GroupedEntries[] {
  const groups: Record<string, HistoryEntry[]> = {};

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  for (const entry of entries) {
    const d = new Date(entry.createdAt);
    const entryDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());

    let label: string;
    if (entryDate.getTime() === today.getTime()) {
      label = "Today";
    } else if (entryDate.getTime() === yesterday.getTime()) {
      label = "Yesterday";
    } else {
      label = entryDate.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      });
    }

    if (!groups[label]) groups[label] = [];
    groups[label].push(entry);
  }

  return Object.entries(groups).map(([label, entries]) => ({
    label,
    entries,
  }));
}

export default function HistoryPage() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchEntries = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const response = await fetch(`/api/history?${params}`);
      if (!response.ok) throw new Error();
      setEntries(await response.json());
    } catch {
      toast("Failed to load history", "error");
    } finally {
      setLoading(false);
    }
  }, [search, toast]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const deleteEntry = async (id: string) => {
    try {
      const response = await fetch(`/api/history?id=${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error();
      setEntries((prev) => prev.filter((e) => e.id !== id));
      setDeleteConfirm(null);
      toast("Removed from history", "success");
    } catch {
      toast("Failed to delete", "error");
    }
  };

  const saveToArchive = async (entry: HistoryEntry) => {
    setSavingId(entry.id);
    try {
      const response = await fetch("/api/essays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: entry.title,
          content: entry.content,
          tone: entry.tone,
        }),
      });
      if (!response.ok) throw new Error();
      toast("Saved to Archive!", "success");
    } catch {
      toast("Failed to save to archive", "error");
    } finally {
      setSavingId(null);
    }
  };

  const grouped = groupByDate(entries);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-12">
      <div className="mb-6 sm:mb-8">
        <h1 className="font-serif text-2xl font-bold sm:text-3xl">Generation History</h1>
        <p className="mt-1 text-sm text-muted">
          Every essay you generate is automatically saved here for 7 days.{" "}
          {entries.length} entr{entries.length === 1 ? "y" : "ies"} total.
        </p>
      </div>

      <div className="mb-6">
        <div className="relative">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search history..."
            className="w-full rounded-md border border-border bg-white py-2.5 pl-10 pr-4 text-sm placeholder:text-muted/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-lg border border-border bg-card p-6 shadow-sm"
            >
              <div className="skeleton mb-3 h-5 w-1/3" />
              <div className="skeleton mb-2 h-4 w-full" />
              <div className="skeleton h-4 w-2/3" />
            </div>
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-16 text-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1}
            stroke="currentColor"
            className="mx-auto mb-4 h-12 w-12 text-muted/30"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="font-serif text-lg font-medium text-muted/50">
            No history yet
          </p>
          <p className="mt-1 text-sm text-muted/40">
            {search
              ? "No matches found"
              : "Generated essays will automatically appear here"}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map((group) => (
            <div key={group.label}>
              <h2 className="mb-3 flex items-center gap-2 font-serif text-sm font-semibold text-muted">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="h-4 w-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                  />
                </svg>
                {group.label}
                <span className="rounded-full bg-primary-light px-2 py-0.5 text-xs text-primary">
                  {group.entries.length}
                </span>
              </h2>

              <div className="space-y-3">
                {group.entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="group rounded-lg border border-border bg-card shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="p-4 sm:p-5">
                      <div className="mb-2 flex items-start justify-between gap-3 sm:gap-4">
                        <div className="min-w-0 flex-1">
                          <h3
                            className="cursor-pointer truncate font-serif text-base font-semibold hover:text-primary"
                            onClick={() =>
                              setExpandedId(
                                expandedId === entry.id ? null : entry.id,
                              )
                            }
                          >
                            {entry.title}
                          </h3>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                            <span>
                              {new Date(entry.createdAt).toLocaleTimeString(
                                [],
                                { hour: "2-digit", minute: "2-digit" },
                              )}
                            </span>
                            <span className="h-1 w-1 rounded-full bg-border" />
                            <span className="rounded bg-primary-light px-1.5 py-0.5 text-primary">
                              {entry.tone}
                            </span>
                            <span className="rounded bg-surface px-1.5 py-0.5">
                              {entry.language}
                            </span>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            onClick={() => saveToArchive(entry)}
                            disabled={savingId === entry.id}
                            className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary-light disabled:opacity-50"
                            title="Save to Archive"
                          >
                            {savingId === entry.id ? (
                              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                            ) : (
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={1.5}
                                stroke="currentColor"
                                className="h-3.5 w-3.5"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25-2.25m-2.25 2.25V3m-4.5 15H5.625c-.621 0-1.125-.504-1.125-1.125v-1.5c0-.621.504-1.125 1.125-1.125h3.75m7.5 0h3.375c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125H14.25"
                                />
                              </svg>
                            )}
                            Archive
                          </button>

                          {deleteConfirm === entry.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => deleteEntry(entry.id)}
                                className="rounded-md bg-danger px-2 py-1.5 text-xs font-medium text-white hover:bg-danger-hover"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                className="rounded-md px-2 py-1.5 text-xs text-muted hover:bg-surface"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirm(entry.id)}
                              className="rounded-md p-1.5 text-muted transition-opacity hover:bg-red-50 hover:text-danger sm:opacity-0 sm:group-hover:opacity-100"
                              title="Remove from history"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={1.5}
                                stroke="currentColor"
                                className="h-4 w-4"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                                />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>

                      {expandedId === entry.id ? (
                        <div className="mt-3 whitespace-pre-wrap rounded-md border border-border bg-surface p-4 text-sm leading-relaxed">
                          {entry.content}
                        </div>
                      ) : (
                        <p className="mt-2 text-sm leading-relaxed text-muted">
                          {truncate(entry.content, 180)}
                        </p>
                      )}
                    </div>
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
