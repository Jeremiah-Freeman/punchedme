import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";

// Route segment config
export const runtime = "nodejs";
export const alt = "Punched.me — Digital punch cards without the stupid card.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Embed the purple "Punched" wordmark (already in brand font)
const logo = readFileSync(join(process.cwd(), "public/punched-only.png"));
const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;

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
          padding: "80px",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoSrc} width={520} alt="Punched" style={{ marginBottom: 56 }} />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 64, fontWeight: 700, color: "#111827", lineHeight: 1.1 }}>
            Digital punch cards
          </div>
          <div style={{ fontSize: 64, fontWeight: 700, color: "#6366f1", lineHeight: 1.1, marginBottom: 36 }}>
            without the stupid…punch cards
          </div>
          <div style={{ fontSize: 34, color: "#6b7280" }}>
            No app · No login · No friction
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
