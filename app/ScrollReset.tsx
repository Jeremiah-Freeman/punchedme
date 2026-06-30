"use client";

import { useEffect } from "react";

/**
 * Start the landing page at the top on every load.
 *
 * The homepage uses mandatory scroll-snap on mobile. With the browser's default
 * `scrollRestoration: "auto"`, a reload restores the previous scroll position —
 * and the snap then "sticks" you mid-page (e.g. on the trust band) instead of
 * starting at the hero. Switching to manual restoration (and nudging to top on
 * first mount) makes reloads always begin at the top, while leaving the
 * scroll-down snapping untouched.
 */
export default function ScrollReset() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    if (!window.location.hash) window.scrollTo(0, 0);
  }, []);

  return null;
}
