"use client";

interface Version {
  content: string;
  feedback: string;
  timestamp: Date;
}

interface Props {
  versions: Version[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

export default function VersionHistory({ versions, activeIndex, onSelect }: Props) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Version History
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {versions.map((version, index) => {
          const isActive = index === activeIndex;
          const isFirst = index === 0;
          const time = new Date(version.timestamp);
          const timeStr = time.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });

          return (
            <button
              key={index}
              onClick={() => onSelect(index)}
              className={`group flex shrink-0 flex-col items-start rounded-xl border px-3 py-2 text-left transition-all ${
                isActive
                  ? "border-primary/30 bg-primary-light"
                  : "border-border bg-surface hover:border-primary/20"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <div
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                    isActive
                      ? "bg-primary text-white"
                      : "bg-border text-muted"
                  }`}
                >
                  {index + 1}
                </div>
                <span
                  className={`text-xs font-semibold ${isActive ? "text-primary" : "text-foreground"}`}
                >
                  {isFirst ? "Original" : `Revision ${index}`}
                </span>
              </div>
              <p className="mt-1 max-w-[180px] truncate text-[11px] text-muted">
                {isFirst ? "Initial generation" : version.feedback}
              </p>
              <p className="mt-0.5 text-[10px] text-muted/60">{timeStr}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
