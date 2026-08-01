"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { AuthApiError, LogoutSuccessResponse } from "@/lib/auth/types";
import { AUTH_ROUTES } from "@/lib/auth/routes";

type BackToLoginButtonProps = {
  className?: string;
};

export function BackToLoginButton({ className }: BackToLoginButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      const data = (await response.json()) as LogoutSuccessResponse | AuthApiError;

      if (!response.ok || !("ok" in data)) {
        return;
      }

      router.push(AUTH_ROUTES.login);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className={
        className ??
        "bio-btn-secondary mt-6 inline-flex disabled:cursor-not-allowed disabled:opacity-60"
      }
    >
      {pending ? "Signing out…" : "Back to log in"}
    </button>
  );
}
