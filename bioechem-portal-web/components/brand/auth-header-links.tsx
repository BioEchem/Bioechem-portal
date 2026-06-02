"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  headerAuthActive,
  headerAuthInactive,
} from "@/components/brand/header-auth-styles";
import { AUTH_ROUTES } from "@/lib/auth/routes";

export function AuthHeaderLinks() {
  const pathname = usePathname();
  const onLogin = pathname === AUTH_ROUTES.login;
  const onSignup = pathname === AUTH_ROUTES.signup;

  return (
    <>
      <Link
        href={AUTH_ROUTES.login}
        aria-current={onLogin ? "page" : undefined}
        className={onLogin ? headerAuthActive : headerAuthInactive}
      >
        Log in
      </Link>
      <Link
        href={AUTH_ROUTES.signup}
        aria-current={onSignup ? "page" : undefined}
        className={onSignup ? headerAuthActive : headerAuthInactive}
      >
        Sign up
      </Link>
    </>
  );
}
