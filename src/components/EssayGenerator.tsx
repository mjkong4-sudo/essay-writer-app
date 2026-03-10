"use client";

import { useState } from "react";
import { useToast } from "./Toast";

export interface GeneratedEssay {
  essay: string;
  imageIndex: number;
}

interface Props {
  imageFiles: File[];
  additionalText: string;
  onEssaysGenerated: (essays: GeneratedEssay[]) => void;
}

const TONE_PRESETS = [
  { label: "Academic", value: "formal academic style", icon: "🎓" },
  { label: "Casual Blog", value: "casual and friendly blog post", icon: "💬" },
  { label: "Business", value: "professional business report", icon: "📊" },
  { label: "Creative", value: "creative narrative storytelling", icon: "🎨" },
  { label: "Persuasive", value: "persuasive argumentative", icon: "💡" },
  { label: "Journalistic", value: "objective journalistic reporting", icon: "📰" },
];

const LANGUAGE_OPTIONS = [
  { label: "English", value: "English" },
  { label: "Korean", value: "Korean" },
];

type MultiImageMode = "combine" | "multiple";

const USER_FACING_ERROR = "We couldn't generate the essay. Check your connection and try again.";

export default function EssayGenerator({ imageFiles, additionalText, onEssaysGenerated }: Props) {
  const [toneInput, setToneInput] = useState("formal academic style");
  const [language, setLanguage] = useState("English");
  const [multiImageMode, setMultiImageMode] = useState<MultiImageMode>("multiple");
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [generationError, setGenerationError] = useState<string | null>(null);
  const { toast } = useToast();

  const hasImages = imageFiles.length > 0;
  const hasText = additionalText.trim().length > 0;
  const hasInput = hasImages || hasText;
  const useCombineMode = hasImages && imageFiles.length > 1 && multiImageMode === "combine";
  const totalJobs = hasImages
    ? useCombineMode
      ? 1
      : imageFiles.length
    : hasText
      ? 1
      : 0;

  const generateEssays = async () => {
    if (!hasInput) {
      toast("Please upload an image or enter some text first", "error");
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);
    setProgress({ done: 0, total: totalJobs });

    try {
      if (hasImages && useCombineMode) {
        const formData = new FormData();
        imageFiles.forEach((file) => formData.append("image", file));
        if (hasText) formData.append("text", additionalText.trim());
        formData.append("tone", toneInput);
        formData.append("language", language);
        formData.append("mode", "combine");

        const response = await fetch("/api/generate", { method: "POST", body: formData });
        const data = await response.json();
        setProgress({ done: 1, total: 1 });
        if (!response.ok) throw new Error(data.error || "Generation failed");
        onEssaysGenerated([{ essay: data.essay as string, imageIndex: -1 }]);
        toast("Essay generated!", "success");
      } else if (hasImages) {
        const promises = imageFiles.map(async (file, index) => {
          const formData = new FormData();
          formData.append("image", file);
          if (hasText) formData.append("text", additionalText.trim());
          formData.append("tone", toneInput);
          formData.append("language", language);

          const response = await fetch("/api/generate", { method: "POST", body: formData });
          const data = await response.json();
          setProgress((p) => ({ ...p, done: p.done + 1 }));
          if (!response.ok) throw new Error(data.error || `Failed for image ${index + 1}`);
          return { essay: data.essay as string, imageIndex: index };
        });

        const results = await Promise.allSettled(promises);
        const successes: GeneratedEssay[] = [];
        let failures = 0;
        for (const result of results) {
          if (result.status === "fulfilled") successes.push(result.value);
          else failures++;
        }
        if (successes.length > 0) {
          onEssaysGenerated(successes);
          const msg = successes.length === 1 ? "Essay generated!" : `${successes.length} essays generated!`;
          toast(failures > 0 ? `${msg} (${failures} failed)` : msg, "success");
        } else {
          setGenerationError(USER_FACING_ERROR);
          toast("All essay generations failed", "error");
        }
      } else {
        const formData = new FormData();
        formData.append("text", additionalText.trim());
        formData.append("tone", toneInput);
        formData.append("language", language);

        const response = await fetch("/api/generate", {
          method: "POST",
          body: formData,
        });
        const data = await response.json();

        if (!response.ok) throw new Error(data.error || "Failed to generate essay");

        setProgress({ done: 1, total: 1 });
        onEssaysGenerated([{ essay: data.essay, imageIndex: -1 }]);
        toast("Essay generated!", "success");
      }
    } catch (error) {
      setGenerationError(USER_FACING_ERROR);
      const message =
        error instanceof Error ? error.message : "Generation failed";
      toast(message, "error");
    } finally {
      setIsGenerating(false);
      setProgress({ done: 0, total: 0 });
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card shadow-card p-4 sm:p-6">
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-muted">
            Output Language
          </label>
          <div className="flex gap-2">
            {LANGUAGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setLanguage(opt.value)}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors duration-200 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-0 ${
                  language === opt.value
                    ? "bg-primary-light text-primary ring-1 ring-primary/20"
                    : "border border-border bg-surface text-muted hover:border-primary/30 hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-muted">
            Writing Style
          </label>
          <div className="flex flex-wrap gap-2">
            {TONE_PRESETS.map((preset) => (
              <button
                key={preset.value}
                onClick={() => setToneInput(preset.value)}
                className={`rounded-xl px-3 py-1.5 text-sm font-medium transition-colors duration-200 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-0 ${
                  toneInput === preset.value
                    ? "bg-primary-light text-primary ring-1 ring-primary/20"
                    : "border border-border bg-surface text-muted hover:border-primary/30 hover:text-foreground"
                }`}
              >
                <span className="mr-1">{preset.icon}</span>
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-muted">
            Or describe your own style
          </label>
          <input
            type="text"
            value={toneInput}
            onChange={(e) => setToneInput(e.target.value)}
            placeholder="e.g., humorous yet informative..."
            className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-foreground placeholder:text-muted/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-0"
          />
        </div>

        {imageFiles.length > 1 && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted">
              Multiple images
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMultiImageMode("combine")}
                className={`rounded-xl px-3 py-1.5 text-sm font-medium transition-colors duration-200 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-0 ${
                  multiImageMode === "combine"
                    ? "bg-primary-light text-primary ring-1 ring-primary/20"
                    : "border border-border bg-surface text-muted hover:border-primary/30 hover:text-foreground"
                }`}
              >
                One essay (combine all)
              </button>
              <button
                type="button"
                onClick={() => setMultiImageMode("multiple")}
                className={`rounded-xl px-3 py-1.5 text-sm font-medium transition-colors duration-200 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-0 ${
                  multiImageMode === "multiple"
                    ? "bg-primary-light text-primary ring-1 ring-primary/20"
                    : "border border-border bg-surface text-muted hover:border-primary/30 hover:text-foreground"
                }`}
              >
                One essay per image
              </button>
            </div>
          </div>
        )}

        {generationError && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm">
            <p className="text-danger">{generationError}</p>
            <button
              type="button"
              onClick={() => {
                setGenerationError(null);
                generateEssays();
              }}
              className="shrink-0 rounded-xl bg-danger px-3 py-1.5 text-xs font-medium text-white hover:bg-danger-hover focus:outline-none focus:ring-2 focus:ring-danger/30"
            >
              Retry
            </button>
          </div>
        )}

        {progress.total > 1 && isGenerating && (
          <div className="space-y-1">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${(progress.done / progress.total) * 100}%` }}
              />
            </div>
            <p className="text-xs text-muted">
              Generating essay {progress.done + 1} of {progress.total}…
            </p>
          </div>
        )}

        <button
          data-generate-btn
          onClick={generateEssays}
          disabled={isGenerating || !hasInput}
          title={!hasInput ? "Add an image or some text first" : undefined}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-card transition-transform duration-150 hover:bg-primary-hover active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isGenerating ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              {progress.total > 1
                ? `Generating ${progress.done + 1} of ${progress.total}...`
                : "AI is writing your essay..."}
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              {totalJobs > 1 ? `Generate ${totalJobs} Essays` : "Generate Essay"}
              <span className="ml-auto hidden text-xs opacity-60 sm:inline">Ctrl+Enter</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
