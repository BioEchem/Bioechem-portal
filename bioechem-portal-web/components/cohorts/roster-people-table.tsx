"use client";

import { useState, useMemo } from "react";
import { Search, X, ChevronDown } from "lucide-react";
import { getInitials } from "@/lib/profile/display";

export type RosterEntry = {
  id: string;
  userId: string;
  name: string | null;
  email: string | null;
  cohortRole: "teacher" | "participant";
};

type UserDetail = {
  name: string | null;
  email: string | null;
  cohortRole: string;
  cohortName: string;
  school: string | null;
  bio: string | null;
  grades: {
    totalEarned: number;
    totalMax: number;
    pct: number | null;
    letter: string;
    entries: { title: string; earned: number | null; max: number }[];
  } | null;
};

type Filter = "all" | "teacher" | "participant";

type Props = {
  entries: RosterEntry[];
  cohortId: string;
  cohortName: string;
};

function Avatar({ name, email }: { name: string | null; email: string | null }) {
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bio-green/15 text-xs font-semibold text-bio-green">
      {getInitials(name, email)}
    </div>
  );
}

export function RosterPeopleTable({ entries, cohortId, cohortName }: Props) {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const teacherCount = entries.filter((e) => e.cohortRole === "teacher").length;
  const studentCount = entries.filter((e) => e.cohortRole === "participant").length;

  const filterOptions: { value: Filter; label: string }[] = [
    { value: "all", label: `All (${entries.length})` },
    { value: "teacher", label: `Teachers (${teacherCount})` },
    { value: "participant", label: `Students (${studentCount})` },
  ];

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return entries.filter((e) => {
      if (filter !== "all" && e.cohortRole !== filter) return false;
      if (!q) return true;
      return (
        (e.name?.toLowerCase().includes(q) ?? false) ||
        (e.email?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [entries, filter, search]);

  async function handleSelect(userId: string) {
    if (selectedUserId === userId) {
      setSelectedUserId(null);
      setDetail(null);
      return;
    }
    setSelectedUserId(userId);
    setDetail(null);
    setLoadingId(userId);
    setError(null);
    try {
      const res = await fetch(`/api/cohorts/${cohortId}/roster/${userId}`);
      const json = await res.json() as UserDetail & { error?: string };
      if (!res.ok) { setError(json.error ?? "Failed to load."); return; }
      setDetail(json);
    } catch {
      setError("Network error.");
    } finally {
      setLoadingId(null);
    }
  }

  const activeFilterLabel = filterOptions.find((o) => o.value === filter)?.label ?? "All";

  return (
    <div className="space-y-4">
      {/* Search + filter bar */}
      <div className="flex gap-2">
        <div className="relative w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-bio-text-muted/60" />
          <input
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-card-border bg-bio-white py-2 pl-9 pr-3 text-sm text-bio-text placeholder:text-bio-text-muted/60 focus:border-bio-green focus:outline-none focus:ring-2 focus:ring-bio-green/20"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-bio-text-muted hover:text-bio-text"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>

        {/* Filter dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setDropdownOpen((o) => !o)}
            className="flex items-center gap-2 rounded-lg border border-card-border bg-bio-white px-3 py-2 text-sm text-bio-text hover:border-bio-green/40 focus:outline-none"
          >
            <span className="whitespace-nowrap">{activeFilterLabel}</span>
            <ChevronDown className={`h-4 w-4 shrink-0 text-bio-text-muted transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
          </button>
          {dropdownOpen ? (
            <div className="absolute right-0 top-full z-10 mt-1 min-w-[170px] rounded-lg border border-card-border bg-bio-white py-1 shadow-md">
              {filterOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { setFilter(opt.value); setDropdownOpen(false); }}
                  className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                    filter === opt.value
                      ? "bg-bio-green/8 font-medium text-bio-green"
                      : "text-bio-text hover:bg-bio-mint/30"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-card-border">
              <th className="pb-2 pr-4 text-xs font-semibold uppercase tracking-wide text-bio-text-muted">Name</th>
              <th className="pb-2 pr-4 text-xs font-semibold uppercase tracking-wide text-bio-text-muted">Role</th>
              <th className="pb-2 text-xs font-semibold uppercase tracking-wide text-bio-text-muted">Section</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-8 text-center text-sm text-bio-text-muted">
                  {search || filter !== "all" ? "No members match your search." : "No enrolled members yet."}
                </td>
              </tr>
            ) : (
              filtered.map((entry) => {
                const isSelected = selectedUserId === entry.userId;
                const isLoading = loadingId === entry.userId;
                return (
                  <tr
                    key={entry.id}
                    onClick={() => void handleSelect(entry.userId)}
                    className={`cursor-pointer border-b border-card-border transition-colors last:border-0 ${
                      isSelected ? "bg-bio-green/5" : "hover:bg-bio-mint/20"
                    }`}
                  >
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={entry.name} email={entry.email} />
                        <div>
                          <p className={`text-sm font-medium ${isLoading ? "text-bio-text-muted" : "text-bio-text"}`}>
                            {entry.name ?? entry.email ?? "Unknown"}
                          </p>
                          {entry.name && entry.email ? (
                            <p className="text-xs text-bio-text-muted">{entry.email}</p>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        entry.cohortRole === "teacher"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}>
                        {entry.cohortRole === "teacher" ? "Teacher" : "Student"}
                      </span>
                    </td>
                    <td className="py-3 text-sm text-bio-text-muted">{cohortName}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Detail panel */}
      {selectedUserId ? (
        <div className="rounded-xl border border-bio-green/20 bg-bio-mint/10 p-5">
          {loadingId ? (
            <p className="text-sm text-bio-text-muted">Loading…</p>
          ) : error ? (
            <p className="text-sm text-red-500">{error}</p>
          ) : detail ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar name={detail.name} email={detail.email} />
                  <div>
                    <p className="font-semibold text-bio-text">{detail.name ?? "Unknown"}</p>
                    {detail.email ? <p className="text-sm text-bio-text-muted">{detail.email}</p> : null}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setSelectedUserId(null); setDetail(null); }}
                  className="shrink-0 rounded p-1 text-bio-text-muted hover:bg-bio-green/10 hover:text-bio-text"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                <div>
                  <p className="text-xs text-bio-text-muted">Role</p>
                  <p className="font-medium text-bio-text">
                    {detail.cohortRole === "teacher" ? "Teacher" : "Student"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-bio-text-muted">Course</p>
                  <p className="font-medium text-bio-text">{detail.cohortName}</p>
                </div>
                {detail.school ? (
                  <div>
                    <p className="text-xs text-bio-text-muted">School</p>
                    <p className="font-medium text-bio-text">{detail.school}</p>
                  </div>
                ) : null}
              </div>

              {detail.bio ? (
                <div>
                  <p className="text-xs text-bio-text-muted">Bio</p>
                  <p className="mt-1 text-sm text-bio-text">{detail.bio}</p>
                </div>
              ) : null}

              {detail.grades ? (
                <div className="border-t border-bio-green/15 pt-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-bio-green">Grades</p>
                  <div className="flex flex-wrap gap-6">
                    <div>
                      <p className="text-xs text-bio-text-muted">Total</p>
                      <p className="text-xl font-bold text-bio-green">
                        {detail.grades.totalEarned}
                        <span className="text-sm font-normal text-bio-text-muted"> / {detail.grades.totalMax}</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-bio-text-muted">Overall</p>
                      <p className="text-xl font-bold text-bio-green">
                        {detail.grades.pct != null ? `${detail.grades.pct}%` : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-bio-text-muted">Grade</p>
                      <p className="text-xl font-bold text-bio-green">{detail.grades.letter}</p>
                    </div>
                  </div>
                  {detail.grades.entries.length > 0 ? (
                    <div className="mt-3 divide-y divide-bio-green/10">
                      {detail.grades.entries.map((e, i) => (
                        <div key={i} className="flex items-center justify-between py-1.5 text-sm">
                          <span className="truncate text-bio-text-muted">{e.title}</span>
                          <span className="ml-4 shrink-0 font-medium text-bio-text">
                            {e.earned ?? "—"} / {e.max}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-bio-text-muted">No assignments graded yet.</p>
                  )}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
