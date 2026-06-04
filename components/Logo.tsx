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
  return (
    <img
      src="/logo.png"
      alt="Punched"
      width={size}
      height={size}
      className={className}
      style={{ filter: "drop-shadow(0 0 20px rgba(109, 91, 226, 0.22))" }}
    />
  );
}
