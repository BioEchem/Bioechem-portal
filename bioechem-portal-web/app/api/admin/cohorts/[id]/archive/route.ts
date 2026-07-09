import { NextResponse } from "next/server";
import { zipSync, strToU8 } from "fflate";
import { requireBioechemAdmin } from "@/lib/admin/require-admin";
import { createServiceRoleClient } from "@/lib/supabase/admin";

// Extract storage bucket + path from a Supabase public URL.
// e.g. https://xxx.supabase.co/storage/v1/object/public/course-files/cohorts/abc/file.pdf
// → { bucket: "course-files", path: "cohorts/abc/file.pdf" }
function parseStorageUrl(url: string): { bucket: string; path: string } | null {
  try {
    const match = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/);
    if (!match) return null;
    return { bucket: match[1], path: match[2] };
  } catch {
    return null;
  }
}

// Download a file from a URL and return its bytes + guessed filename.
async function fetchFileBytes(url: string): Promise<Uint8Array | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    return new Uint8Array(buf);
  } catch {
    return null;
  }
}

async function deleteStorageFiles(
  db: ReturnType<typeof createServiceRoleClient>,
  fileUrls: (string | null | undefined)[],
) {
  if (!db) return;
  const byBucket = new Map<string, string[]>();
  for (const url of fileUrls) {
    if (!url) continue;
    const parsed = parseStorageUrl(url);
    if (!parsed) continue;
    const existing = byBucket.get(parsed.bucket) ?? [];
    existing.push(parsed.path);
    byBucket.set(parsed.bucket, existing);
  }
  for (const [bucket, paths] of byBucket) {
    for (let i = 0; i < paths.length; i += 100) {
      await db.storage.from(bucket).remove(paths.slice(i, i + 100));
    }
  }
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireBioechemAdmin();
  if (!auth.ok) return auth.response;

  const { id: cohortId } = await params;
  const db = createServiceRoleClient();
  if (!db) return NextResponse.json({ error: "Service role key not configured." }, { status: 500 });

  // 1. Fetch cohort
  const { data: cohort, error: cohortErr } = await db
    .from("cohorts")
    .select("id, name, description, status, school_id, start_date, end_date, max_enrollment, created_at, schools(name)")
    .eq("id", cohortId)
    .single();

  if (cohortErr || !cohort) return NextResponse.json({ error: "Cohort not found." }, { status: 404 });
  if (cohort.status === "archived") return NextResponse.json({ error: "Already archived." }, { status: 400 });

  // 2. Collect all data for export
  const [
    enrollmentsRes,
    modulesRes,
    moduleItemsRes,
    assignmentsRes,
    submissionsRes,
    gradesRes,
    surveysRes,
    certificatesRes,
    contactsRes,
    announcementsRes,
  ] = await Promise.all([
    db.from("cohort_enrollments").select("*, profiles!user_id(full_name, email)").eq("cohort_id", cohortId),
    db.from("modules").select("*").eq("cohort_id", cohortId).order("position"),
    db.from("module_items").select("*").eq("cohort_id", cohortId).order("position"),
    db.from("assignments").select("*").eq("cohort_id", cohortId),
    db.from("submissions").select("*").eq("cohort_id", cohortId),
    db.from("grades").select("*").eq("cohort_id", cohortId),
    db.from("surveys").select("*").eq("cohort_id", cohortId),
    db.from("certificates").select("*").eq("cohort_id", cohortId),
    db.from("cohort_contacts").select("*").eq("cohort_id", cohortId),
    db.from("announcements").select("*").eq("cohort_id", cohortId),
  ]);

  const surveyIds = (surveysRes.data ?? []).map((s: { id: string }) => s.id);
  const surveyResponsesRes = surveyIds.length > 0
    ? await db.from("survey_responses").select("*").in("survey_id", surveyIds)
    : { data: [] };

  const exportData = {
    export_date: new Date().toISOString(),
    cohort: { ...cohort },
    enrollments: enrollmentsRes.data ?? [],
    modules: modulesRes.data ?? [],
    module_items: moduleItemsRes.data ?? [],
    assignments: assignmentsRes.data ?? [],
    submissions: submissionsRes.data ?? [],
    grades: gradesRes.data ?? [],
    surveys: surveysRes.data ?? [],
    survey_responses: surveyResponsesRes.data ?? [],
    certificates: certificatesRes.data ?? [],
    contacts: contactsRes.data ?? [],
    announcements: announcementsRes.data ?? [],
  };

  // 3. Collect storage file URLs
  const fileEntries: { url: string; bucket: string; storagePath: string }[] = [];

  function addFileUrl(url: string | undefined) {
    if (!url) return;
    const parsed = parseStorageUrl(url);
    if (parsed) fileEntries.push({ url, bucket: parsed.bucket, storagePath: parsed.path });
  }

  for (const item of moduleItemsRes.data ?? []) {
    addFileUrl((item as Record<string, unknown>).file_url as string | undefined);
  }
  for (const sub of submissionsRes.data ?? []) {
    addFileUrl((sub as Record<string, unknown>).file_url as string | undefined);
  }
  for (const cert of certificatesRes.data ?? []) {
    addFileUrl((cert as Record<string, unknown>).file_url as string | undefined);
  }

  // 4. Download all files and build ZIP entries
  const zipEntries: Record<string, Uint8Array> = {};

  // Add export JSON
  zipEntries["export.json"] = strToU8(JSON.stringify(exportData, null, 2));

  // Download each storage file in parallel
  const downloadResults = await Promise.all(
    fileEntries.map(async (entry) => {
      const bytes = await fetchFileBytes(entry.url);
      return { entry, bytes };
    })
  );

  for (const { entry, bytes } of downloadResults) {
    if (bytes) {
      // Preserve the original storage path so the admin knows what's what
      const zipPath = `files/${entry.bucket}/${entry.storagePath}`;
      zipEntries[zipPath] = bytes;
    }
  }

  // 5. Create ZIP
  const cohortSlug = (cohort.name as string).replace(/\s+/g, "-").toLowerCase();
  const zipBytes = zipSync(zipEntries, { level: 6 });

  // 6. Delete files from Supabase Storage
  await deleteStorageFiles(db, fileEntries.map((e) => e.url));

  // 7. Purge all cohort content from DB (dependency order)
  await db.from("grades").delete().eq("cohort_id", cohortId);
  await db.from("submissions").delete().eq("cohort_id", cohortId);
  await db.from("assignments").delete().eq("cohort_id", cohortId);
  await db.from("module_items").delete().eq("cohort_id", cohortId);
  await db.from("modules").delete().eq("cohort_id", cohortId);
  await db.from("cohort_enrollments").delete().eq("cohort_id", cohortId);
  await db.from("announcements").delete().eq("cohort_id", cohortId);
  if (surveyIds.length > 0) {
    await db.from("survey_responses").delete().in("survey_id", surveyIds);
  }
  await db.from("surveys").delete().eq("cohort_id", cohortId);
  await db.from("certificates").delete().eq("cohort_id", cohortId);
  await db.from("cohort_contacts").delete().eq("cohort_id", cohortId);

  // 8. Mark cohort as archived
  await db.from("cohorts")
    .update({ status: "archived", is_active: false, updated_at: new Date().toISOString() })
    .eq("id", cohortId);

  const filename = `cohort-${cohortSlug}-archive-${new Date().toISOString().slice(0, 10)}.zip`;

  return new NextResponse(zipBytes, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
