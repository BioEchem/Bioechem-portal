import { NextResponse } from "next/server";

import type { AuthApiError } from "@/lib/auth/types";

type AuthErrorCode = AuthApiError["error"]["code"];

export function authError(
  message: string,
  status: number,
  code?: AuthErrorCode,
): NextResponse<AuthApiError> {
  return NextResponse.json(
    { error: { message, ...(code ? { code } : {}) } },
    { status },
  );
}

export function authOk<T>(data: T): NextResponse<T> {
  return NextResponse.json(data);
}

/** Parses JSON body or returns a 400 error response. */
export async function readJsonBody(
  request: Request,
): Promise<{ body: unknown } | NextResponse<AuthApiError>> {
  try {
    return { body: await request.json() };
  } catch {
    return authError("Invalid JSON body.", 400);
  }
}

export function isErrorResponse(
  value: unknown,
): value is NextResponse<AuthApiError> {
  return value instanceof NextResponse;
}
