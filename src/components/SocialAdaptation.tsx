"use client";

import { useState, useCallback } from "react";
import { wordCount } from "@/lib/utils";
import { useToast } from "./Toast";

interface Version {
  content: string;
  feedback: string;
  timestamp: Date;
}

interface Props {
  platform: "substack" | "instagram" | "threads" | "summary";
  essayContent: string;
}

const PLATFORM_META = {
  substack: {
    label: "Substack",
    color: "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100",
    expandedColor: "border-orange-200 bg-orange-50/50",
    accentColor: "text-orange-700",
    btnColor: "bg-orange-600 text-white hover:bg-orange-700",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
        <path d="M22.539 8.242H1.46V5.406h21.08v2.836zM1.46 10.812V24L12 18.11 22.54 24V10.812H1.46zM22.54 0H1.46v2.836h21.08V0z" />
      </svg>
    ),
  },
  instagram: {
    label: "Instagram",
    color: "bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-100",
    expandedColor: "border-pink-200 bg-pink-50/50",
    accentColor: "text-pink-700",
    btnColor: "bg-pink-600 text-white hover:bg-pink-700",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </svg>
    ),
  },
  threads: {
    label: "Threads",
    color: "bg-stone-100 text-stone-700 border-stone-200 hover:bg-stone-200",
    expandedColor: "border-stone-200 bg-stone-50",
    accentColor: "text-stone-700",
    btnColor: "bg-stone-800 text-white hover:bg-stone-900",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
        <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.592 12c.025 3.086.716 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.343-.783-.98-1.404-1.81-1.817a8.46 8.46 0 01-.345 2.831c-.378 1.118-1.04 2.005-1.96 2.634-1.076.738-2.456 1.1-4.103 1.074-1.89-.029-3.41-.6-4.52-1.701-1.05-1.04-1.604-2.436-1.604-4.04 0-1.727.592-3.164 1.713-4.157 1.225-1.085 2.967-1.66 5.032-1.66l.054.001c1.156.009 2.229.2 3.177.562.016-.356.017-.714-.003-1.073-.055-1.032-.392-1.783-1.003-2.232-.666-.488-1.685-.74-3.03-.749h-.04c-1.1.01-1.99.243-2.643.695-.556.384-.912.911-1.08 1.56l-2.048-.445c.26-1.044.846-1.916 1.728-2.56 1.042-.762 2.378-1.153 3.97-1.163h.07c1.837.014 3.253.427 4.208 1.23.986.83 1.514 2.048 1.573 3.625.018.476.013.96-.015 1.437a8.19 8.19 0 011.607 1.2c.942.931 1.559 2.178 1.569 3.926.009 1.503-.396 3.236-1.652 4.696-1.846 2.143-4.268 2.996-7.603 3.012zm-.657-9.04c-1.566-.01-2.828.39-3.652 1.121-.732.65-1.1 1.524-1.1 2.6 0 1.06.377 1.923 1.09 2.49.769.612 1.858.922 3.238.944 2.023.032 3.402-.615 4.217-1.978.473-.79.612-1.786.42-2.923a6.37 6.37 0 00-4.213-2.254z" />
      </svg>
    ),
  },
  summary: {
    label: "Summary",
    color: "bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100",
    expandedColor: "border-violet-200 bg-violet-50/50",
    accentColor: "text-violet-700",
    btnColor: "bg-violet-600 text-white hover:bg-violet-700",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
      </svg>
    ),
  },
};

export default function SocialAdaptation({ platform, essayContent }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [content, setContent] = useState("");
  const [versions, setVersions] = useState<Version[]>([]);
  const [activeVersionIndex, setActiveVersionIndex] = useState(0);
  const [feedback, setFeedback] = useState("");
  const { toast } = useToast();

  const meta = PLATFORM_META[platform];

  const generate = useCallback(async () => {
    setIsGenerating(true);
    try {
      const endpoint = platform === "summary" ? "/api/summarize" : "/api/adapt";
      const body =
        platform === "summary"
          ? { essay: essayContent }
          : { essay: essayContent, platform };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      const generatedContent = data.content || data.summary;
      setContent(generatedContent);
      setVersions([{ content: generatedContent, feedback: "Initial adaptation", timestamp: new Date() }]);
      setActiveVersionIndex(0);
      setIsOpen(true);
      toast(`${meta.label} version created!`, "success");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Adaptation failed";
      toast(msg, "error");
    } finally {
      setIsGenerating(false);
    }
  }, [essayContent, platform, meta.label, toast]);

  const refine = useCallback(async () => {
    if (!feedback.trim() || !content.trim()) return;
    setIsRefining(true);
    try {
      const response = await fetch("/api/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ essay: content, feedback }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setContent(data.essay);
      const newVersion: Version = { content: data.essay, feedback, timestamp: new Date() };
      setVersions((prev) => {
        const next = [...prev, newVersion];
        setActiveVersionIndex(next.length - 1);
        return next;
      });
      setFeedback("");
      toast(`${meta.label} version refined!`, "success");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Refinement failed";
      toast(msg, "error");
    } finally {
      setIsRefining(false);
    }
  }, [content, feedback, meta.label, toast]);

  const saveToArchive = useCallback(async () => {
    if (!content.trim()) return;
    setIsSaving(true);
    try {
      const title = `${meta.label}: ${content.slice(0, 50).replace(/\n/g, " ")}...`;
      const response = await fetch("/api/essays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content }),
      });
      if (!response.ok) throw new Error();
      toast(`${meta.label} content saved to Archive!`, "success");
    } catch {
      toast("Failed to save to archive", "error");
    } finally {
      setIsSaving(false);
    }
  }, [content, meta.label, toast]);

  const selectVersion = (index: number) => {
    setActiveVersionIndex(index);
    setContent(versions[index].content);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(content);
    toast("Copied to clipboard!", "success");
  };

  if (!isOpen && versions.length === 0) {
    return (
      <button
        onClick={generate}
        disabled={isGenerating}
        className={`flex items-center gap-1.5 rounded-md border px-4 py-2 text-sm font-medium shadow-sm disabled:cursor-not-allowed disabled:opacity-50 ${meta.color}`}
      >
        {isGenerating ? (
          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          meta.icon
        )}
        {isGenerating ? "Generating..." : meta.label}
      </button>
    );
  }

  return (
    <div className={`rounded-lg border p-4 shadow-sm ${meta.expandedColor}`}>
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 font-semibold ${meta.accentColor}`}
        >
          {meta.icon}
          {meta.label}
          {versions.length > 1 && (
            <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold shadow-sm">
              v{activeVersionIndex + 1}/{versions.length}
            </span>
          )}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
        <div className="flex items-center gap-1.5">
          <button
            onClick={copyToClipboard}
            className="rounded-md px-2.5 py-1 text-xs font-medium text-muted hover:bg-white hover:text-foreground"
          >
            Copy
          </button>
          <button
            onClick={saveToArchive}
            disabled={isSaving}
            className="rounded-md px-2.5 py-1 text-xs font-medium text-muted hover:bg-white hover:text-foreground disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Archive"}
          </button>
          <button
            onClick={generate}
            disabled={isGenerating}
            className="rounded-md px-2.5 py-1 text-xs font-medium text-muted hover:bg-white hover:text-foreground disabled:opacity-50"
          >
            {isGenerating ? "..." : "Regenerate"}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="space-y-3">
          {versions.length > 1 && (
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {versions.map((v, i) => (
                <button
                  key={i}
                  onClick={() => selectVersion(i)}
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    i === activeVersionIndex
                      ? "bg-white text-foreground shadow-sm"
                      : "text-muted hover:bg-white/60"
                  }`}
                  title={v.feedback}
                >
                  {i === 0 ? "Original" : `v${i + 1}`}
                </button>
              ))}
            </div>
          )}

          {/* Read-only content display */}
          <div className="min-h-[120px] whitespace-pre-wrap rounded-md border border-border bg-white p-3 text-sm leading-relaxed text-foreground">
            {content}
          </div>

          <div className="flex items-center justify-between text-[11px] text-muted">
            <span>{wordCount(content)} words &middot; {content.length} chars</span>
            {platform === "instagram" && (
              <span className={content.length > 2200 ? "font-bold text-danger" : ""}>
                {content.length > 2200 ? `${content.length - 2200} over limit` : `${2200 - content.length} chars remaining`}
              </span>
            )}
            {platform === "threads" && (
              <span>
                {content.split("---").length > 1
                  ? `${content.split("---").length} posts in thread`
                  : "Single post"}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && feedback.trim() && !isRefining) refine();
              }}
              placeholder="Give feedback to improve this version..."
              disabled={isRefining}
              className="flex-1 rounded-md border border-border bg-white px-3 py-2 text-sm text-foreground placeholder:text-muted/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 disabled:opacity-50"
            />
            <button
              onClick={refine}
              disabled={isRefining || !feedback.trim()}
              className={`flex w-full shrink-0 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto ${meta.btnColor}`}
            >
              {isRefining ? (
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-3.5 w-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                </svg>
              )}
              Refine
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
