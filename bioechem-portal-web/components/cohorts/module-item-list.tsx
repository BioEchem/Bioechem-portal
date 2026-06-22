"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileText,
  Link as LinkIcon,
  File,
  ClipboardList,
  CheckCircle,
  Clock,
  Eye,
  EyeOff,
  Trash2,
} from "lucide-react";

type ItemRow = {
  id: string;
  type: string;
  title: string;
  content: string | null;
  file_url: string | null;
  external_url: string | null;
  position: number;
  published: boolean;
  created_at: string;
  assignments: { id: string; due_at: string | null; max_points: number; submission_type: string } | null;
};

type SubmissionInfo = { submitted_at: string };

const TYPE_ICON: Record<string, React.ElementType> = {
  note: FileText,
  file: File,
  link: LinkIcon,
  assignment: ClipboardList,
};

function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function ItemIcon({ type }: { type: string }) {
  const Icon = TYPE_ICON[type] ?? FileText;
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-bio-mint/40">
      <Icon className="h-4 w-4 text-bio-green" />
    </div>
  );
}

export function ModuleItemList({
  cohortId,
  moduleId,
  items: initial,
  submissionMap,
  canManage,
}: {
  cohortId: string;
  moduleId: string;
  items: ItemRow[];
  submissionMap: Record<string, SubmissionInfo>;
  canManage: boolean;
}) {
  const [items, setItems] = useState(initial);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Sync local state when the server re-fetches after router.refresh()
  useEffect(() => {
    setItems(initial);
  }, [initial]);

  async function deleteItem(itemId: string) {
    if (!confirm("Delete this item?")) return;
    setDeleting(itemId);
    try {
      const res = await fetch(
        `/api/cohorts/${cohortId}/modules/${moduleId}/items/${itemId}`,
        { method: "DELETE" },
      );
      if (res.ok) setItems((prev) => prev.filter((i) => i.id !== itemId));
    } finally {
      setDeleting(null);
    }
  }

  async function togglePublish(item: ItemRow) {
    const res = await fetch(
      `/api/cohorts/${cohortId}/modules/${moduleId}/items/${item.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: !item.published }),
      },
    );
    if (res.ok) {
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, published: !i.published } : i)),
      );
    }
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-bio-text-muted">
        {canManage ? "No items yet. Add one below." : "No content available yet."}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const sub = item.assignments ? submissionMap[item.assignments.id] : undefined;
        const isAssignment = item.type === "assignment";

        const inner = (
          <div className="flex items-center gap-3 rounded-xl border border-card-border bg-card p-4 shadow-[var(--shadow-card)]">
            <ItemIcon type={item.type} />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-bio-text truncate">{item.title}</p>
                {canManage && !item.published ? (
                  <span className="flex items-center gap-0.5 text-xs text-bio-text-muted">
                    <EyeOff className="h-3 w-3" /> Draft
                  </span>
                ) : null}
              </div>

              {isAssignment && item.assignments ? (
                <div className="mt-0.5 flex flex-wrap gap-3 text-xs text-bio-text-muted">
                  <span>{item.assignments.max_points} pts</span>
                  {item.assignments.due_at ? (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Due {fmt(item.assignments.due_at)}
                    </span>
                  ) : null}
                  {sub ? (
                    <span className="flex items-center gap-1 text-bio-green">
                      <CheckCircle className="h-3 w-3" />
                      Submitted {fmt(sub.submitted_at)}
                    </span>
                  ) : null}
                </div>
              ) : null}

              {item.external_url && item.type === "link" ? (
                <p className="mt-0.5 truncate text-xs text-bio-green">{item.external_url}</p>
              ) : null}
            </div>

            {canManage ? (
              <div className="flex items-center gap-1" onClick={(e) => e.preventDefault()}>
                <button
                  type="button"
                  onClick={() => void togglePublish(item)}
                  className={`rounded-md p-1.5 transition-colors ${
                    item.published
                      ? "text-bio-green hover:text-bio-green/70"
                      : "text-bio-text-muted hover:text-bio-green"
                  }`}
                  title={item.published ? "Published — click to unpublish" : "Draft — click to publish"}
                >
                  {item.published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => void deleteItem(item.id)}
                  disabled={deleting === item.id}
                  className="rounded-md p-1.5 text-bio-text-muted hover:text-red-500 disabled:opacity-40"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ) : null}
          </div>
        );

        if (isAssignment && item.assignments) {
          return (
            <Link
              key={item.id}
              href={`/cohorts/${cohortId}/assignments/${item.assignments.id}`}
              className="block hover:opacity-90"
            >
              {inner}
            </Link>
          );
        }

        if (item.type === "link" && item.external_url) {
          return (
            <a
              key={item.id}
              href={item.external_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block hover:opacity-90"
            >
              {inner}
            </a>
          );
        }

        if (item.type === "file" && item.file_url) {
          return (
            <a
              key={item.id}
              href={item.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block hover:opacity-90"
            >
              {inner}
            </a>
          );
        }

        return <div key={item.id}>{inner}</div>;
      })}
    </div>
  );
}
