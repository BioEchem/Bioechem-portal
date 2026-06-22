"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useRef } from "react";
import { Search, X } from "lucide-react";

type Option = { value: string; label: string };

export function FilterBar({
  searchPlaceholder = "Search…",
  statusOptions,
}: {
  searchPlaceholder?: string;
  statusOptions?: Option[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);

  function buildUrl(overrides: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(overrides)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    params.delete("page");
    return `${pathname}?${params.toString()}`;
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    router.push(buildUrl({ search: inputRef.current?.value ?? "" }));
  }

  function clearSearch() {
    if (inputRef.current) inputRef.current.value = "";
    router.push(buildUrl({ search: "" }));
  }

  const currentSearch = searchParams.get("search") ?? "";
  const currentStatus = searchParams.get("status") ?? "";

  return (
    <div className="flex flex-wrap gap-3">
      <form onSubmit={submitSearch} className="relative flex min-w-[200px] flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-bio-text-muted" />
        <input
          ref={inputRef}
          type="text"
          placeholder={searchPlaceholder}
          defaultValue={currentSearch}
          className="w-full rounded-lg border border-card-border bg-bio-white py-2 pl-9 pr-8 text-sm text-bio-text placeholder:text-bio-text-muted focus:border-bio-green focus:outline-none focus:ring-2 focus:ring-bio-green/20"
        />
        {currentSearch ? (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-bio-text-muted hover:text-bio-text"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </form>
      {statusOptions ? (
        <select
          value={currentStatus}
          onChange={(e) => router.push(buildUrl({ status: e.target.value }))}
          className="rounded-lg border border-card-border bg-bio-white px-3 py-2 text-sm text-bio-text focus:border-bio-green focus:outline-none"
        >
          {statusOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      ) : null}
    </div>
  );
}
