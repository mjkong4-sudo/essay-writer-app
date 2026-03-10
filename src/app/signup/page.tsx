"use client";

import { useState, useRef, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
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
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          name: name.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.error === "An account with this email already exists"
          ? "An account with this email already exists. Try signing in."
          : data.error === "Password must be at least 8 characters"
            ? "Password must be at least 8 characters."
            : "We couldn't create your account. Please try again.";
        setError(msg);
        setLoading(false);
        return;
      }
      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });
      if (result?.error) {
        setError("Account created. Please sign in.");
        setLoading(false);
        return;
      }
      await fetch("/api/auth/merge-guest", { method: "POST" });
      router.push("/");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm px-4 py-12 sm:py-16">
      <h1 className="font-serif text-2xl font-bold text-foreground">Create account</h1>
      <p className="mt-1 text-sm text-muted">
        Save and sync your essays across devices.
      </p>
      <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
        {error && (
          <p id="signup-error" role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium text-muted">
            Name (optional)
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-border bg-card px-3 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-0"
          />
        </div>
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
            aria-describedby={error ? "signup-error" : undefined}
            aria-invalid={!!error}
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-muted">
            Password (min 8 characters)
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            className="w-full rounded-xl border border-border bg-card px-3 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-0"
            required
            aria-describedby={error ? "signup-error" : undefined}
            aria-invalid={!!error}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-primary px-4 py-2.5 font-medium text-white hover:bg-primary-hover active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50"
        >
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
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
