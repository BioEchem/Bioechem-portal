"use client";

import { useEffect, useRef, useState } from "react";

const SECTIONS = [
  { id: "home", label: "Home" },
  { id: "upcoming-events", label: "Upcoming Events" },
  { id: "past-events", label: "Past Events" },
  { id: "newsletter", label: "Newsletter" },
  { id: "about", label: "About" },
];

export function LandingSectionNav() {
  const [active, setActive] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
    const ids = SECTIONS.map((s) => s.id).filter((id) => id !== "home");

    const sectionEls = ids
      .map((id) => document.getElementById(id))
      .filter(Boolean) as HTMLElement[];

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

    function onScroll() {
      if (window.scrollY < 200) setActive("home");
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  function handleClick(id: string) {
    if (id === "home") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      setActive("home");
      return;
    }
    const el = document.getElementById(id);
    if (!el) return;
    const offset = el.getBoundingClientRect().top + window.scrollY - 130;
    window.scrollTo({ top: offset, behavior: "smooth" });
  }

  return (
    <>
      <div ref={sentinelRef} aria-hidden />

      <nav
        aria-label="Page sections"
        className={`sticky top-[65px] z-40 border-b border-card-border bg-white/95 backdrop-blur-sm transition-shadow ${
          scrolled ? "shadow-sm" : ""
        }`}
      >
        <div className="mx-auto flex max-w-5xl items-center gap-1 overflow-x-auto px-4 sm:px-6">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => handleClick(s.id)}
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
