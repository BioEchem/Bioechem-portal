import { redirect } from "next/navigation";

/**
 * Modules now render inline in the cohort page's Modules tab
 * (`/cohorts/[id]?tab=modules&moduleId=...`), matching every other tab's URL
 * scheme. This route stays only to redirect old/bookmarked links.
 */
export default async function ModulePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; moduleId: string }>;
  searchParams: Promise<{ back?: string }>;
}) {
  const { id: cohortId, moduleId } = await params;
  const { back } = await searchParams;
  const validBack = back?.startsWith("/admin/") ? back : null;
  redirect(
    `/cohorts/${cohortId}?tab=modules&moduleId=${moduleId}${validBack ? `&back=${encodeURIComponent(validBack)}` : ""}`,
  );
}
