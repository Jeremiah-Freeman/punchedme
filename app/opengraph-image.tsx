import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";

// Route segment config
export const runtime = "nodejs";
export const alt = "Punched.me — Digital punch cards without the stupid card.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Embed the "Do you have your punch card?" hero illustration (whitespace-trimmed, ~3:1)
const hero = readFileSync(join(process.cwd(), "public/do-you-trimmed.png"));
const heroSrc = `data:image/png;base64,${hero.toString("base64")}`;

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
          padding: "40px 80px",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={heroSrc} width={920} height={304} alt="Do you have your punch card?" style={{ objectFit: "contain", marginBottom: 28 }} />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 60, fontWeight: 700, color: "#111827", lineHeight: 1.1 }}>
            Digital punch cards
          </div>
          <div style={{ fontSize: 60, fontWeight: 700, color: "#6366f1", lineHeight: 1.1 }}>
            without the stupid…punch cards
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
