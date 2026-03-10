"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

export default function MigrateLegacyPage() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    migrated?: { essays: number; generationHistory: number; highlights: number };
    total?: number;
    message?: string;
    error?: string;
  } | null>(null);

  const handleMigrate = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/migrate-legacy", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setResult({ success: false, error: data.error ?? "Request failed" });
        return;
      }
      setResult({
        success: true,
        migrated: data.migrated,
        total: data.total,
        message: data.message,
      });
    } catch {
      setResult({ success: false, error: "Request failed" });
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="mx-auto max-w-md px-4 py-12">
        <p className="text-muted">Loading…</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-md px-4 py-12">
        <h1 className="font-serif text-xl font-bold">Claim legacy data</h1>
        <p className="mt-2 text-sm text-muted">
          Sign in with the admin or test account that should receive the original storage data (essays, history, highlights that had no account). Nothing is removed.
        </p>
        <Link
          href="/login?callbackUrl=/admin/migrate-legacy"
          className="mt-4 inline-block rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="font-serif text-xl font-bold">Claim legacy data</h1>
      <p className="mt-2 text-sm text-muted">
        Assign all pre-update data (essays, history, highlights with no account) to your account: <strong>{session.user?.email}</strong>. No data is deleted.
      </p>
      <button
        type="button"
        onClick={handleMigrate}
        disabled={loading}
        className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
      >
        {loading ? "Running…" : "Claim legacy data"}
      </button>
      {result && (
        <div
          className={`mt-4 rounded-xl border p-3 text-sm ${
            result.success ? "border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200" : "border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200"
          }`}
        >
          {result.success ? (
            <>
              <p className="font-medium">{result.message}</p>
              {result.migrated && result.total !== undefined && result.total > 0 && (
                <p className="mt-1 text-xs opacity-90">
                  Essays: {result.migrated.essays}, History: {result.migrated.generationHistory}, Highlights: {result.migrated.highlights}
                </p>
              )}
            </>
          ) : (
            <p>{result.error}</p>
          )}
        </div>
      )}
      <p className="mt-6">
        <Link href="/" className="text-sm text-primary hover:underline">
          ← Back to Writer
        </Link>
      </p>
    </div>
  );
}
