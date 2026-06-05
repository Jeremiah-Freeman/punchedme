"use client";

/* eslint-disable @next/next/no-img-element */
import { QRCodeSVG } from "qrcode.react";

function hexToRgba(hex: string, alpha: number): string {
  const m = hex.replace("#", "");
  const r = parseInt(m.substring(0, 2), 16);
  const g = parseInt(m.substring(2, 4), 16);
  const b = parseInt(m.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function PunchDots({
  total,
  filled,
  color,
}: {
  total: number;
  filled: number;
  color: string;
}) {
  return (
    <div className="flex items-center justify-center gap-1.5 flex-wrap my-3">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="rounded-full transition-colors"
          style={{
            width: 13,
            height: 13,
            backgroundColor: i < filled ? color : "transparent",
            border: `1.5px solid ${i < filled ? color : hexToRgba(color, 0.35)}`,
          }}
        />
      ))}
    </div>
  );
}

function PassCard({
  businessName,
  reward,
  punchesRequired,
  brandColor,
  logoUrl,
}: PassPreviewProps) {
  const name = businessName?.trim() || "Punched Loyalty";
  const rewardText = reward?.trim() || "Your reward here";
  const filled = Math.max(1, Math.round(punchesRequired * 0.7));

  return (
    <div
      className="rounded-2xl p-4 w-full"
      style={{ backgroundColor: hexToRgba(brandColor, 0.12) }}
    >
      {/* Header: logo + name | punches */}
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center overflow-hidden shrink-0">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: brandColor, fontSize: "0.75rem" }}
              >
                {name.replace(/[^A-Z]/g, "").slice(0, 2) || name.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
          <span
            className="font-bold text-gray-900 uppercase leading-tight truncate"
            style={{ fontSize: "0.8rem", letterSpacing: "0.02em" }}
          >
            {name}
          </span>
        </div>
        <div className="text-right shrink-0">
          <div
            className="uppercase tracking-wide font-semibold"
            style={{ fontSize: "0.6rem", color: hexToRgba(brandColor, 0.9) }}
          >
            Punches
          </div>
          <div className="font-bold text-gray-900" style={{ fontSize: "1.05rem" }}>
            {filled} / {punchesRequired}
          </div>
        </div>
      </div>

      {/* Punch dots */}
      <PunchDots total={punchesRequired} filled={filled} color={brandColor} />

      {/* Reward */}
      <div className="mb-3">
        <div
          className="uppercase tracking-wide font-semibold"
          style={{ fontSize: "0.6rem", color: hexToRgba(brandColor, 0.9) }}
        >
          Reward
        </div>
        <div className="text-gray-900 font-semibold" style={{ fontSize: "1rem" }}>
          {rewardText}
        </div>
      </div>

      {/* QR */}
      <div className="bg-white rounded-xl shadow-sm w-fit mx-auto px-5 py-3 flex flex-col items-center">
        <QRCodeSVG value="punched.me/demo" size={74} />
        <span className="text-gray-500 mt-1.5" style={{ fontSize: "0.65rem" }}>
          John
        </span>
      </div>
    </div>
  );
}

export type PassPreviewProps = {
  businessName: string;
  reward: string;
  punchesRequired: number;
  brandColor: string;
  logoUrl?: string | null;
};

export function PassPreviews(props: PassPreviewProps) {
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {/* Apple — framed in a mini iPhone */}
      <div>
        <p className="text-[10px] text-gray-400 mb-1.5 uppercase tracking-wide text-center">
          iPhone · Apple Wallet
        </p>
        <div className="mx-auto w-fit rounded-[2rem] border-[6px] border-gray-900 bg-gray-50 p-2.5 max-w-full">
          <div className="flex justify-between items-center px-2 pb-1.5">
            <span className="text-[9px] font-semibold text-gray-900">9:41</span>
            <div className="w-12 h-3.5 bg-gray-900 rounded-full" />
            <span className="text-[9px] text-gray-900">📶</span>
          </div>
          <PassCard {...props} />
        </div>
      </div>

      {/* Google — plain rounded card */}
      <div>
        <p className="text-[10px] text-gray-400 mb-1.5 uppercase tracking-wide text-center">
          Android · Google Wallet
        </p>
        <div className="pt-5">
          <PassCard {...props} />
        </div>
      </div>
    </div>
  );
}
