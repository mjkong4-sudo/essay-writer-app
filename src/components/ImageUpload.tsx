"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useToast } from "./Toast";

interface ImageItem {
  file: File;
  preview: string;
  name: string;
}

interface Props {
  onImagesChanged: (files: File[]) => void;
}

export default function ImageUpload({ onImagesChanged }: Props) {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const newItems: ImageItem[] = [];
      for (const file of files) {
        if (!file.type.startsWith("image/")) {
          toast(`"${file.name}" is not an image — skipped`, "error");
          continue;
        }
        if (file.size > 20 * 1024 * 1024) {
          toast(`"${file.name}" exceeds 20 MB — skipped`, "error");
          continue;
        }
        newItems.push({
          file,
          preview: URL.createObjectURL(file),
          name: file.name || "Pasted image",
        });
      }
      if (newItems.length === 0) return;

      setImages((prev) => {
        const next = [...prev, ...newItems];
        const filesToReport = next.map((i) => i.file);
        queueMicrotask(() => onImagesChanged(filesToReport));
        return next;
      });
    },
    [onImagesChanged, toast],
  );

  const removeImage = useCallback(
    (index: number) => {
      setImages((prev) => {
        const next = prev.filter((_, i) => i !== index);
        URL.revokeObjectURL(prev[index].preview);
        const filesToReport = next.map((i) => i.file);
        queueMicrotask(() => onImagesChanged(filesToReport));
        return next;
      });
    },
    [onImagesChanged],
  );

  const clearAll = useCallback(() => {
    images.forEach((img) => URL.revokeObjectURL(img.preview));
    setImages([]);
    onImagesChanged([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [images, onImagesChanged]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      addFiles(e.dataTransfer.files);
    },
    [addFiles],
  );

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) addFiles([file]);
          return;
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [addFiles]);

  return (
    <div className="space-y-3">
      {/* Preview strip */}
      {images.length > 0 && (
        <div className="rounded-xl border border-border bg-card shadow-card">
          <div className="flex gap-3 overflow-x-auto p-3">
            {images.map((img, i) => (
              <div key={i} className="group relative shrink-0">
                <img
                  src={img.preview}
                  alt={img.name}
                  className="h-20 w-20 rounded-xl border border-border object-cover sm:h-28 sm:w-28"
                />
                <button
                  onClick={() => removeImage(i)}
                  className="absolute -right-1.5 -top-1.5 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-danger text-white shadow-sm transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
                  title="Remove"
                  aria-label="Remove image"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-3 w-3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <p className="mt-1 max-w-[80px] truncate text-[10px] text-muted sm:max-w-[112px]">
                  {img.name}
                </p>
              </div>
            ))}

            {/* Add more button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-xl border-2 border-dashed border-border text-muted transition-colors hover:border-primary/40 hover:text-primary sm:h-28 sm:w-28"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span className="mt-1 text-[11px] font-medium">Add more</span>
            </button>
          </div>

          <div className="flex items-center justify-between border-t border-border px-4 py-2">
            <span className="text-xs font-medium text-muted">
              {images.length} image{images.length !== 1 && "s"} selected
            </span>
            <button
              onClick={clearAll}
              className="flex items-center gap-1 text-xs text-danger hover:underline"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-3.5 w-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
              Clear all
            </button>
          </div>
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`cursor-pointer rounded-lg border-2 border-dashed text-center transition-colors ${
          images.length > 0 ? "p-4 sm:p-6" : "p-8 sm:p-12"
        } ${
          isDragOver
            ? "border-primary bg-primary-light"
            : "border-border hover:border-primary/40 hover:bg-primary-light/50"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => {
            if (e.target.files?.length) addFiles(e.target.files);
            e.target.value = "";
          }}
          className="hidden"
        />
        {images.length === 0 ? (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="mx-auto h-10 w-10 text-muted/40">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <p className="mt-3 text-base font-medium text-foreground/70">
              Drop images, click to upload, or paste from clipboard
            </p>
            <p className="mt-1 text-sm text-muted">
              Select multiple images at once &mdash; each generates its own essay
            </p>
          </>
        ) : (
          <p className="text-sm font-medium text-muted">
            Drop or click to add more images
          </p>
        )}
      </div>
    </div>
  );
}
