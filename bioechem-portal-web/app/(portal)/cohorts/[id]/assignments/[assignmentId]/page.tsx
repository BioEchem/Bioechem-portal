import { redirect } from "next/navigation";

/**
 * Assignments now render inline in the cohort page's Assignments tab
 * (`/cohorts/[id]?tab=assignments&assignmentId=...`), matching every other
 * tab's URL scheme. This route stays only to redirect old/bookmarked links.
 */
export default async function AssignmentPage({
  params,
}: {
  params: Promise<{ id: string; assignmentId: string }>;
}) {
  const { id: cohortId, assignmentId } = await params;
  redirect(`/cohorts/${cohortId}?tab=assignments&assignmentId=${assignmentId}`);
}
