"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the real error in the browser console / server logs for debugging.
    console.error("Dashboard render error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-6 text-center">
      <div className="max-w-sm">
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h1>
        <p className="text-sm text-gray-500 mb-6">
          We hit a snag loading your dashboard. Try again — if it keeps happening, sign out and back in.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            Try again
          </button>
          <Link
            href="/auth/login"
            className="border border-gray-300 text-gray-700 px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Sign in again
          </Link>
        </div>
        {error.digest && (
          <p className="text-xs text-gray-300 mt-6">ref: {error.digest}</p>
        )}
      </div>
    </div>
  );
}
