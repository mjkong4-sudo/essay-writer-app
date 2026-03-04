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

export default function EssayGenerator({ imageFiles, additionalText, onEssaysGenerated }: Props) {
  const [toneInput, setToneInput] = useState("formal academic style");
  const [language, setLanguage] = useState("English");
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const { toast } = useToast();

  const hasImages = imageFiles.length > 0;
  const hasText = additionalText.trim().length > 0;
  const hasInput = hasImages || hasText;
  const totalJobs = hasImages ? imageFiles.length : hasText ? 1 : 0;

  const generateEssays = async () => {
    if (!hasInput) {
      toast("Please upload an image or enter some text first", "error");
      return;
    }

    setIsGenerating(true);
    setProgress({ done: 0, total: totalJobs });

    try {
      if (hasImages) {
        const promises = imageFiles.map(async (file, index) => {
          const formData = new FormData();
          formData.append("image", file);
          if (hasText) formData.append("text", additionalText.trim());
          formData.append("tone", toneInput);
          formData.append("language", language);

          const response = await fetch("/api/generate", {
            method: "POST",
            body: formData,
          });
          const data = await response.json();

          setProgress((p) => ({ ...p, done: p.done + 1 }));

          if (!response.ok) throw new Error(data.error || `Failed for image ${index + 1}`);
          return { essay: data.essay as string, imageIndex: index };
        });

        const results = await Promise.allSettled(promises);
        const successes: GeneratedEssay[] = [];
        let failures = 0;

        for (const result of results) {
          if (result.status === "fulfilled") {
            successes.push(result.value);
          } else {
            failures++;
          }
        }

        if (successes.length > 0) {
          onEssaysGenerated(successes);
          const msg =
            successes.length === 1
              ? "Essay generated!"
              : `${successes.length} essays generated!`;
          toast(failures > 0 ? `${msg} (${failures} failed)` : msg, "success");
        } else {
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
      const message =
        error instanceof Error ? error.message : "Generation failed";
      toast(message, "error");
    } finally {
      setIsGenerating(false);
      setProgress({ done: 0, total: 0 });
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm sm:p-6">
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
                className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
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
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
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
            className="w-full rounded-md border border-border bg-surface px-4 py-2.5 text-sm text-foreground placeholder:text-muted/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
          />
        </div>

        <button
          data-generate-btn
          onClick={generateEssays}
          disabled={isGenerating || !hasInput}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
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
