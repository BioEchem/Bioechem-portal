import { formatShortDate } from "@/lib/format/date";
import type { SupabaseAdmin, SupabaseServer } from "@/lib/supabase/types";

export type ShareholderUpdate = {
  id: string;
  title: string;
  date: string;
  excerpt: string | null;
};

export type ShareholderDocument = {
  id: string;
  title: string;
  category: string;
  createdAt: string;
};

export type ShareholderDashboardData = {
  updates: ShareholderUpdate[];
  recentDocuments: ShareholderDocument[];
  governanceDocuments: ShareholderDocument[];
  documentCountsByCategory: Record<string, number>;
  impact: {
    partnerSchools: number;
    activeCohorts: number;
    enrolledStudents: number;
    teachers: number;
  };
};

type NewsletterRow = {
  id: string;
  title: string;
  date: string;
  excerpt: string | null;
  visible_to: string[] | null;
};

type ShareholderDocRow = {
  id: string;
  title: string;
  category: string;
  created_at: string;
};

/** Loads real content for the shareholder dashboard (company updates, documents, program impact). */
export async function loadShareholderDashboardData(
  supabase: SupabaseServer,
  admin: SupabaseAdmin | null,
): Promise<ShareholderDashboardData> {
  const [{ data: newsletterRows }, { data: docRows }] = await Promise.all([
    supabase
      .from("newsletters")
      .select("id, title, date, excerpt, visible_to")
      .eq("published", true)
      .order("date", { ascending: false })
      .limit(20)
      .returns<NewsletterRow[]>(),
    supabase
      .from("shareholder_documents")
      .select("id, title, category, created_at")
      .eq("published", true)
      .order("created_at", { ascending: false })
      .returns<ShareholderDocRow[]>(),
  ]);

  // visible_to is empty for "everyone"; otherwise it must explicitly list "shareholder".
  const updates = (newsletterRows ?? [])
    .filter((n) => !n.visible_to || n.visible_to.length === 0 || n.visible_to.includes("shareholder"))
    .slice(0, 4)
    .map((n) => ({
      id: n.id,
      title: n.title,
      date: formatShortDate(n.date),
      excerpt: n.excerpt,
    }));

  const docs = docRows ?? [];
  const documentCountsByCategory: Record<string, number> = {};
  for (const doc of docs) {
    documentCountsByCategory[doc.category] = (documentCountsByCategory[doc.category] ?? 0) + 1;
  }

  const toDocSummary = (doc: ShareholderDocRow): ShareholderDocument => ({
    id: doc.id,
    title: doc.title,
    category: doc.category,
    createdAt: formatShortDate(doc.created_at),
  });

  const recentDocuments = docs.slice(0, 5).map(toDocSummary);
  const governanceDocuments = docs
    .filter((doc) => doc.category === "governance" || doc.category === "meeting")
    .slice(0, 5)
    .map(toDocSummary);

  // Program-wide counts aren't visible to a shareholder under normal RLS,
  // so this uses the service-role client for read-only aggregate stats.
  let impact = { partnerSchools: 0, activeCohorts: 0, enrolledStudents: 0, teachers: 0 };
  if (admin) {
    const [{ count: partnerSchools }, { count: activeCohorts }, { count: enrolledStudents }, { count: teachers }] =
      await Promise.all([
        admin.from("schools").select("id", { count: "exact", head: true }).eq("is_partner", true).eq("is_active", true),
        admin.from("cohorts").select("id", { count: "exact", head: true }).eq("status", "active").eq("is_active", true),
        admin
          .from("cohort_enrollments")
          .select("id", { count: "exact", head: true })
          .eq("role", "participant")
          .eq("status", "approved"),
        admin
          .from("cohort_enrollments")
          .select("id", { count: "exact", head: true })
          .eq("role", "teacher")
          .eq("status", "approved"),
      ]);

    impact = {
      partnerSchools: partnerSchools ?? 0,
      activeCohorts: activeCohorts ?? 0,
      enrolledStudents: enrolledStudents ?? 0,
      teachers: teachers ?? 0,
    };
  }

  return { updates, recentDocuments, governanceDocuments, documentCountsByCategory, impact };
}
