"use client";

import { useState } from "react";

import {
  authErrorMessageClassName,
  authInputClassName,
  authLabelClassName,
  authSubmitButtonClassName,
} from "@/components/auth/form-styles";
import type { AuthApiError, PasswordChangeSuccessResponse } from "@/lib/auth/types";

export function PasswordChangeForm() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const formData = new FormData(event.currentTarget);
    const currentPassword = String(formData.get("currentPassword") ?? "");
    const newPassword = String(formData.get("newPassword") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (currentPassword === newPassword) {
      setError("New password cannot be the same as your current password.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setPending(true);
    const form = event.currentTarget;

    try {
      const response = await fetch("/api/auth/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = (await response.json()) as
        | PasswordChangeSuccessResponse
        | AuthApiError;

      if (!response.ok || !("ok" in data)) {
        setError(
          "error" in data ? data.error.message : "Could not update password.",
        );
        return;
      }

      form.reset();
      setSuccess("Password updated.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit} noValidate>
      {error ? (
        <p className={authErrorMessageClassName} role="alert">
          {error}
        </p>
      ) : null}

      {success ? (
        <p
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
          role="status"
        >
          {success}
        </p>
      ) : null}

      <div>
        <label htmlFor="current-password" className={authLabelClassName}>
          Current password
        </label>
        <input
          id="current-password"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          disabled={pending}
          className={authInputClassName}
        />
      </div>

      <div>
        <label htmlFor="new-password" className={authLabelClassName}>
          New password
        </label>
        <input
          id="new-password"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          disabled={pending}
          className={authInputClassName}
        />
      </div>

      <div>
        <label htmlFor="confirm-password" className={authLabelClassName}>
          Confirm new password
        </label>
        <input
          id="confirm-password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          disabled={pending}
          className={authInputClassName}
        />
      </div>

      <button
        type="submit"
        className={`${authSubmitButtonClassName} mt-0 w-full sm:w-auto`}
        disabled={pending}
      >
        {pending ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}
