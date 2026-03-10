"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useToast } from "@/components/Toast";
import ExportMenu from "@/components/ExportMenu";
import { formatDate, truncate } from "@/lib/utils";

interface Essay {
  id: string;
  title: string;
  content: string;
  tone: string;
  isFavorite: boolean;
  createdAt: string;
}

export default function ArchivePage() {
  const [essays, setEssays] = useState<Essay[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showFavorites, setShowFavorites] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchEssays = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (showFavorites) params.set("favorites", "true");

      const response = await fetch(`/api/essays?${params}`);
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setEssays(data);
    } catch {
      toast("Failed to load essays", "error");
    } finally {
      setLoading(false);
    }
  }, [search, showFavorites, toast]);

  useEffect(() => {
    fetchEssays();
  }, [fetchEssays]);

  const toggleFavorite = async (id: string, current: boolean) => {
    const next = !current;
    setEssays((prev) =>
      prev.map((e) => (e.id === id ? { ...e, isFavorite: next } : e)),
    );
    try {
      const response = await fetch(`/api/essays/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: next }),
      });
      if (!response.ok) throw new Error();
      toast(next ? "Added to favorites" : "Removed from favorites", "success");
    } catch {
      setEssays((prev) =>
        prev.map((e) => (e.id === id ? { ...e, isFavorite: current } : e)),
      );
      toast("Failed to update. Please try again.", "error");
    }
  };

  const deleteEssay = async (id: string) => {
    try {
      const response = await fetch(`/api/essays/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error();
      setEssays((prev) => prev.filter((e) => e.id !== id));
      setDeleteConfirm(null);
      toast("Essay deleted", "success");
    } catch {
      toast("Failed to delete essay", "error");
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-12">
      <div className="mb-6 sm:mb-8">
        <h1 className="font-serif text-2xl font-bold sm:text-3xl">Essay Archive</h1>
        <p className="mt-1 text-sm text-muted">
          Browse, search, and manage your saved essays
        </p>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search essays..."
            className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-4 text-sm placeholder:text-muted/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-0"
          />
        </div>
        <button
          onClick={() => setShowFavorites(!showFavorites)}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
            showFavorites
              ? "bg-amber-50 text-amber-700 border border-amber-200"
              : "border border-border bg-card text-muted hover:text-foreground"
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={showFavorites ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.5} className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
          </svg>
          Favorites
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-6 shadow-card">
              <div className="skeleton mb-3 h-5 w-1/3" />
              <div className="skeleton mb-2 h-4 w-full" />
              <div className="skeleton h-4 w-2/3" />
            </div>
          ))}
        </div>
      ) : essays.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="mx-auto mb-4 h-12 w-12 text-muted/30">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
          </svg>
          <p className="font-serif text-lg font-medium text-muted/50">No essays found</p>
          <p className="mt-1 text-sm text-muted/40">
            {search || showFavorites
              ? "Try adjusting your search or filters"
              : "Saved essays will appear here. Save from the Writer after generating."}
          </p>
          {!search && !showFavorites && (
            <Link href="/" className="mt-4 inline-block rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover">
              Go to Writer
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {essays.map((essay) => (
            <div
              key={essay.id}
              className="group rounded-xl border border-border bg-card shadow-card transition-shadow duration-200 hover:shadow-hover"
            >
              <div className="p-4 sm:p-6">
                <div className="mb-2 flex items-start justify-between gap-3 sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <h3
                      className="cursor-pointer truncate font-serif text-lg font-semibold hover:text-primary"
                      onClick={() =>
                        setExpandedId(
                          expandedId === essay.id ? null : essay.id,
                        )
                      }
                    >
                      {essay.title}
                    </h3>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                      <span>{formatDate(essay.createdAt)}</span>
                      <span className="h-1 w-1 rounded-full bg-border" />
                      <span className="rounded bg-primary-light px-1.5 py-0.5 text-primary">
                        {essay.tone}
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() =>
                        toggleFavorite(essay.id, essay.isFavorite)
                      }
                      className="rounded-xl p-1.5 hover:bg-amber-50"
                      title={
                        essay.isFavorite
                          ? "Remove from favorites"
                          : "Add to favorites"
                      }
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill={essay.isFavorite ? "currentColor" : "none"}
                        stroke="currentColor"
                        strokeWidth={1.5}
                        className={`h-5 w-5 ${essay.isFavorite ? "text-amber-500" : "text-muted"}`}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
                        />
                      </svg>
                    </button>
                    <ExportMenu content={essay.content} title={essay.title} />
                    {deleteConfirm === essay.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => deleteEssay(essay.id)}
                          className="rounded-xl bg-danger px-2 py-1.5 text-xs font-medium text-white hover:bg-danger-hover"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="rounded-xl px-2 py-1.5 text-xs text-muted hover:bg-surface"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(essay.id)}
                        className="rounded-xl p-1.5 text-muted transition-opacity hover:bg-red-100 dark:hover:bg-red-900/40 hover:text-danger sm:opacity-0 sm:group-hover:opacity-100"
                        title="Delete essay"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                {expandedId === essay.id ? (
                  <div className="mt-4 whitespace-pre-wrap rounded-xl border border-border bg-surface p-4 text-sm leading-relaxed">
                    {essay.content}
                  </div>
                ) : (
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    {truncate(essay.content, 200)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
