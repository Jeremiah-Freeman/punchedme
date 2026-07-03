"use client";

import { useEffect } from "react";

/**
 * Start the landing page at the top on every load / refresh.
 *
 * The homepage uses mandatory scroll-snap. Two things fight "start at top":
 *   1. The browser's default scrollRestoration restores the old position.
 *   2. `scroll-snap-type: mandatory` makes browsers RE-SNAP to the last snapped
 *      section on reload, which overrides scrollRestoration entirely.
 *
 * So we set manual restoration AND momentarily disable snap while we jump to the
 * top, then re-enable it on the next frame (downward snapping stays intact). We
 * also handle `pageshow` so iOS pull-to-refresh and back/forward (bfcache)
 * restores land at the top too.
 */
export default function ScrollReset() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";

    const root = document.documentElement;
    const toTop = () => {
      if (window.location.hash) return; // respect deep-links to an anchor
      const prev = root.style.scrollSnapType;
      root.style.scrollSnapType = "none";
      window.scrollTo(0, 0);
      requestAnimationFrame(() => {
        window.scrollTo(0, 0);
        root.style.scrollSnapType = prev; // back to the stylesheet's mandatory
      });
    };

    toTop();
    window.addEventListener("pageshow", toTop);
    return () => window.removeEventListener("pageshow", toTop);
  }, []);

  return null;
}
