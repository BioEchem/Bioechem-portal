"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  headerAuthDisabled,
  headerAuthInactive,
} from "@/components/brand/header-auth-styles";
import type { AuthApiError, LogoutSuccessResponse } from "@/lib/auth/types";

type SignOutButtonProps = {
  className?: string;
};

export function SignOutButton({ className }: SignOutButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleSignOut() {
    setPending(true);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      const data = (await response.json()) as LogoutSuccessResponse | AuthApiError;

      if (!response.ok || !("ok" in data)) {
        return;
      }

      router.push(data.redirectTo);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={pending}
      className={
        className ??
        `${headerAuthInactive} ${headerAuthDisabled}`
      }
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
