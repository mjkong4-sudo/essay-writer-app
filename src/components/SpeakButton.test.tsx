import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import SpeakButton from "./SpeakButton";

describe("SpeakButton", () => {
  beforeEach(() => {
    const mockCancel = vi.fn();
    const mockSpeak = vi.fn();
    (window as unknown as { speechSynthesis: { cancel: () => void; speak: (u: unknown) => void } }).speechSynthesis = {
      cancel: mockCancel,
      speak: mockSpeak,
    };
    (window as unknown as { SpeechSynthesisUtterance: new (text?: string) => { lang: string; rate: number; onend: () => void; onerror: () => void } }).SpeechSynthesisUtterance = class MockUtterance {
      lang = "en-US";
      rate = 0.9;
      onend = vi.fn();
      onerror = vi.fn();
      constructor(public text = "") {}
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders with play icon and title", () => {
    render(<SpeakButton text="hello" title="Hear word" />);
    const btn = screen.getByRole("button", { name: /hear word/i });
    expect(btn).toBeInTheDocument();
  });

  it("renders Listen when no title given", () => {
    render(<SpeakButton text="test" />);
    expect(screen.getByRole("button", { name: /listen/i })).toBeInTheDocument();
  });
});
