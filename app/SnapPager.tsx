"use client";

import { useEffect } from "react";

/**
 * Threshold snapping for pointer devices (mouse / trackpad).
 *
 * Native CSS scroll-snap only snaps AFTER the wheel gesture + momentum finish —
 * so on desktop you scroll, let go, THEN it snaps. This takes over the wheel: the
 * moment the user pushes past a small threshold, it smooth-scrolls a full section
 * for them (one section per gesture) and locks briefly so momentum can't overshoot.
 *
 * Touch devices are left untouched — native snap already feels immediate there, and
 * hijacking touch is where scroll-jacking gets janky. Reduced-motion users get an
 * instant jump instead of a smooth glide.
 */
export default function SnapPager() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    // Pointer devices only. Touch keeps the native snap.
    if (!window.matchMedia("(pointer: fine)").matches) return;

    const container = document.querySelector(".snapscroll") as HTMLElement | null;
    if (!container) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const ANIM = reduce ? 100 : 560; // glide duration before the section is "settled"
    const IDLE = 180; // ms of wheel silence required before a new gesture counts

    let locked = false;
    let animDone = false;
    let animTimer: number | undefined;
    let idleTimer: number | undefined;

    const sections = () =>
      Array.from(container.querySelectorAll<HTMLElement>(".snap"));
    const currentIndex = () =>
      Math.round(container.scrollTop / (container.clientHeight || 1));

    const unlock = () => {
      container.style.scrollSnapType = ""; // back to the stylesheet's mandatory
      locked = false;
    };
    // Re-arm the idle countdown. Only unlocks once the glide has finished AND the
    // wheel has been quiet for IDLE ms — so a single hard flick (one long momentum
    // tail) advances exactly one section instead of two.
    const armIdle = () => {
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => {
        if (animDone) unlock();
        else armIdle();
      }, IDLE);
    };

    const goTo = (i: number) => {
      const list = sections();
      const target = list[Math.max(0, Math.min(list.length - 1, i))];
      if (!target) return;
      locked = true;
      animDone = false;
      // Relax mandatory snap so it doesn't fight the programmatic glide mid-flight.
      container.style.scrollSnapType = "none";
      target.scrollIntoView({
        behavior: reduce ? "auto" : "smooth",
        block: "start",
      });
      window.clearTimeout(animTimer);
      animTimer = window.setTimeout(() => {
        animDone = true;
        armIdle();
      }, ANIM);
    };

    const THRESHOLD = 8; // px of vertical intent before we take over
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return; // ignore horizontal
      if (locked) {
        e.preventDefault(); // swallow momentum so it can't overshoot the section
        armIdle(); // every event pushes the unlock further out
        return;
      }
      if (Math.abs(e.deltaY) < THRESHOLD) return; // tiny nudge — let it be
      e.preventDefault();
      goTo(currentIndex() + (e.deltaY > 0 ? 1 : -1));
    };

    container.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", onWheel);
      window.clearTimeout(animTimer);
      window.clearTimeout(idleTimer);
      container.style.scrollSnapType = "";
    };
  }, []);

  return null;
}
