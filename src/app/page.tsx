"use client";

import { useState, useCallback, useEffect } from "react";
import ImageUpload from "@/components/ImageUpload";
import EssayGenerator, { type GeneratedEssay } from "@/components/EssayGenerator";
import RichTextEditor from "@/components/RichTextEditor";
import ExportMenu from "@/components/ExportMenu";
import VersionHistory from "@/components/VersionHistory";
import SocialAdaptation from "@/components/SocialAdaptation";
import { useToast } from "@/components/Toast";

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
}

function parseTitle(essay: string): string {
  const match = essay.match(/^TITLE:\s*(.+)/m);
  return match ? match[1].trim() : "Untitled Essay";
}

export default function Home() {
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<Map<number, string>>(new Map());
  const [additionalText, setAdditionalText] = useState("");
  const [projects, setProjects] = useState<EssayProject[]>([]);
  const [refiningProjectId, setRefiningProjectId] = useState<string | null>(null);
  const { toast } = useToast();

  const hasInput = imageFiles.length > 0 || additionalText.trim().length > 0;

  const handleImagesChanged = useCallback((files: File[]) => {
    setImageFiles(files);
    const previews = new Map<number, string>();
    files.forEach((file, i) => {
      previews.set(i, URL.createObjectURL(file));
    });
    setImagePreviews(previews);
  }, []);

  const saveToHistory = useCallback(async (title: string, content: string) => {
    try {
      await fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content }),
      });
    } catch {
      // Silent
    }
  }, []);

  const handleEssaysGenerated = useCallback(
    (results: GeneratedEssay[]) => {
      const newProjects: EssayProject[] = results.map((r, i) => {
        const title = parseTitle(r.essay);
        const label = r.imageIndex >= 0 ? `Image ${r.imageIndex + 1}` : "Text";
        const preview = r.imageIndex >= 0 ? imagePreviews.get(r.imageIndex) ?? null : null;
        return {
          id: `${Date.now()}-${i}`,
          label,
          imagePreview: preview,
          essay: r.essay,
          title,
          versions: [{ content: r.essay, feedback: "Initial generation", timestamp: new Date() }],
          activeVersionIndex: 0,
          isExpanded: i === 0,
        };
      });

      setProjects(newProjects);
      for (const p of newProjects) saveToHistory(p.title, p.essay);
    },
    [saveToHistory, imagePreviews],
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

  const handleContentChange = useCallback((projectId: string, content: string) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, essay: content } : p)),
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
      {/* Hero */}
      <div className="mb-8 text-center sm:mb-12">
        <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
          AI Essay Writer
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted sm:mt-4 sm:text-lg">
          Upload images or enter text, choose your style, and let AI craft
          polished essays.
        </p>
      </div>

      <div className="space-y-6 sm:space-y-8">
        {/* Step 1 */}
        <section>
          <div className="mb-3 flex items-center gap-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white sm:h-7 sm:w-7 sm:text-xs">1</span>
            <h2 className="font-serif text-lg font-semibold sm:text-xl">Source Material</h2>
          </div>
          <div className="rounded-lg border border-border bg-card p-4 shadow-sm sm:p-6">
            <div className="space-y-4">
              <ImageUpload onImagesChanged={handleImagesChanged} />

              <div className="relative flex items-center">
                <div className="flex-1 border-t border-border" />
                <span className="mx-4 text-xs font-medium text-muted">and / or</span>
                <div className="flex-1 border-t border-border" />
              </div>

              <textarea
                value={additionalText}
                onChange={(e) => setAdditionalText(e.target.value)}
                placeholder="Type or paste text here..."
                className="h-24 w-full resize-none rounded-md border border-border bg-surface p-3 text-sm leading-relaxed text-foreground placeholder:text-muted/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 sm:h-28 sm:p-4"
              />
            </div>
          </div>
        </section>

        {/* Step 2 */}
        <section>
          <div className="mb-3 flex items-center gap-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white sm:h-7 sm:w-7 sm:text-xs">2</span>
            <h2 className="font-serif text-lg font-semibold sm:text-xl">Essay Settings</h2>
          </div>
          <EssayGenerator
            imageFiles={imageFiles}
            additionalText={additionalText}
            onEssaysGenerated={handleEssaysGenerated}
          />
        </section>

        {/* Step 3: Instagram-style feed */}
        {projects.length > 0 && (
          <section className="animate-[fadeIn_0.3s_ease-out]">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white sm:h-7 sm:w-7 sm:text-xs">3</span>
              <h2 className="font-serif text-lg font-semibold sm:text-xl">
                {projects.length === 1 ? "Your Essay" : `Your Essays (${projects.length})`}
              </h2>
            </div>

            <div className="space-y-6">
              {projects.map((project) => (
                <article
                  key={project.id}
                  className="overflow-hidden rounded-lg border border-border bg-card shadow-sm"
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

                  {/* Post header bar */}
                  <div className="flex items-center justify-between border-b border-border px-4 py-3">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {project.label === "Text" ? "T" : project.label.replace("Image ", "#")}
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate font-serif text-sm font-semibold sm:text-base">
                          {project.title}
                        </h3>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <ExportMenu content={project.essay} title={project.title} />
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
                        Read more & edit
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
                        onChange={(content) => handleContentChange(project.id, content)}
                        onSave={handleSave}
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
                          Adapt for Social
                        </h4>
                        <div className="flex flex-wrap gap-2">
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
      </div>
    </div>
  );
}
