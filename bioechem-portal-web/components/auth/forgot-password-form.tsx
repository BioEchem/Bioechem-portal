"use client";

import { useState } from "react";

import {
  authErrorMessageClassName,
  authInputClassName,
  authLabelClassName,
  authSubmitButtonClassName,
} from "@/components/auth/form-styles";
import type { AuthApiError, ForgotPasswordSuccessResponse } from "@/lib/auth/types";

export function ForgotPasswordForm({ linkExpiredError = false }: { linkExpiredError?: boolean }) {
  const [error, setError] = useState<string | null>(
    linkExpiredError
      ? "That reset link has expired or is invalid. Please request a new one."
      : null,
  );
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = (await response.json()) as ForgotPasswordSuccessResponse | AuthApiError;

      if (!response.ok || !("ok" in data)) {
        setError("error" in data ? data.error.message : "Something went wrong. Please try again.");
        return;
      }

      setSent(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-3 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-bio-green/10">
          <svg
            className="h-6 w-6 text-bio-green"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-sm font-medium text-bio-text">Check your inbox</p>
        <p className="text-sm text-bio-text-muted">
          If an account with that email exists, we&apos;ve sent a password reset link. It may
          take a minute to arrive.
        </p>
      </div>
    );
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit} noValidate>
      {error ? (
        <p className={authErrorMessageClassName} role="alert">
          {error}
        </p>
      ) : null}

      <div>
        <label htmlFor="forgot-email" className={authLabelClassName}>
          Email address
        </label>
        <input
          id="forgot-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={pending}
          placeholder="name@email.com"
          className={authInputClassName}
        />
      </div>

      <button type="submit" disabled={pending} className={authSubmitButtonClassName}>
        {pending ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}
