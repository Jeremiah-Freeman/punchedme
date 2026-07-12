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

    const toTop = () => {
      if (window.location.hash) return; // respect deep-links to an anchor
      // The scroller is the .snapscroll container (falls back to the root for
      // safety). Momentarily disable snap so the jump-to-top isn't re-snapped
      // back to the last section, then restore the stylesheet's mandatory.
      const el =
        (document.querySelector(".snapscroll") as HTMLElement | null) ??
        document.documentElement;
      // Disable snap, jump to top, force a synchronous reflow so the position
      // sticks, then re-enable snap immediately. Done synchronously (no rAF) on
      // purpose: rAF callbacks are paused in backgrounded tabs, and a deferred
      // re-enable could leave snap disabled for good. scrollTop 0 is itself a
      // snap boundary, so re-enabling right away won't jump the view.
      el.style.scrollSnapType = "none";
      el.scrollTop = 0;
      window.scrollTo(0, 0);
      void el.offsetHeight; // force reflow
      el.style.scrollSnapType = "";
    };

    toTop();
    window.addEventListener("pageshow", toTop);
    return () => window.removeEventListener("pageshow", toTop);
  }, []);

  return null;
}
