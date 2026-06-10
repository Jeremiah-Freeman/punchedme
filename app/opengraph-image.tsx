import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";

// Route segment config
export const runtime = "nodejs";
export const alt = "Do you have your punch card?";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  // Read the photo lazily INSIDE the handler. Doing this at module top-level
  // breaks every route's metadata resolution: Next imports this module to read
  // the OG metadata for all pages, and on dynamic routes (e.g. /dashboard) the
  // serverless function doesn't bundle public/*, so the top-level read throws
  // ENOENT and 500s the page. Only the OG-image function actually runs Image(),
  // and that function does have the file.
  const hero = readFileSync(join(process.cwd(), "public/do-you-have-your-punch-card.png"));
  const heroSrc = `data:image/png;base64,${hero.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={heroSrc} width={1008} height={806} alt="Do you have your punch card?" style={{ objectFit: "contain" }} />
      </div>
    ),
    { ...size }
  );
}
