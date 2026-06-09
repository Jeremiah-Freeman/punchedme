"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SocialLoginButtons } from "@/components/SocialLoginButtons";

export default function HeroSignupForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });

    if (!loginError) {
      router.push("/onboarding");
      router.refresh();
    } else {
      router.push("/auth/confirm-email");
    }

    setLoading(false);
  }

  return (
    <form onSubmit={handleSignup} className="w-full max-w-md mx-auto flex flex-col gap-3">
      <SocialLoginButtons />
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        autoComplete="email"
        placeholder="Email address"
        className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        minLength={8}
        autoComplete="new-password"
        placeholder="Password (min 8 characters)"
        className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
      />
      {error && (
        <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl text-left">{error}</div>
      )}
      <button
        type="submit"
        disabled={loading}
        className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-8 py-3.5 rounded-xl text-base font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
      >
        {loading ? "Creating account…" : <><span>Punch In</span> <ArrowRight className="w-4 h-4" /></>}
      </button>
      <p className="text-sm text-gray-500 text-center">
        Already have an account?{" "}
        <Link href="/auth/login" className="text-indigo-600 hover:underline font-medium">Log in</Link>
      </p>
    </form>
  );
}
