/** Shared header auth control styles (Log in, Sign up, Dashboard, Sign out). */

export const headerAuthBase =
  "rounded-lg px-3 py-2 text-sm font-medium transition-colors sm:px-4";

export const headerAuthInactive = `${headerAuthBase} text-bio-green hover:bg-bio-mint`;

export const headerAuthActive = `${headerAuthBase} bg-bio-green text-white hover:bg-bio-green-dark`;

export const headerAuthDisabled = "disabled:cursor-not-allowed disabled:opacity-60";
