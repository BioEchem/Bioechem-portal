"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  authErrorMessageClassName,
  authInputClassName,
  authLabelClassName,
  authSubmitButtonClassName,
} from "@/components/auth/form-styles";
import type { AuthApiError, LoginSuccessResponse } from "@/lib/auth/types";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.get("email"),
          password: formData.get("password"),
        }),
      });

      const data = (await response.json()) as LoginSuccessResponse | AuthApiError;

      if (!response.ok || !("ok" in data)) {
        setError("error" in data ? data.error.message : "Could not sign in.");
        return;
      }

      router.push(data.redirectTo);
      router.refresh();
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

      <div>
        <label htmlFor="login-email" className={authLabelClassName}>
          Email
        </label>
        <input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={pending}
          placeholder="name@email.com"
          className={authInputClassName}
        />
      </div>

      <div>
        <label htmlFor="login-password" className={authLabelClassName}>
          Password
        </label>
        <input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          disabled={pending}
          placeholder="Enter your password"
          className={authInputClassName}
        />
      </div>

      <button
        type="submit"
        className={authSubmitButtonClassName}
        disabled={pending}
      >
        {pending ? "Signing in…" : "Log in"}
      </button>
    </form>
  );
}
