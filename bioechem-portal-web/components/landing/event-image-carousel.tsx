"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";

const AUTO_ADVANCE_MS = 4000;

/**
 * Converts a Google Drive share/view URL to a directly embeddable image URL.
 * Non-Drive URLs are returned unchanged.
 *
 * Drive share URL:  https://drive.google.com/file/d/FILE_ID/view?usp=sharing
 * Direct image URL: https://drive.google.com/uc?export=view&id=FILE_ID
 */
function toDirectImageUrl(url: string): string {
  const match = url.match(/\/file\/d\/([^/]+)/);
  if (match) {
    return `https://drive.google.com/uc?export=view&id=${match[1]}`;
  }
  return url;
}

export function EventImageCarousel({
  images: rawImages,
  title,
}: {
  images: string[];
  title: string;
}) {
  const images = rawImages.map(toDirectImageUrl);
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [lightbox, setLightbox] = useState(false);

  const multi = images.length > 1;

  const next = useCallback(
    () => setCurrent((c) => (c + 1) % images.length),
    [images.length],
  );
  const prev = useCallback(
    () => setCurrent((c) => (c - 1 + images.length) % images.length),
    [images.length],
  );

  // Auto-advance; pause while hovered or lightbox is open
  useEffect(() => {
    if (!multi || paused || lightbox) return;
    const t = setInterval(next, AUTO_ADVANCE_MS);
    return () => clearInterval(t);
  }, [multi, paused, lightbox, next]);

  // Keyboard: arrows navigate, Escape closes lightbox
  useEffect(() => {
    if (!lightbox) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLightbox(false);
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, next, prev]);

  // Lock body scroll when lightbox is open
  useEffect(() => {
    document.body.style.overflow = lightbox ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [lightbox]);

  // Placeholder when no images provided
  if (images.length === 0) {
    return (
      <div className="bio-gradient-header flex h-52 items-center justify-center select-none">
        <span className="text-4xl font-bold text-white/20">BioEchem</span>
      </div>
    );
  }

  return (
    <>
      {/* ── Carousel strip ── */}
      <div
        className="group relative h-52 overflow-hidden bg-black"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[current]}
          alt={`${title} — photo ${current + 1} of ${images.length}`}
          className="h-full w-full object-cover transition-opacity duration-500"
        />

        {/* Expand / lightbox button */}
        <button
          type="button"
          onClick={() => setLightbox(true)}
          title="View full size"
          className="absolute right-2 top-2 rounded-full bg-black/50 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/70"
        >
          <Maximize2 className="h-4 w-4" />
        </button>

        {multi ? (
          <>
            {/* Prev arrow */}
            <button
              type="button"
              onClick={prev}
              title="Previous photo"
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/70"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {/* Next arrow */}
            <button
              type="button"
              onClick={next}
              title="Next photo"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/70"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            {/* Dot indicators */}
            <div className="absolute bottom-2.5 left-1/2 flex -translate-x-1/2 gap-1.5">
              {images.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCurrent(i)}
                  title={`Photo ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === current ? "w-5 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80"
                  }`}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>

      {/* ── Lightbox ── */}
      {lightbox ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${title} photos`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/92 px-4"
          onClick={() => setLightbox(false)}
        >
          {/* Stop click propagation on the inner content */}
          <div
            className="relative flex w-full max-w-5xl flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              type="button"
              onClick={() => setLightbox(false)}
              title="Close"
              className="absolute -top-10 right-0 rounded-full p-1 text-white/70 hover:text-white"
            >
              <X className="h-6 w-6" />
            </button>

            {/* Full-size image */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={images[current]}
              alt={`${title} — photo ${current + 1} of ${images.length}`}
              className="max-h-[80vh] w-full rounded-xl object-contain shadow-2xl"
            />

            {multi ? (
              <>
                {/* Prev */}
                <button
                  type="button"
                  onClick={prev}
                  title="Previous photo"
                  className="absolute left-0 top-1/2 -translate-x-4 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/25 sm:-translate-x-12"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>

                {/* Next */}
                <button
                  type="button"
                  onClick={next}
                  title="Next photo"
                  className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 rounded-full bg-white/10 p-3 text-white hover:bg-white/25 sm:translate-x-12"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>

                {/* Counter + dots */}
                <div className="mt-4 flex flex-col items-center gap-2">
                  <p className="text-sm text-white/50">
                    {current + 1} / {images.length}
                  </p>
                  <div className="flex gap-2">
                    {images.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setCurrent(i)}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          i === current ? "w-6 bg-white" : "w-1.5 bg-white/30 hover:bg-white/60"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
