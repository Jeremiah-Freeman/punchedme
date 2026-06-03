"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { CheckCircle, ArrowRight, Printer } from "lucide-react";

interface BusinessData {
  name: string;
  slug: string;
  brand_color: string;
}

export default function OnboardingSuccessPage() {
  const router = useRouter();
  const [business, setBusiness] = useState<BusinessData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/business/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.business) setBusiness(data.business);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const joinUrl = business
    ? `${typeof window !== "undefined" ? window.location.origin : "https://punched.me"}/b/${business.slug}/join`
    : "";

  function handlePrint() {
    window.print();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="animate-pulse text-gray-400 text-sm">Setting up your program…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-start justify-center px-4 py-12">
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="text-center mb-8">
          <span className="text-2xl font-bold text-gray-900 tracking-tight">Punched.me</span>
        </div>

        {/* Success card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

          {/* Top banner */}
          <div className="bg-green-50 border-b border-green-100 px-6 py-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
            <div>
              <p className="font-semibold text-green-900 text-sm">You&apos;re live! 🎉</p>
              <p className="text-green-700 text-xs mt-0.5">
                {business?.name ?? "Your business"}&apos;s loyalty program is ready.
              </p>
            </div>
          </div>

          <div className="p-6 space-y-6">

            {/* QR Code */}
            <div className="flex flex-col items-center gap-4">
              <p className="text-sm font-semibold text-gray-800 text-center">
                Your customer QR code
              </p>

              {business && (
                <div
                  className="p-5 rounded-2xl border-2 print:border-gray-300"
                  style={{ borderColor: business.brand_color + "40", backgroundColor: business.brand_color + "08" }}
                >
                  <QRCodeSVG
                    value={joinUrl}
                    size={200}
                    fgColor={business.brand_color}
                    bgColor="transparent"
                    level="H"
                  />
                </div>
              )}

              <div className="text-center">
                <p className="text-xs text-gray-500">Customer scans this → gets punch card in their wallet</p>
                {business && (
                  <p className="text-[11px] text-gray-400 font-mono mt-1 break-all">{joinUrl}</p>
                )}
              </div>
            </div>

            {/* What to do next */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-100">
              <p className="text-sm font-semibold text-gray-800">What to do now</p>
              <div className="space-y-2.5">
                {[
                  { icon: "🖨️", text: "Print this QR code and put it at your counter" },
                  { icon: "📱", text: "Customers scan it — punch card goes to their Apple or Google Wallet instantly" },
                  { icon: "✅", text: "Each visit, they scan your scan-mode QR to punch in" },
                  { icon: "🎁", text: "When they hit your goal, they get a phone notification automatically" },
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className="text-base shrink-0">{step.icon}</span>
                    <p className="text-sm text-gray-600">{step.text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Printer className="w-4 h-4" />
                Print QR code
              </button>

              <button
                onClick={() => router.push("/dashboard")}
                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors"
              >
                Go to my dashboard
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer tip */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Need help? Email <a href="mailto:hello@punched.me" className="underline">hello@punched.me</a>
        </p>
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .print-qr, .print-qr * { visibility: visible; }
          .print-qr { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); }
        }
      `}</style>
    </div>
  );
}
