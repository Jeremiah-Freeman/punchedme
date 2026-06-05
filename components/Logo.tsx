/* eslint-disable @next/next/no-img-element */

/**
 * Punched brand logo.
 *
 * wordmark=false (default) — bear mascot icon only (square). Used on auth pages,
 *   onboarding, and anywhere you want the icon standalone.
 *
 * wordmark=true — bear + "Punched" text lockup (wide). Used in nav bars and
 *   sidebars in place of icon + separate "Punched" text.
 *   `size` controls the height in px; width is auto (aspect ratio ~3.27:1).
 */
export function Logo({
  size = 96,
  wordmark = false,
  className = "",
}: {
  size?: number;
  wordmark?: boolean;
  className?: string;
}) {
  if (wordmark) {
    // Wordmark: 1092×334 natural size — render at requested height, auto width
    const h = Math.round(size * 1.25);
    return (
      <img
        src="/logo-wordmark.png"
        alt="Punched"
        height={h}
        className={className}
        style={{ height: h, width: "auto" }}
      />
    );
  }

  // Icon only — render 25% larger than the requested base size
  const px = Math.round(size * 1.25);
  return (
    <img
      src="/logo.png"
      alt="Punched"
      width={px}
      height={px}
      className={className}
      style={{ filter: "drop-shadow(0 0 28px rgba(109, 91, 226, 0.11))" }}
    />
  );
}
