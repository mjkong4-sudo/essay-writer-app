import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  containsKorean,
  wordCount,
  charCount,
  truncate,
  formatDate,
} from "./utils";

describe("containsKorean", () => {
  it("returns true for Korean text", () => {
    expect(containsKorean("안녕")).toBe(true);
    expect(containsKorean("한글")).toBe(true);
    expect(containsKorean("Hello 안녕")).toBe(true);
  });

  it("returns false for non-Korean text", () => {
    expect(containsKorean("Hello")).toBe(false);
    expect(containsKorean("123")).toBe(false);
    expect(containsKorean("")).toBe(false);
  });
});

describe("wordCount", () => {
  it("counts words correctly", () => {
    expect(wordCount("")).toBe(0);
    expect(wordCount("one")).toBe(1);
    expect(wordCount("one two three")).toBe(3);
    expect(wordCount("  extra   spaces  ")).toBe(2);
  });
});

describe("charCount", () => {
  it("counts non-whitespace characters", () => {
    expect(charCount("")).toBe(0);
    expect(charCount("abc")).toBe(3);
    expect(charCount("a b c")).toBe(3);
    expect(charCount("  hello world  ")).toBe(10);
  });
});

describe("truncate", () => {
  it("returns full text when within maxLength", () => {
    expect(truncate("short", 10)).toBe("short");
    expect(truncate("exact", 5)).toBe("exact");
  });

  it("truncates and appends ... when over maxLength", () => {
    expect(truncate("long text", 4)).toBe("long...");
    expect(truncate("hello", 2)).toBe("he...");
  });
});

describe("formatDate", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("formats Date object", () => {
    const result = formatDate(new Date("2024-06-01T14:30:00Z"));
    expect(result).toMatch(/Jun/);
    expect(result).toMatch(/2024/);
  });

  it("formats ISO date string", () => {
    const result = formatDate("2024-12-25T09:00:00Z");
    expect(result).toMatch(/Dec/);
    expect(result).toMatch(/2024/);
  });
});
