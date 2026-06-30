"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/Logo";
import { MailCheck } from "lucide-react";

export default function ConfirmEmailPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"" | "sending" | "sent" | "error">("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const e = new URLSearchParams(window.location.search).get("email");
      if (e) setEmail(e);
    }
  }, []);

  async function resend() {
    if (!email) return;
    setStatus("sending");
    const supabase = createClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setStatus(error ? "error" : "sent");
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <Logo size={72} className="mx-auto" />
          </Link>
        </div>

        <div className="bg-white rounded-2xl p-7 shadow-sm text-center">
          <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center mx-auto mb-4">
            <MailCheck className="w-6 h-6 text-indigo-600" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-1.5">Check your email</h1>
          <p className="text-sm text-gray-600 leading-relaxed">
            We sent a confirmation link{email ? <> to <span className="font-medium text-gray-900">{email}</span></> : " to your inbox"}.
            Click it to finish setting up your account, then sign in.
          </p>
          <p className="text-xs text-gray-400 mt-3">Don&apos;t see it? Check your spam folder.</p>

          {email && (
            <button
              type="button"
              onClick={resend}
              disabled={status === "sending" || status === "sent"}
              className="mt-5 w-full bg-white border border-gray-300 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {status === "sending" ? "Resending…" : status === "sent" ? "Sent — check your inbox" : "Resend confirmation email"}
            </button>
          )}
          {status === "error" && (
            <p className="text-xs text-red-600 mt-2">Couldn&apos;t resend. Try again in a moment.</p>
          )}
        </div>

        <p className="text-center text-sm text-gray-600 mt-6">
          Already confirmed?{" "}
          <Link href="/auth/login" className="text-indigo-600 hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
