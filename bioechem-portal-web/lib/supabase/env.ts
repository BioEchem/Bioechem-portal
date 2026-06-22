const ENV_DOC = "docs/ENV_SETUP.md";

function requireEnv(name: string, value: string | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new Error(
      `Missing environment variable: ${name}. Copy .env.local.example to .env.local and add your Supabase keys. See ${ENV_DOC}.`,
    );
  }
  return trimmed;
}

/** Public Supabase project URL and anon key (safe for browser + server). */
export function getSupabaseEnv() {
  return {
    url: requireEnv("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
    anonKey: requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  };
}
