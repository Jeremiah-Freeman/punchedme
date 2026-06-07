"use client";

import { useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";

interface Props {
  slug: string;
  businessName: string;
  brandColor: string;
  logoUrl: string | null;
  rewardName: string;
  punchesRequired: number;
}

export default function DisplayClient({
  slug,
  businessName,
  brandColor,
  logoUrl,
  rewardName,
  punchesRequired,
}: Props) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://punched.me";
  const joinUrl = `${appUrl}/b/${slug}/join`;

  // Auto-reload at midnight so Mo art stays fresh each day
  useEffect(() => {
    const now = new Date();
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    const msUntilMidnight = midnight.getTime() - now.getTime();
    const timer = setTimeout(() => window.location.reload(), msUntilMidnight);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "#0f0f1a",
        display: "flex",
        overflow: "hidden",
        userSelect: "none",
      }}
    >
      {/* ── LEFT: Mo + business info ── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px",
          gap: "24px",
          borderRight: "1px solid #1e1e38",
        }}
      >
        {/* Logo / Mo bear */}
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={businessName}
            style={{
              width: 108,
              height: 108,
              borderRadius: "50%",
              objectFit: "cover",
              border: `3px solid ${brandColor}`,
            }}
          />
        ) : (
          <div
            style={{
              width: 108,
              height: 108,
              borderRadius: "50%",
              background: brandColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 56,
              flexShrink: 0,
            }}
          >
            🐻
          </div>
        )}

        {/* Business name */}
        <div style={{ textAlign: "center" }}>
          <p
            style={{
              color: "#e8e8f8",
              fontSize: 30,
              fontWeight: 400,
              margin: "0 0 6px",
              letterSpacing: "-0.5px",
            }}
          >
            {businessName}
          </p>
          <p
            style={{
              color: "#55558a",
              fontSize: 12,
              margin: 0,
              textTransform: "uppercase",
              letterSpacing: "2px",
            }}
          >
            Loyalty Rewards
          </p>
        </div>

        {/* Reward info pill */}
        <div
          style={{
            background: "#13132a",
            borderRadius: 12,
            padding: "14px 24px",
            textAlign: "center",
            border: "1px solid #22224a",
          }}
        >
          <p style={{ color: "#a5b4fc", fontSize: 15, margin: "0 0 4px" }}>
            {rewardName}
          </p>
          <p style={{ color: "#6366f1", fontSize: 12, margin: 0 }}>
            after {punchesRequired} visits
          </p>
        </div>
      </div>

      {/* ── RIGHT: QR code ── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px",
          gap: "20px",
        }}
      >
        <p
          style={{
            color: "#55558a",
            fontSize: 11,
            margin: 0,
            textTransform: "uppercase",
            letterSpacing: "2.5px",
          }}
        >
          Scan to punch in
        </p>

        {/* QR */}
        <div
          style={{
            background: "white",
            padding: 16,
            borderRadius: 16,
            lineHeight: 0,
          }}
        >
          <QRCodeSVG
            value={joinUrl}
            size={210}
            level="M"
            bgColor="#ffffff"
            fgColor="#111111"
          />
        </div>

        {/* Subtle brand footer */}
        <p
          style={{
            color: "#2a2a50",
            fontSize: 11,
            margin: 0,
            letterSpacing: "1px",
          }}
        >
          punched.me
        </p>
      </div>
    </div>
  );
}
