import { formatShortDate } from "@/lib/format/date";
import type { SupabaseServer } from "@/lib/supabase/types";

export type PartnerSchool = {
  id: string;
  name: string;
};

export type PartnerEvent = {
  id: string;
  title: string;
  eventDate: string | null;
  location: string | null;
};

export type PartnerDocument = {
  id: string;
  title: string;
  category: string;
  createdAt: string;
};

export type PartnerDashboardData = {
  schools: PartnerSchool[];
  upcomingEvents: PartnerEvent[];
  recentDocuments: PartnerDocument[];
};

type SchoolRow = { id: string; name: string };
type EventRow = { id: string; title: string; event_date: string | null; location: string | null };
type DocRow = { id: string; title: string; category: string; created_at: string };

/** Loads real content for the industry partner dashboard. */
export async function loadPartnerDashboardData(supabase: SupabaseServer): Promise<PartnerDashboardData> {
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: schoolRows }, { data: eventRows }, { data: docRows }] =
    await Promise.all([
      supabase
        .from("schools")
        .select("id, name")
        .eq("is_partner", true)
        .eq("is_active", true)
        .order("name")
        .returns<SchoolRow[]>(),
      supabase
        .from("partner_events")
        .select("id, title, event_date, location")
        .eq("published", true)
        .gte("event_date", today)
        .order("event_date", { ascending: true })
        .limit(4)
        .returns<EventRow[]>(),
      supabase
        .from("partner_documents")
        .select("id, title, category, created_at")
        .eq("published", true)
        .order("created_at", { ascending: false })
        .limit(5)
        .returns<DocRow[]>(),
    ]);

  return {
    schools: (schoolRows ?? []).map((s) => ({ id: s.id, name: s.name })),
    upcomingEvents: (eventRows ?? []).map((e) => ({
      id: e.id,
      title: e.title,
      eventDate: e.event_date ? formatShortDate(e.event_date) : null,
      location: e.location,
    })),
    recentDocuments: (docRows ?? []).map((d) => ({
      id: d.id,
      title: d.title,
      category: d.category,
      createdAt: formatShortDate(d.created_at),
    })),
  };
}
