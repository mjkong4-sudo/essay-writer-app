"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import ImageUpload from "@/components/ImageUpload";
import EssayGenerator, { type GeneratedEssay } from "@/components/EssayGenerator";
import RichTextEditor from "@/components/RichTextEditor";
import ExportMenu from "@/components/ExportMenu";
import VersionHistory from "@/components/VersionHistory";
import SocialAdaptation from "@/components/SocialAdaptation";
import VoiceInputButton from "@/components/VoiceInputButton";
import VoiceOutputButton from "@/components/VoiceOutputButton";
import DictionaryDrawer from "@/components/DictionaryDrawer";
import { useToast } from "@/components/Toast";
import { wordCount } from "@/lib/utils";

const GUEST_HINT_KEY = "thinkdraft-guest-hint-dismissed";

interface Version {
  content: string;
  feedback: string;
  timestamp: Date;
}

interface EssayProject {
  id: string;
  label: string;
  imagePreview: string | null;
  essay: string;
  title: string;
  versions: Version[];
  activeVersionIndex: number;
  isExpanded: boolean;
  highlights: string[];
  createdAt: Date;
}

function parseTitle(essay: string): string {
  const match = essay.match(/^TITLE:\s*(.+)/m);
  return match ? match[1].trim() : "Untitled Essay";
}

export default function Home() {
  const { data: session, status } = useSession();
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<Map<number, string>>(new Map());
  const [additionalText, setAdditionalText] = useState("");
  const [projects, setProjects] = useState<EssayProject[]>([]);
  const [refiningProjectId, setRefiningProjectId] = useState<string | null>(null);
  const [savedToArchiveIds, setSavedToArchiveIds] = useState<Set<string>>(new Set());
  const [guestHintDismissed, setGuestHintDismissed] = useState(false);
  const [dictionaryDrawerOpen, setDictionaryDrawerOpen] = useState(false);
  const archivedByProjectRef = useRef<Set<string>>(new Set());
  const { toast } = useToast();

  const hasInput = imageFiles.length > 0 || additionalText.trim().length > 0;
  const showGuestHint = status === "unauthenticated" && !guestHintDismissed;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(GUEST_HINT_KEY) === "1") setGuestHintDismissed(true);
  }, []);

  const dismissGuestHint = useCallback(() => {
    setGuestHintDismissed(true);
    if (typeof window !== "undefined") localStorage.setItem(GUEST_HINT_KEY, "1");
  }, []);

  const handleImagesChanged = useCallback((files: File[]) => {
    setImageFiles(files);
    const previews = new Map<number, string>();
    files.forEach((file, i) => {
      previews.set(i, URL.createObjectURL(file));
    });
    setImagePreviews(previews);
  }, []);

  const fileToBase64 = useCallback((file: File): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      const img = new Image();
      img.onload = () => {
        const MAX = 600;
        let w = img.width;
        let h = img.height;
        if (w > MAX || h > MAX) {
          const ratio = Math.min(MAX / w, MAX / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.src = URL.createObjectURL(file);
    });
  }, []);

  const saveToHistory = useCallback(async (title: string, content: string, imageData?: string) => {
    try {
      await fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, imageData }),
      });
    } catch {
      // Silent
    }
  }, []);

  const handleEssaysGenerated = useCallback(
    (results: GeneratedEssay[]) => {
      const newProjects: EssayProject[] = results.map((r, i) => {
        const isRefined = r.isRefined === true;
        const title = isRefined ? "Refined" : parseTitle(r.essay);
        const label = isRefined ? "Refined" : r.imageIndex >= 0 ? `Image ${r.imageIndex + 1}` : "Text";
        const preview = r.imageIndex >= 0 ? imagePreviews.get(r.imageIndex) ?? null : null;
        return {
          id: `${Date.now()}-${i}-${r.imageIndex}`,
          label,
          imagePreview: preview,
          essay: r.essay,
          title,
          versions: [{ content: r.essay, feedback: isRefined ? "Refined" : "Initial generation", timestamp: new Date() }],
          activeVersionIndex: 0,
          isExpanded: false,
          highlights: [],
          createdAt: new Date(),
        };
      });

      setProjects((prev) => [...newProjects, ...prev]);

      (async () => {
        for (const r of results) {
          const title = r.isRefined ? "Refined" : parseTitle(r.essay);
          let imgData: string | undefined;
          if (r.imageIndex >= 0 && imageFiles[r.imageIndex]) {
            try {
              imgData = await fileToBase64(imageFiles[r.imageIndex]);
            } catch { /* skip */ }
          }
          saveToHistory(title, r.essay, imgData);
        }
      })();
    },
    [saveToHistory, imagePreviews, imageFiles, fileToBase64],
  );

  const toggleExpand = useCallback((projectId: string) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId ? { ...p, isExpanded: !p.isExpanded } : p,
      ),
    );
  }, []);

  const handleRefine = useCallback(
    async (projectId: string, feedback: string) => {
      const project = projects.find((p) => p.id === projectId);
      if (!project || !feedback.trim()) return;

      setRefiningProjectId(projectId);
      try {
        const response = await fetch("/api/refine", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ essay: project.essay, feedback }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Refinement failed");

        const refined = data.essay;
        const newTitle = parseTitle(refined);
        const newVersion: Version = { content: refined, feedback, timestamp: new Date() };

        setProjects((prev) =>
          prev.map((p) => {
            if (p.id !== projectId) return p;
            const versions = [...p.versions, newVersion];
            return {
              ...p,
              essay: refined,
              title: newTitle,
              versions,
              activeVersionIndex: versions.length - 1,
            };
          }),
        );

        saveToHistory(newTitle, refined);
        toast("Essay refined!", "success");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Refinement failed";
        toast(message, "error");
      } finally {
        setRefiningProjectId(null);
      }
    },
    [projects, toast, saveToHistory],
  );

  const handleVersionSelect = useCallback((projectId: string, index: number) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== projectId) return p;
        const version = p.versions[index];
        return {
          ...p,
          essay: version.content,
          title: parseTitle(version.content),
          activeVersionIndex: index,
        };
      }),
    );
  }, []);

  const handleHighlight = useCallback(async (projectId: string, text: string) => {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;
    try {
      const response = await fetch("/api/highlights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          essayTitle: project.title,
          sourceId: project.id,
          essayContent: project.essay,
        }),
      });
      if (!response.ok) throw new Error();
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, highlights: [...p.highlights, text] } : p)),
      );
      if (!archivedByProjectRef.current.has(projectId)) {
        try {
          await fetch("/api/essays", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: project.title, content: project.essay }),
          });
          archivedByProjectRef.current.add(projectId);
          setSavedToArchiveIds((prev) => new Set(prev).add(projectId));
          toast("Essay saved to Archive so you can find it anytime", "success");
        } catch {
          // Archive is best-effort
        }
      }
    } catch {
      toast("Failed to save highlight", "error");
    }
  }, [projects, toast]);

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

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && hasInput) {
        const btn = document.querySelector("[data-generate-btn]") as HTMLButtonElement;
        btn?.click();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [hasInput]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-12">
      {/* Guest hint */}
      {showGuestHint && (
        <div className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-primary/20 bg-primary-light/50 px-4 py-3 text-sm">
          <p className="text-foreground/90">
            Sign in to sync essays across devices and keep your dictionary forever.
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/login"
              className="rounded-xl bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-hover"
            >
              Sign in
            </Link>
            <button
              type="button"
              onClick={dismissGuestHint}
              className="rounded-xl p-1.5 text-muted hover:bg-primary/10 hover:text-foreground"
              aria-label="Dismiss"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Hero */}
      <div className="mb-8 text-center sm:mb-12">
        <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
          ThinkDraft
        </h1>
        <p className="mx-auto mt-2 font-serif text-sm italic text-primary sm:text-base">
          Think it. Draft it.
        </p>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted sm:mt-4 sm:text-lg">
          Upload images or enter text, choose your style, and let AI craft
          polished essays.
        </p>
        <p className="mx-auto mt-2 max-w-2xl text-xs text-muted/80 sm:text-sm">
          Generate essays from images or notes, look up words, and export to PDF or Word.
        </p>
      </div>

      <div className="space-y-6 sm:space-y-8">
        {/* Step 1 */}
        <section>
          <div className="mb-3 flex items-center gap-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white shadow-card sm:h-7 sm:w-7 sm:text-xs">1</span>
            <h2 className="font-serif text-lg font-semibold sm:text-xl">Source Material</h2>
          </div>
          <div className="rounded-xl border border-border bg-card/95 shadow-card backdrop-blur-sm p-4 sm:p-6">
            <div className="space-y-4">
              <ImageUpload onImagesChanged={handleImagesChanged} />

              <div className="relative flex items-center">
                <div className="flex-1 border-t border-border" />
                <span className="mx-4 text-xs font-medium text-muted">and / or</span>
                <div className="flex-1 border-t border-border" />
              </div>

              <div className="flex gap-2">
                <textarea
                  value={additionalText}
                  onChange={(e) => setAdditionalText(e.target.value)}
                  placeholder="Type or paste text here..."
                  className="h-24 flex-1 resize-none rounded-xl border border-border bg-surface p-3 text-sm leading-relaxed text-foreground placeholder:text-muted/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-0 sm:h-28 sm:p-4"
                />
                <VoiceInputButton
                  onText={(text) => setAdditionalText((prev) => (prev ? `${prev} ${text}` : text))}
                  className="shrink-0 self-end"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Step 2 */}
        <section>
          <div className="mb-3 flex items-center gap-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white shadow-card sm:h-7 sm:w-7 sm:text-xs">2</span>
            <h2 className="font-serif text-lg font-semibold sm:text-xl">Essay Settings</h2>
          </div>
          <EssayGenerator
            imageFiles={imageFiles}
            additionalText={additionalText}
            onEssaysGenerated={handleEssaysGenerated}
          />
        </section>

        {/* Step 3: placeholder when no essays yet */}
        {projects.length === 0 && (
          <section>
            <div className="mb-3 flex items-center gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-dashed border-border text-[10px] font-bold text-muted sm:h-7 sm:w-7 sm:text-xs">3</span>
              <h2 className="font-serif text-lg font-semibold text-muted sm:text-xl">Your Essays</h2>
            </div>
            <div className="rounded-xl border border-dashed border-border bg-surface/30 py-12 text-center">
              <p className="text-sm font-medium text-muted">
                Your essays will appear here after you generate.
              </p>
              <p className="mt-1 text-xs text-muted/80">
                Drop an image or type something above, then click Generate essay or Refine in English (refined text only, no essay).
              </p>
            </div>
          </section>
        )}

        {/* Step 3: Instagram-style feed */}
        {projects.length > 0 && (
          <section className="animate-[fadeIn_0.3s_ease-out]">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white shadow-card sm:h-7 sm:w-7 sm:text-xs">3</span>
              <h2 className="font-serif text-lg font-semibold sm:text-xl">
                {projects.length === 1 ? "Your Essay" : `Your Essays (${projects.length})`}
              </h2>
            </div>

            <div className="space-y-6">
              {projects.map((project) => (
                <article
                  key={project.id}
                  className="overflow-hidden rounded-xl border border-border bg-card/95 shadow-card backdrop-blur-sm transition-shadow duration-200 hover:shadow-hover"
                >
                  {/* Image header (Instagram-style) */}
                  {project.imagePreview && (
                    <div className="bg-surface">
                      <img
                        src={project.imagePreview}
                        alt={project.label}
                        className="w-full object-contain"
                        style={{ maxHeight: "400px" }}
                      />
                    </div>
                  )}

                  {/* Post header bar (SNS-style) */}
                  <div className="flex items-center justify-between border-b border-border px-4 py-3">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {project.label === "Refined" ? "R" : project.label === "Text" ? "T" : project.label.replace("Image ", "#")}
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate font-serif text-sm font-semibold sm:text-base">
                          {project.title}
                        </h3>
                        <p className="text-[10px] text-muted">
                          {project.label}
                          {" · "}
                          {(() => {
                            const sec = (Date.now() - project.createdAt.getTime()) / 1000;
                            if (sec < 60) return "Just now";
                            if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
                            return project.createdAt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
                          })()}
                          {" · "}
                          {wordCount(project.essay)} words
                          {wordCount(project.essay) > 0 && (
                            <> (~{Math.max(1, Math.ceil(wordCount(project.essay) / 200))} min read)</>
                          )}
                        </p>
                        {savedToArchiveIds.has(project.id) && (
                          <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-medium text-primary">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-3 w-3">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            In archive
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        onClick={() => {
                          setDictionaryDrawerOpen(true);
                          toast("Dictionary opened", "success");
                        }}
                        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl p-1.5 text-muted transition-colors hover:bg-surface hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                        title="Open dictionary"
                        aria-label="Open dictionary"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                        </svg>
                      </button>
                      <VoiceOutputButton content={project.essay} />
                      <ExportMenu content={project.essay} title={project.title} />
                      <button
                        onClick={() => toggleExpand(project.id)}
                        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl p-1.5 text-muted transition-colors hover:bg-surface hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                        title={project.isExpanded ? "Collapse" : "Expand"}
                        aria-label={project.isExpanded ? "Collapse" : "Expand"}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`h-4 w-4 transition-transform ${project.isExpanded ? "rotate-180" : ""}`}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Essay preview (always visible) */}
                  {!project.isExpanded && (
                    <div className="px-4 py-3">
                      <p className="line-clamp-3 text-sm leading-relaxed text-foreground/80">
                        {project.essay.replace(/^TITLE:.*\n?/m, "").trim()}
                      </p>
                      <button
                        onClick={() => toggleExpand(project.id)}
                        className="mt-2 text-xs font-semibold text-primary hover:underline"
                      >
                        Read more
                      </button>
                    </div>
                  )}

                  {/* Expanded content */}
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
                        content={project.essay}
                        highlights={project.highlights}
                        onHighlight={(text) => handleHighlight(project.id, text)}
                        onSave={handleSave}
                        onSaveSuccess={() => setSavedToArchiveIds((prev) => new Set(prev).add(project.id))}
                        onRefine={(feedback) => handleRefine(project.id, feedback)}
                        isRefining={refiningProjectId === project.id}
                        versionLabel={
                          project.versions.length > 1
                            ? `v${project.activeVersionIndex + 1} of ${project.versions.length}`
                            : undefined
                        }
                      />

                      {/* Social adaptations */}
                      <div className="space-y-2 pt-1">
                        <h4 className="flex items-center gap-1.5 text-xs font-semibold text-muted">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-3.5 w-3.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
                          </svg>
                          Summarize & Adapt
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          <SocialAdaptation platform="summary" essayContent={project.essay} />
                          <SocialAdaptation platform="substack" essayContent={project.essay} />
                          <SocialAdaptation platform="instagram" essayContent={project.essay} />
                          <SocialAdaptation platform="threads" essayContent={project.essay} />
                        </div>
                      </div>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}

        <DictionaryDrawer
          open={dictionaryDrawerOpen}
          onClose={() => setDictionaryDrawerOpen(false)}
        />
      </div>
    </div>
  );
}
