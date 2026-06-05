/* eslint-disable @next/next/no-img-element */

/**
 * Punched brand mascot logo.
 * Transparent PNG (lavender circle + bear), with a very soft 360° drop shadow.
 */
export function Logo({
  size = 96,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  // Render 25% larger than the requested base size
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
