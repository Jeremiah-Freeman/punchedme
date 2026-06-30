import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Store, User } from "lucide-react";

export const metadata = {
  title: "Card not active yet — Punched",
};

// Shown when someone scans a Punched sticker whose shop hasn't claimed/activated
// it yet. Could be the owner mid-setup or a customer who scanned too early — so
// we offer both paths instead of assuming.
export default function StickerInactivePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm text-center">
        <Link href="/" className="inline-block mb-8">
          <Logo size={72} className="mx-auto" />
        </Link>

        <h1 className="text-xl font-semibold text-gray-900 mb-1.5">This card isn&apos;t active yet</h1>
        <p className="text-sm text-gray-600 mb-7 leading-relaxed">
          This Punched sticker hasn&apos;t been set up by a shop yet.
        </p>

        <div className="space-y-3 text-left">
          <Link
            href="/auth/signup"
            className="flex items-start gap-3 bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:border-indigo-200 transition-colors"
          >
            <Store className="w-5 h-5 text-indigo-600 mt-0.5 shrink-0" />
            <span>
              <span className="block text-sm font-semibold text-gray-900">I&apos;m the shop owner</span>
              <span className="block text-xs text-gray-500 mt-0.5">Set up your loyalty program and activate this card.</span>
            </span>
          </Link>

          <div className="flex items-start gap-3 bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <User className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
            <span>
              <span className="block text-sm font-semibold text-gray-900">I&apos;m a customer</span>
              <span className="block text-xs text-gray-500 mt-0.5">This shop hasn&apos;t launched its rewards yet — check back soon!</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
