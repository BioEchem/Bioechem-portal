"use client";

import { useEffect, useRef, useState } from "react";

const SECTIONS = [
  { id: "events", label: "Events" },
  { id: "newsletter", label: "Newsletter" },
  { id: "about", label: "About" },
  { id: "join", label: "Join" },
];

export function LandingSectionNav({ showJoin }: { showJoin: boolean }) {
  // Track which section is currently in view
  const [active, setActive] = useState<string | null>(null);
  // Track whether the nav has scrolled past the hero so we can show a shadow
  const [scrolled, setScrolled] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Show shadow once nav is stuck (sentinel scrolled off screen)
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const stickyObserver = new IntersectionObserver(
      ([entry]) => setScrolled(!entry.isIntersecting),
      { threshold: 0 },
    );
    stickyObserver.observe(sentinel);
    return () => stickyObserver.disconnect();
  }, []);

  useEffect(() => {
    // Highlight the section currently visible in the viewport
    const ids = showJoin
      ? SECTIONS.map((s) => s.id)
      : SECTIONS.filter((s) => s.id !== "join").map((s) => s.id);

    const sectionEls = ids
      .map((id) => document.getElementById(id))
      .filter(Boolean) as HTMLElement[];

    if (sectionEls.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: "-30% 0px -60% 0px", threshold: 0 },
    );

    sectionEls.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [showJoin]);

  function scrollTo(id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    // account for sticky header + this nav bar
    const offset = el.getBoundingClientRect().top + window.scrollY - 130;
    window.scrollTo({ top: offset, behavior: "smooth" });
  }

  const visibleSections = showJoin ? SECTIONS : SECTIONS.filter((s) => s.id !== "join");

  return (
    <>
      {/* Sentinel sits in the normal flow right above the nav */}
      <div ref={sentinelRef} aria-hidden />

      <nav
        aria-label="Page sections"
        className={`sticky top-[65px] z-40 border-b border-card-border bg-white/95 backdrop-blur-sm transition-shadow ${
          scrolled ? "shadow-sm" : ""
        }`}
      >
        <div className="mx-auto flex max-w-5xl items-center gap-1 overflow-x-auto px-4 sm:px-6">
          {visibleSections.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => scrollTo(s.id)}
              className={`shrink-0 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                active === s.id
                  ? "border-bio-green text-bio-green"
                  : "border-transparent text-bio-text-muted hover:text-bio-text"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}
