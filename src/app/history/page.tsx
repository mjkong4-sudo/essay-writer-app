"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/Toast";
import { truncate } from "@/lib/utils";
import RichTextEditor from "@/components/RichTextEditor";
import ExportMenu from "@/components/ExportMenu";
import VersionHistory from "@/components/VersionHistory";
import SocialAdaptation from "@/components/SocialAdaptation";

interface Version {
  content: string;
  feedback: string;
  timestamp: Date;
}

interface HistoryProject {
  id: string;
  title: string;
  content: string;
  originalContent: string;
  tone: string;
  language: string;
  createdAt: string;
  versions: Version[];
  activeVersionIndex: number;
  isExpanded: boolean;
}

interface GroupedProjects {
  label: string;
  projects: HistoryProject[];
}

function parseTitle(essay: string): string {
  const match = essay.match(/^TITLE:\s*(.+)/m);
  return match ? match[1].trim() : "Untitled Essay";
}

function groupByDate(projects: HistoryProject[]): GroupedProjects[] {
  const groups: Record<string, HistoryProject[]> = {};

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  for (const project of projects) {
    const d = new Date(project.createdAt);
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
    groups[label].push(project);
  }

  return Object.entries(groups).map(([label, projects]) => ({
    label,
    projects,
  }));
}

export default function HistoryPage() {
  const [projects, setProjects] = useState<HistoryProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [refiningId, setRefiningId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchEntries = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const response = await fetch(`/api/history?${params}`);
      if (!response.ok) throw new Error();
      const entries = await response.json();
      setProjects(
        entries.map((e: { id: string; title: string; content: string; tone: string; language: string; createdAt: string }) => ({
          id: e.id,
          title: e.title,
          content: e.content,
          originalContent: e.content,
          tone: e.tone,
          language: e.language,
          createdAt: e.createdAt,
          versions: [{ content: e.content, feedback: "Initial generation", timestamp: new Date(e.createdAt) }],
          activeVersionIndex: 0,
          isExpanded: false,
        })),
      );
    } catch {
      toast("Failed to load history", "error");
    } finally {
      setLoading(false);
    }
  }, [search, toast]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const toggleExpand = useCallback((id: string) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isExpanded: !p.isExpanded } : p)),
    );
  }, []);

  const handleContentChange = useCallback((id: string, content: string) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, content } : p)),
    );
  }, []);

  const handleRefine = useCallback(
    async (id: string, feedback: string) => {
      const project = projects.find((p) => p.id === id);
      if (!project || !feedback.trim()) return;

      setRefiningId(id);
      try {
        const response = await fetch("/api/refine", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ essay: project.content, feedback }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Refinement failed");

        const refined = data.essay;
        const newTitle = parseTitle(refined);
        const newVersion: Version = { content: refined, feedback, timestamp: new Date() };

        setProjects((prev) =>
          prev.map((p) => {
            if (p.id !== id) return p;
            const versions = [...p.versions, newVersion];
            return {
              ...p,
              content: refined,
              title: newTitle,
              versions,
              activeVersionIndex: versions.length - 1,
            };
          }),
        );
        toast("Essay refined!", "success");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Refinement failed";
        toast(message, "error");
      } finally {
        setRefiningId(null);
      }
    },
    [projects, toast],
  );

  const handleVersionSelect = useCallback((id: string, index: number) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const version = p.versions[index];
        return {
          ...p,
          content: version.content,
          title: parseTitle(version.content),
          activeVersionIndex: index,
        };
      }),
    );
  }, []);

  const handleSave = useCallback(
    async (title: string, content: string) => {
      const response = await fetch("/api/essays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save");
      }
    },
    [],
  );

  const saveToArchive = async (project: HistoryProject) => {
    setSavingId(project.id);
    try {
      const response = await fetch("/api/essays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: project.title,
          content: project.content,
          tone: project.tone,
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

  const deleteEntry = async (id: string) => {
    try {
      const response = await fetch(`/api/history?id=${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error();
      setProjects((prev) => prev.filter((p) => p.id !== id));
      setDeleteConfirm(null);
      toast("Removed from history", "success");
    } catch {
      toast("Failed to delete", "error");
    }
  };

  const grouped = groupByDate(projects);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-12">
      <div className="mb-6 sm:mb-8">
        <h1 className="font-serif text-2xl font-bold sm:text-3xl">Generation History</h1>
        <p className="mt-1 text-sm text-muted">
          Every essay you generate is automatically saved here for 7 days.{" "}
          {projects.length} entr{projects.length === 1 ? "y" : "ies"} total.
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
            placeholder="Search history..."
            className="w-full rounded-md border border-border bg-white py-2.5 pl-10 pr-4 text-sm placeholder:text-muted/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-6 shadow-sm">
              <div className="skeleton mb-3 h-5 w-1/3" />
              <div className="skeleton mb-2 h-4 w-full" />
              <div className="skeleton h-4 w-2/3" />
            </div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-16 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="mx-auto mb-4 h-12 w-12 text-muted/30">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="font-serif text-lg font-medium text-muted/50">No history yet</p>
          <p className="mt-1 text-sm text-muted/40">
            {search ? "No matches found" : "Generated essays will automatically appear here"}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map((group) => (
            <div key={group.label}>
              <h2 className="mb-3 flex items-center gap-2 font-serif text-sm font-semibold text-muted">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
                {group.label}
                <span className="rounded-full bg-primary-light px-2 py-0.5 text-xs text-primary">
                  {group.projects.length}
                </span>
              </h2>

              <div className="space-y-4">
                {group.projects.map((project) => (
                  <article
                    key={project.id}
                    className="group overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-shadow hover:shadow-md"
                  >
                    {/* Header bar */}
                    <div className="flex items-center justify-between border-b border-border px-4 py-3">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-3.5 w-3.5 text-primary">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <h3
                            className="cursor-pointer truncate font-serif text-sm font-semibold hover:text-primary sm:text-base"
                            onClick={() => toggleExpand(project.id)}
                          >
                            {project.title}
                          </h3>
                          <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted sm:text-xs">
                            <span>
                              {new Date(project.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            <span className="h-1 w-1 rounded-full bg-border" />
                            <span className="rounded bg-primary-light px-1.5 py-0.5 text-primary">
                              {project.tone}
                            </span>
                            <span className="rounded bg-surface px-1.5 py-0.5">
                              {project.language}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          onClick={() => saveToArchive(project)}
                          disabled={savingId === project.id}
                          className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-primary hover:bg-primary-light disabled:opacity-50"
                          title="Save to Archive"
                        >
                          {savingId === project.id ? (
                            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-3.5 w-3.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25-2.25m-2.25 2.25V3m-4.5 15H5.625c-.621 0-1.125-.504-1.125-1.125v-1.5c0-.621.504-1.125 1.125-1.125h3.75m7.5 0h3.375c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125H14.25" />
                            </svg>
                          )}
                          <span className="hidden sm:inline">Archive</span>
                        </button>
                        <ExportMenu content={project.content} title={project.title} />
                        {deleteConfirm === project.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => deleteEntry(project.id)}
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
                            onClick={() => setDeleteConfirm(project.id)}
                            className="rounded-md p-1.5 text-muted transition-opacity hover:bg-red-50 hover:text-danger sm:opacity-0 sm:group-hover:opacity-100"
                            title="Remove from history"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={() => toggleExpand(project.id)}
                          className="rounded-md p-1.5 text-muted hover:bg-surface hover:text-foreground"
                          title={project.isExpanded ? "Collapse" : "Expand"}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`h-4 w-4 transition-transform ${project.isExpanded ? "rotate-180" : ""}`}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Collapsed preview */}
                    {!project.isExpanded && (
                      <div className="px-4 py-3">
                        <p className="line-clamp-3 text-sm leading-relaxed text-foreground/80">
                          {project.content.replace(/^TITLE:.*\n?/m, "").trim()}
                        </p>
                        <button
                          onClick={() => toggleExpand(project.id)}
                          className="mt-2 text-xs font-semibold text-primary hover:underline"
                        >
                          Read more & edit
                        </button>
                      </div>
                    )}

                    {/* Expanded workspace */}
                    {project.isExpanded && (
                      <div className="space-y-4 p-4 sm:p-5">
                        {project.versions.length > 1 && (
                          <VersionHistory
                            versions={project.versions}
                            activeIndex={project.activeVersionIndex}
                            onSelect={(index) => handleVersionSelect(project.id, index)}
                          />
                        )}

                        <RichTextEditor
                          content={project.content}
                          onChange={(content) => handleContentChange(project.id, content)}
                          onSave={handleSave}
                          onRefine={(feedback) => handleRefine(project.id, feedback)}
                          isRefining={refiningId === project.id}
                          versionLabel={
                            project.versions.length > 1
                              ? `v${project.activeVersionIndex + 1} of ${project.versions.length}`
                              : undefined
                          }
                        />

                        <div className="space-y-2 pt-1">
                          <h4 className="flex items-center gap-1.5 text-xs font-semibold text-muted">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-3.5 w-3.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
                            </svg>
                            Adapt for Social
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            <SocialAdaptation platform="substack" essayContent={project.content} />
                            <SocialAdaptation platform="instagram" essayContent={project.content} />
                            <SocialAdaptation platform="threads" essayContent={project.content} />
                          </div>
                        </div>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
