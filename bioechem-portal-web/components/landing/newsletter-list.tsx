"use client";

import { useState, useEffect } from "react";
import { ExternalLink, ChevronDown, ChevronUp, Mail, X } from "lucide-react";
import { MAIN_SITE_CONTACT } from "@/lib/brand/site";

export type NewsletterEntry = {
  title: string;
  date: string;
  excerpt: string;
  link?: string;
  body?: string;
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Converts any Google Drive share/view URL to the embeddable preview URL.
 * Non-Drive URLs are returned as-is (works for direct PDF links too).
 */
function toEmbedUrl(url: string): string {
  const gdrive = url.match(
    /https:\/\/drive\.google\.com\/file\/d\/([^/]+)/,
  );
  if (gdrive) {
    // rm=minimal removes Google Drive's dark toolbar, leaving just the clean PDF
    return `https://drive.google.com/file/d/${gdrive[1]}/preview?rm=minimal`;
  }
  return url;
}

/** Renders inline body text. "# " → heading, "## " → subheading, blank line → paragraph. */
function NewsletterBody({ text }: { text: string }) {
  const paragraphs = text.trim().split(/\n\s*\n/);
  return (
    <div className="space-y-4 text-sm leading-relaxed">
      {paragraphs.map((para, i) => {
        const trimmed = para.trim();
        if (trimmed.startsWith("# ")) {
          return (
            <h3 key={i} className="text-base font-semibold text-bio-green">
              {trimmed.slice(2)}
            </h3>
          );
        }
        if (trimmed.startsWith("## ")) {
          return (
            <h4 key={i} className="font-semibold text-bio-text">
              {trimmed.slice(3)}
            </h4>
          );
        }
        return <p key={i} className="text-bio-text-muted">{trimmed}</p>;
      })}
    </div>
  );
}

function NewsletterModal({
  nl,
  onClose,
}: {
  nl: NewsletterEntry;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const embedUrl = nl.link ? toEmbedUrl(nl.link) : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={nl.title}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:px-4 sm:py-8"
      onClick={onClose}
    >
      <div
        className="relative flex w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
        style={{ maxHeight: "92vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-card-border px-5 py-4">
          <div>
            <p className="text-xs font-medium text-bio-text-muted">{fmtDate(nl.date)}</p>
            <h2 className="mt-0.5 text-base font-semibold text-bio-text">{nl.title}</h2>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {nl.link ? (
              <a
                href={nl.link}
                target="_blank"
                rel="noopener noreferrer"
                title="Open in new tab"
                className="flex items-center gap-1 rounded-lg border border-card-border px-3 py-1.5 text-xs font-medium text-bio-text-muted hover:text-bio-green"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Open
              </a>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              title="Close"
              className="rounded-full p-1.5 text-bio-text-muted hover:bg-bio-mint hover:text-bio-text"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {embedUrl ? (
            /* PDF embed — works for Google Drive and direct .pdf URLs */
            <iframe
              src={embedUrl}
              title={nl.title}
              className="h-full w-full"
              style={{ minHeight: "70vh", border: "none" }}
              allow="autoplay"
            />
          ) : nl.body ? (
            <div className="overflow-y-auto px-6 py-6">
              <NewsletterBody text={nl.body} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function NewsletterRow({ nl }: { nl: NewsletterEntry }) {
  const [open, setOpen] = useState(false);
  const hasContent = Boolean(nl.link || nl.body);

  return (
    <>
      <button
        type="button"
        onClick={() => hasContent && setOpen(true)}
        className={`group flex w-full flex-col gap-1 px-5 py-4 text-left transition-colors sm:flex-row sm:items-start sm:gap-6 ${
          hasContent ? "hover:bg-bio-mint/30 cursor-pointer" : "cursor-default"
        }`}
      >
        <p className="shrink-0 text-xs font-medium text-bio-text-muted sm:w-32 sm:pt-0.5">
          {fmtDate(nl.date)}
        </p>
        <div className="flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className={`font-medium text-bio-text transition-colors ${hasContent ? "group-hover:text-bio-green" : ""}`}>
              {nl.title}
            </p>
            {hasContent ? (
              <span className="shrink-0 rounded-full bg-bio-green/10 px-2 py-0.5 text-xs font-medium text-bio-green">
                Read
              </span>
            ) : (
              <span className="shrink-0 rounded-full bg-bio-mint px-2 py-0.5 text-xs text-bio-text-muted">
                Coming soon
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-bio-text-muted">{nl.excerpt}</p>
          {!hasContent ? (
            <p className="mt-1.5 flex items-center gap-1 text-xs text-bio-text-muted">
              <Mail className="h-3 w-3" />
              <a
                href={`mailto:${MAIN_SITE_CONTACT.email}`}
                className="hover:text-bio-green hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {MAIN_SITE_CONTACT.email}
              </a>
            </p>
          ) : null}
        </div>
      </button>

      {open ? <NewsletterModal nl={nl} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

export function NewsletterList({ newsletters }: { newsletters: NewsletterEntry[] }) {
  return (
    <div className="mt-6 divide-y divide-card-border overflow-hidden rounded-xl border border-card-border">
      {newsletters.map((nl) => (
        <NewsletterRow key={nl.title} nl={nl} />
      ))}
    </div>
  );
}
