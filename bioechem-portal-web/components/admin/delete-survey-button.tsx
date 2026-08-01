"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteSurveyButton({ surveyId }: { surveyId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    if (!confirm("Delete this survey and all responses? This cannot be undone.")) return;
    setPending(true);
    await fetch(`/api/admin/surveys/${surveyId}`, { method: "DELETE" });
    router.push("/admin/surveys");
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={pending}
      className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}
