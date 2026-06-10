"use client";

import { useState, useEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Download, ExternalLink } from "lucide-react";

export default function AssetsPage() {
  const [business, setBusiness] = useState<{ name: string; slug: string; brand_color: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    fetch("/api/business/me")
      .then((r) => r.json())
      .then((d) => setBusiness(d.business));
  }, []);

  const joinUrl = business
    ? `${window.location.origin}/b/${business.slug}/join`
    : "";

  const scanUrl = business
    ? `${window.location.origin}/dashboard/scan`
    : "";

  function copyJoinUrl() {
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function downloadQR() {
    if (!qrRef.current) return;
    const svg = qrRef.current;
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svg);
    const blob = new Blob([svgStr], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "punchedme-signup-qr.svg";
    a.click();
  }

  if (!business) {
    return (
      <div className="p-6 max-w-xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-64 bg-gray-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Assets</h1>
      <p className="text-gray-500 text-sm mb-8">Download your counter QR and share your program link.</p>

      {/* Counter QR Code */}
      <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
        <h2 className="font-semibold text-gray-900 mb-1">Customer Sign-up QR</h2>
        <p className="text-sm text-gray-500 mb-5">
          Print this and put it at your counter. Customers scan to join in under 20 seconds.
        </p>

        {/* Printable card preview */}
        <div
          className="mx-auto w-64 rounded-2xl text-white p-6 text-center shadow-lg mb-5"
          style={{ background: business.brand_color }}
        >
          <p className="text-sm font-medium opacity-90 mb-1">{business.name}</p>
          <p className="text-xs opacity-70 mb-4">Scan to join rewards</p>
          <div className="bg-white rounded-xl p-3 inline-block">
            <QRCodeSVG
              ref={qrRef}
              value={joinUrl}
              size={160}
              level="M"
              bgColor="white"
              fgColor="#111827"
            />
          </div>
          <p className="text-xs opacity-60 mt-3">No app. No card. Just your phone.</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={downloadQR}
            className="flex-1 flex items-center justify-center gap-2 border border-gray-300 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Download QR (SVG)
          </button>
          <button
            onClick={() => window.print()}
            className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            Print
          </button>
        </div>
      </div>

      {/* Join URL */}
      <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
        <h2 className="font-semibold text-gray-900 mb-1">Customer Join URL</h2>
        <p className="text-sm text-gray-500 mb-4">
          Share this link in emails, social media, or on receipts.
        </p>
        <div className="flex gap-2">
          <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono text-gray-700 truncate">
            {joinUrl}
          </div>
          <button
            onClick={copyJoinUrl}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors whitespace-nowrap"
          >
            <Copy className="w-4 h-4" />
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <a
          href={joinUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-indigo-600 hover:underline mt-2"
        >
          Preview join page <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Staff scan URL */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h2 className="font-semibold text-gray-900 mb-1">Staff Scan URL</h2>
        <p className="text-sm text-gray-500 mb-4">
          Open this on any phone, iPad, or laptop at the register. Bookmark it.
        </p>
        <div className="flex gap-2">
          <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono text-gray-700 truncate">
            {scanUrl}
          </div>
          <a
            href={scanUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors whitespace-nowrap"
          >
            <ExternalLink className="w-4 h-4" />
            Open
          </a>
        </div>
      </div>
    </div>
  );
}
