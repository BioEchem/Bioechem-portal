"use client";

import { Award, Download, ExternalLink } from "lucide-react";

type Cert = {
  id: string;
  title: string;
  file_url: string;
  filename: string | null;
  uploaded_at: string;
  cohort_id: string | null;
  cohorts: { name: string } | null;
};

export function MyCertificates({ initialCerts }: { initialCerts: Cert[] }) {
  if (initialCerts.length === 0) {
    return (
      <div className="py-12 text-center">
        <Award className="mx-auto w-10 h-10 text-gray-300 mb-3" />
        <p className="text-sm text-gray-500">No certificates yet.</p>
        <p className="text-xs text-gray-400 mt-1">
          Certificates will appear here once your instructor issues them.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {initialCerts.map((cert) => (
        <div
          key={cert.id}
          className="rounded-xl border border-gray-200 bg-white p-5 flex flex-col gap-3"
        >
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600">
              <Award className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{cert.title}</p>
              {cert.cohorts?.name && (
                <p className="text-xs text-gray-500 truncate mt-0.5">{cert.cohorts.name}</p>
              )}
              <p className="text-xs text-gray-400 mt-0.5">
                Issued{" "}
                {new Date(cert.uploaded_at).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>

          <div className="flex gap-2 mt-auto">
            <a
              href={cert.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              View
            </a>
            <a
              href={cert.file_url}
              download={cert.filename ?? cert.title}
              className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-600"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}
