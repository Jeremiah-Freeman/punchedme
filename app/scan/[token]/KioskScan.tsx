"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Camera, Keyboard, Phone, RotateCcw, CheckCircle2, Gift, Ban, XCircle } from "lucide-react";
import type { ScanResult } from "@/lib/types";

type ScanMode = "camera" | "usb" | "manual";
type ScanState = "idle" | "scanning" | "success" | "reward_available" | "blocked" | "invalid";

/**
 * The unattended-kiosk version of Scan Mode. Same scanning UX as the dashboard
 * page, but authorized only by the device token in the URL — no dashboard, no
 * business lookup, no settings. Talks exclusively to /api/scans/kiosk.
 */
export function KioskScan({
  deviceToken,
  businessName,
  label,
}: {
  deviceToken: string;
  businessName: string;
  label: string;
}) {
  const [mode, setMode] = useState<ScanMode>("usb");
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [processing, setProcessing] = useState(false);
  const [phoneSearch, setPhoneSearch] = useState("");
  const [cameraError, setCameraError] = useState("");
  const [disconnected, setDisconnected] = useState(false);

  const usbInputRef = useRef<HTMLInputElement>(null);
  const usbBuffer = useRef("");
  const usbTimeout = useRef<ReturnType<typeof setTimeout>>();

  const cameraContainerId = "qr-reader";
  const scannerRef = useRef<{ clear: () => void } | null>(null);

  // Single authorized call to the kiosk API. A 410 means the owner revoked this
  // device — flip into the permanent "disconnected" state so it stops scanning.
  const kioskFetch = useCallback(
    async (payload: Record<string, unknown>) => {
      const res = await fetch("/api/scans/kiosk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceToken, ...payload }),
      });
      if (res.status === 410) setDisconnected(true);
      return res;
    },
    [deviceToken]
  );

  const processToken = useCallback(
    async (token: string) => {
      if (processing || !token.trim()) return;
      setProcessing(true);
      const cleanToken = token.trim();

      try {
        const res = await kioskFetch({ action: "punch", scannedToken: cleanToken });
        const data: ScanResult = await res.json();
        setResult(data);
        setScanState(data.status as ScanState);

        if (data.status === "blocked" || data.status === "invalid") {
          setTimeout(() => {
            setScanState("idle");
            setResult(null);
          }, 4000);
        }
      } catch {
        setResult({
          status: "invalid",
          customerName: "",
          currentPunches: 0,
          punchesRequired: 0,
          rewardAvailable: false,
          message: "Network error. Try again.",
        });
        setScanState("invalid");
        setTimeout(() => {
          setScanState("idle");
          setResult(null);
        }, 3000);
      } finally {
        setProcessing(false);
        if (mode === "usb") {
          setTimeout(() => usbInputRef.current?.focus(), 100);
        }
      }
    },
    [processing, mode, kioskFetch]
  );

  // USB barcode scanner handler (the primary kiosk input).
  useEffect(() => {
    if (mode !== "usb") return;

    function handleKeyDown(e: KeyboardEvent) {
      if (
        document.activeElement instanceof HTMLInputElement &&
        document.activeElement !== usbInputRef.current
      )
        return;

      if (e.key === "Enter") {
        const token = usbBuffer.current.trim();
        usbBuffer.current = "";
        if (token.length > 8) processToken(token);
        return;
      }

      if (e.key.length === 1) {
        usbBuffer.current += e.key;
        clearTimeout(usbTimeout.current);
        usbTimeout.current = setTimeout(() => {
          usbBuffer.current = "";
        }, 100);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    usbInputRef.current?.focus();
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [mode, processToken]);

  // Camera scanner.
  useEffect(() => {
    if (mode !== "camera") {
      scannerRef.current?.clear();
      scannerRef.current = null;
      setCameraError("");
      return;
    }

    setCameraError("");
    let mounted = true;

    import("html5-qrcode").then(({ Html5Qrcode }) => {
      if (!mounted) return;
      const qr = new Html5Qrcode(cameraContainerId);

      qr.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          let token = decodedText;
          try {
            const url = new URL(decodedText);
            const pathParts = url.pathname.split("/");
            const passIdx = pathParts.indexOf("pass");
            if (passIdx !== -1 && pathParts[passIdx + 1]) token = pathParts[passIdx + 1];
            const scanParam = url.searchParams.get("token");
            if (scanParam) token = scanParam;
          } catch {
            // Not a URL — use raw token.
          }
          processToken(token);
        },
        undefined
      ).catch((err: Error) => {
        if (!mounted) return;
        const msg = (err?.message ?? String(err)).toLowerCase();
        if (msg.includes("permission") || msg.includes("denied") || msg.includes("notallowed")) {
          setCameraError("Camera access denied. Allow camera access in browser settings, then switch back to Camera mode.");
        } else {
          setCameraError("Camera couldn't start. Check that nothing else is using it, then try again.");
        }
      });

      scannerRef.current = { clear: () => { qr.stop().catch(() => {}); } };
    });

    return () => {
      mounted = false;
      scannerRef.current?.clear();
      scannerRef.current = null;
    };
  }, [mode, processToken]);

  async function handleRedeem() {
    if (!result?.customerId || !result?.programId) return;
    setProcessing(true);
    try {
      const res = await kioskFetch({
        action: "redeem",
        customerId: result.customerId,
        programId: result.programId,
      });
      const data = await res.json();
      if (res.ok) {
        setResult({
          ...result,
          status: "success",
          currentPunches: data.newPunches,
          rewardAvailable: false,
          message: `Reward redeemed. ${data.customerName} is back to ${data.newPunches} punches.`,
        });
        setScanState("success");
        setTimeout(() => {
          setScanState("idle");
          setResult(null);
        }, 4000);
      }
    } finally {
      setProcessing(false);
    }
  }

  function handleReset() {
    setScanState("idle");
    setResult(null);
    setPhoneSearch("");
    if (mode === "usb") setTimeout(() => usbInputRef.current?.focus(), 100);
  }

  async function handlePhoneSearch(e: React.FormEvent) {
    e.preventDefault();
    const res = await kioskFetch({ action: "lookup", phone: phoneSearch });
    if (res.ok) {
      const data = await res.json();
      if (data.token) {
        processToken(data.token);
        setPhoneSearch("");
      }
    }
  }

  const stateConfig: Record<string, { bg: string; icon: React.ReactNode; title: string }> = {
    success: {
      bg: "bg-green-50 border-green-200",
      icon: <CheckCircle2 className="w-12 h-12 text-green-500" />,
      title: "Punch added",
    },
    reward_available: {
      bg: "bg-amber-50 border-amber-200",
      icon: <Gift className="w-12 h-12 text-amber-500" />,
      title: "Reward available!",
    },
    blocked: {
      bg: "bg-orange-50 border-orange-200",
      icon: <Ban className="w-12 h-12 text-orange-400" />,
      title: "Already punched",
    },
    invalid: {
      bg: "bg-red-50 border-red-200",
      icon: <XCircle className="w-12 h-12 text-red-400" />,
      title: "Invalid pass",
    },
  };

  if (disconnected) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <div className="text-5xl mb-4">🔌</div>
          <h1 className="text-white text-xl font-bold mb-2">Kiosk disconnected</h1>
          <p className="text-gray-400 text-sm">
            This scanner was turned off by the owner. Ask them to connect a new
            kiosk from their Punched dashboard.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 px-4 py-3 flex items-center justify-between">
        <div>
          <span className="font-bold text-white">Scan Mode</span>
          <span className="text-gray-400 text-sm ml-2">· {businessName}</span>
          {label && label !== "Kiosk" && (
            <span className="text-gray-500 text-xs ml-2">({label})</span>
          )}
        </div>
        <div className="flex gap-2">
          {(["usb", "camera", "manual"] as ScanMode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); handleReset(); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                mode === m ? "bg-indigo-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              {m === "camera" && <Camera className="w-3.5 h-3.5" />}
              {m === "usb" && <Keyboard className="w-3.5 h-3.5" />}
              {m === "manual" && <Phone className="w-3.5 h-3.5" />}
              {m === "camera" ? "Camera" : m === "usb" ? "USB Scanner" : "Phone lookup"}
            </button>
          ))}
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {/* FULL SCREEN REWARD ALERT */}
        {scanState === "reward_available" && result && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-amber-400">
            <div className="text-center px-8 max-w-sm">
              <div className="text-8xl mb-6 animate-bounce">🎉</div>
              <h1 className="text-5xl font-black text-white mb-3 tracking-tight drop-shadow-lg">
                REWARD EARNED!
              </h1>
              <p className="text-2xl text-amber-900 font-bold mb-2">{result.customerName}</p>
              <p className="text-lg text-white/90 mb-8 font-medium">{result.message}</p>
              <div className="flex flex-col gap-3 w-full">
                <button
                  onClick={handleRedeem}
                  disabled={processing}
                  className="w-full bg-white text-amber-600 py-4 rounded-2xl font-black text-xl shadow-xl hover:bg-amber-50 disabled:opacity-50 transition-colors"
                >
                  {processing ? "Redeeming…" : "✅ Apply Reward Now"}
                </button>
                <button
                  onClick={handleReset}
                  className="w-full bg-amber-500 text-white border-2 border-white/40 py-3 rounded-2xl text-sm font-semibold hover:bg-amber-600 transition-colors"
                >
                  Skip — apply next time
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Normal result states */}
        {scanState !== "idle" && scanState !== "reward_available" && result && (
          <div className={`w-full max-w-sm rounded-3xl border-2 p-8 text-center mb-6 ${stateConfig[scanState]?.bg ?? "bg-gray-100"}`}>
            <div className="flex justify-center mb-4">{stateConfig[scanState]?.icon}</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">{stateConfig[scanState]?.title}</h2>
            <p className="text-gray-700 mb-4">{result.message}</p>

            {result.punchesRequired > 0 && (
              <div className="mb-4">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Punches</span>
                  <span>{result.currentPunches}/{result.punchesRequired}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-indigo-500 rounded-full h-3 transition-all"
                    style={{ width: `${Math.min(100, (result.currentPunches / result.punchesRequired) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            {scanState === "success" && result.punchesRequired > 0 &&
              result.currentPunches === result.punchesRequired - 1 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 mb-4 text-amber-800 text-sm font-semibold">
                ⚡ One more visit earns their reward!
              </div>
            )}

            <button
              onClick={handleReset}
              className="flex items-center gap-2 mx-auto text-gray-600 text-sm hover:text-gray-900 mt-2"
            >
              <RotateCcw className="w-4 h-4" />
              Scan next customer
            </button>
          </div>
        )}

        {/* Idle / scanner UI */}
        {scanState === "idle" && (
          <div className="w-full max-w-sm text-center">
            {mode === "usb" && (
              <div className="bg-gray-800 rounded-3xl p-8">
                <Keyboard className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                <h2 className="text-white text-lg font-semibold mb-2">Ready to scan</h2>
                <p className="text-gray-400 text-sm mb-6">
                  Point your USB barcode scanner at the customer&apos;s QR code. It will process automatically.
                </p>
                <input
                  ref={usbInputRef}
                  type="text"
                  className="opacity-0 absolute w-0 h-0"
                  readOnly
                  autoFocus
                  tabIndex={-1}
                />
                <div className="inline-flex items-center gap-2 bg-green-500/20 text-green-400 px-4 py-2 rounded-full text-sm">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  Waiting for scan
                </div>
              </div>
            )}

            {mode === "camera" && (
              <div className="bg-gray-800 rounded-3xl p-4 overflow-hidden">
                {cameraError ? (
                  <div className="py-10 px-4 text-center">
                    <div className="text-4xl mb-4">📷</div>
                    <p className="text-red-400 text-sm font-medium mb-4">{cameraError}</p>
                    <button
                      onClick={() => { setMode("usb"); setTimeout(() => setMode("camera"), 100); }}
                      className="text-indigo-400 text-sm underline"
                    >
                      Try again
                    </button>
                  </div>
                ) : (
                  <>
                    <div id={cameraContainerId} className="w-full" />
                    {processing && <p className="text-indigo-400 text-sm mt-3">Processing scan…</p>}
                  </>
                )}
              </div>
            )}

            {mode === "manual" && (
              <div className="bg-gray-800 rounded-3xl p-8">
                <Phone className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                <h2 className="text-white text-lg font-semibold mb-2">Phone number lookup</h2>
                <p className="text-gray-400 text-sm mb-6">
                  Customer forgot their phone? Look them up by number.
                </p>
                <form onSubmit={handlePhoneSearch} className="flex gap-2">
                  <input
                    type="tel"
                    value={phoneSearch}
                    onChange={(e) => setPhoneSearch(e.target.value)}
                    placeholder="(555) 123-4567"
                    className="flex-1 bg-gray-700 text-white border border-gray-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={processing}
                    className="bg-indigo-600 text-white px-4 py-3 rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    Look up
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {processing && scanState === "idle" && (
          <div className="flex items-center gap-2 text-gray-400 text-sm mt-4">
            <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            Processing…
          </div>
        )}
      </div>

      {scanState === "idle" && mode === "usb" && (
        <div className="p-4 text-center">
          <p className="text-gray-600 text-xs">
            Tip: Any USB barcode scanner works. The page must be focused (tap here if scanning doesn&apos;t respond).
          </p>
        </div>
      )}
    </div>
  );
}
