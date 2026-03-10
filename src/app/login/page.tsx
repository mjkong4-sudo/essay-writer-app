"use client";

import { Suspense, useState, useRef, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (error) emailRef.current?.focus();
  }, [error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });
      if (result?.error) {
        setError("Invalid email or password. Please try again.");
        setLoading(false);
        return;
      }
      await fetch("/api/auth/merge-guest", { method: "POST" });
      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm px-4 py-12 sm:py-16">
      <h1 className="font-serif text-2xl font-bold text-foreground">Sign in</h1>
      <p className="mt-1 text-sm text-muted">
        Use your account to sync essays across devices.
      </p>
      <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
        {error && (
          <p id="login-error" role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-muted">
            Email
          </label>
          <input
            ref={emailRef}
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-border bg-card px-3 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-0"
            required
            aria-describedby={error ? "login-error" : undefined}
            aria-invalid={!!error}
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-muted">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-border bg-card px-3 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-0"
            required
            aria-describedby={error ? "login-error" : undefined}
            aria-invalid={!!error}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-primary px-4 py-2.5 font-medium text-white hover:bg-primary-hover active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-medium text-primary hover:underline">
          Sign up
        </Link>
      </p>
      <p className="mt-4 text-center">
        <Link href="/" className="text-sm text-muted hover:text-foreground">
          ← Back to Writer
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-sm px-4 py-12 text-muted">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
