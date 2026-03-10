"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";

export default function NavbarAuth() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  if (status === "loading") {
    return (
      <span className="text-sm text-muted">…</span>
    );
  }

  if (session?.user) {
    return (
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-sm font-medium text-muted hover:bg-surface hover:text-foreground"
          aria-expanded={open}
          aria-haspopup="true"
        >
          <span className="max-w-[120px] truncate sm:max-w-[160px]">
            {session.user.email ?? session.user.name ?? "Account"}
          </span>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
        {open && (
          <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-xl border border-border bg-card py-1 shadow-hover">
            <div className="border-b border-border px-3 py-2 text-xs text-muted">
              {session.user.email}
            </div>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-surface"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Link
        href="/login"
        className="rounded-xl px-3 py-2 text-sm font-medium text-muted hover:bg-surface hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2 focus:ring-offset-background"
      >
        Sign in
      </Link>
      <Link
        href="/signup"
        className="rounded-xl bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2 focus:ring-offset-background"
      >
        Sign up
      </Link>
    </div>
  );
}
