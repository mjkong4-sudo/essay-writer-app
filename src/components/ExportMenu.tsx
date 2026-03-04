"use client";

import { useState, useRef, useEffect } from "react";
import { useToast } from "./Toast";

interface Props {
  content: string;
  title?: string;
}

type ExportFormat = "pdf" | "txt" | "docx";

export default function ExportMenu({ content, title = "Essay" }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const exportAs = async (format: ExportFormat) => {
    if (!content.trim()) {
      toast("Nothing to export", "error");
      return;
    }

    setExporting(format);

    try {
      if (format === "txt") {
        const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
        downloadBlob(blob, `${title}.txt`);
        toast("Exported as TXT!", "success");
      } else if (format === "pdf") {
        const { jsPDF } = await import("jspdf");
        const doc = new jsPDF();
        const margin = 20;
        const pageWidth = doc.internal.pageSize.getWidth();
        const maxLineWidth = pageWidth - margin * 2;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.text(title, margin, margin + 5);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        const lines = doc.splitTextToSize(content, maxLineWidth);
        let y = margin + 15;

        for (const line of lines) {
          if (y > doc.internal.pageSize.getHeight() - margin) {
            doc.addPage();
            y = margin;
          }
          doc.text(line, margin, y);
          y += 6;
        }

        doc.save(`${title}.pdf`);
        toast("Exported as PDF!", "success");
      } else if (format === "docx") {
        const response = await fetch("/api/export", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, title, format: "docx" }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Export failed");
        }

        const blob = await response.blob();
        downloadBlob(blob, `${title}.docx`);
        toast("Exported as DOCX!", "success");
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Export failed";
      toast(message, "error");
    } finally {
      setExporting(null);
      setIsOpen(false);
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formats: { format: ExportFormat; label: string; icon: string }[] = [
    { format: "pdf", label: "PDF Document", icon: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" },
    { format: "txt", label: "Plain Text", icon: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" },
    { format: "docx", label: "Word Document", icon: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" },
  ];

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={!content.trim()}
        className="flex items-center gap-1.5 rounded-md bg-secondary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
        Export
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-3 w-3">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-10 mt-1 w-48 rounded-md border border-border bg-card py-1 shadow-lg">
          {formats.map((f) => (
            <button
              key={f.format}
              onClick={() => exportAs(f.format)}
              disabled={exporting !== null}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-surface disabled:opacity-50"
            >
              {exporting === f.format ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 text-muted">
                  <path strokeLinecap="round" strokeLinejoin="round" d={f.icon} />
                </svg>
              )}
              {f.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
