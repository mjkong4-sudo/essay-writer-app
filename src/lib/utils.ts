export function containsKorean(text: string): boolean {
  return /[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(text);
}

export function wordCount(text: string): number {
  return text
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}

export function charCount(text: string): number {
  return text.replace(/\s/g, "").length;
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
