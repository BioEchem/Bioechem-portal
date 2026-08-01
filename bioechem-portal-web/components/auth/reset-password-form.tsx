"use client";

import Link from "next/link";
import { useState } from "react";

import {
  authErrorMessageClassName,
  authInputClassName,
  authLabelClassName,
  authSubmitButtonClassName,
} from "@/components/auth/form-styles";
import { AUTH_ROUTES } from "@/lib/auth/routes";
import type { AuthApiError, ResetPasswordSuccessResponse } from "@/lib/auth/types";

export function ResetPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    const confirm = String(formData.get("confirm") ?? "");

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setPending(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = (await response.json()) as ResetPasswordSuccessResponse | AuthApiError;

      if (!response.ok || !("ok" in data)) {
        setError(
          "error" in data ? data.error.message : "Could not update password. Please try again.",
        );
        return;
      }

      setDone(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className="space-y-4 text-center">
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
        <p className="text-sm font-medium text-bio-text">Password updated</p>
        <p className="text-sm text-bio-text-muted">
          Your password has been changed. You can now log in with your new password.
        </p>
        <Link
          href={AUTH_ROUTES.login}
          className="bio-btn-primary mt-2 inline-block w-full text-center"
        >
          Log in
        </Link>
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
        <label htmlFor="reset-password" className={authLabelClassName}>
          New password
        </label>
        <input
          id="reset-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          disabled={pending}
          placeholder="At least 6 characters"
          className={authInputClassName}
        />
      </div>

      <div>
        <label htmlFor="reset-confirm" className={authLabelClassName}>
          Confirm new password
        </label>
        <input
          id="reset-confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          disabled={pending}
          className={authInputClassName}
        />
      </div>

      <button type="submit" disabled={pending} className={authSubmitButtonClassName}>
        {pending ? "Updating…" : "Update password"}
      </button>

      <p className="text-center text-sm text-bio-text-muted">
        Changed your mind?{" "}
        <Link href={AUTH_ROUTES.login} className="font-medium text-bio-green hover:underline">
          Back to login
        </Link>
      </p>
    </form>
  );
}
