"use client";

import Link from "next/link";
import { Building2, CheckCircle2, XCircle } from "lucide-react";

type SchoolRow = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  country: string | null;
  is_partner: boolean;
  is_active: boolean;
  created_at: string;
};

export function AdminSchoolsTable({ rows }: { rows: SchoolRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-bio-text-muted">No schools found.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-card-border text-left text-xs text-bio-text-muted">
            <th className="pb-2 pr-4 font-medium">Name</th>
            <th className="pb-2 pr-4 font-medium">Location</th>
            <th className="pb-2 pr-4 font-medium">Partner</th>
            <th className="pb-2 pr-4 font-medium">Status</th>
            <th className="pb-2 font-medium" />
          </tr>
        </thead>
        <tbody className="divide-y divide-card-border">
          {rows.map((school) => (
            <tr key={school.id} className="group">
              <td className="py-3 pr-4">
                <Link
                  href={`/admin/schools/${school.id}`}
                  className="flex items-center gap-2 hover:text-bio-green"
                >
                  <Building2 className="h-4 w-4 shrink-0 text-bio-green/60" />
                  <span className="font-medium text-bio-text hover:text-bio-green">{school.name}</span>
                </Link>
              </td>
              <td className="py-3 pr-4">
                {[school.city, school.state, school.country].filter(Boolean).join(", ") || (
                  <span className="text-xs italic text-bio-text-muted/60">Not set</span>
                )}
              </td>
              <td className="py-3 pr-4">
                {school.is_partner ? (
                  <CheckCircle2 className="h-4 w-4 text-bio-green" />
                ) : (
                  <XCircle className="h-4 w-4 text-bio-text-muted/50" />
                )}
              </td>
              <td className="py-3 pr-4">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    school.is_active
                      ? "bg-bio-green/10 text-bio-green"
                      : "bg-bio-text-muted/10 text-bio-text-muted"
                  }`}
                >
                  {school.is_active ? "Active" : "Inactive"}
                </span>
              </td>
              <td className="py-3 text-right">
                <Link
                  href={`/admin/schools/${school.id}/edit`}
                  className="text-xs font-medium text-bio-text-muted hover:text-bio-green"
                >
                  Edit
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
