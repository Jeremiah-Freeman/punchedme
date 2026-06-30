import { createAdminClient } from "@/lib/supabase/admin";
import { QRCodeSVG } from "qrcode.react";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ wallet?: string }>;
}

export default async function FallbackPassPage({ params, searchParams }: Props) {
  const { token } = await params;
  const { wallet } = await searchParams;

  const db = createAdminClient();

  const { data: customer } = await db
    .from("customers")
    .select("id, first_name, business_id")
    .eq("public_token", token)
    .single();

  if (!customer) return notFound();

  const { data: business } = await db
    .from("businesses")
    .select("name, brand_color, slug, logo_url")
    .eq("id", customer.business_id)
    .single();

  const { data: program } = await db
    .from("loyalty_programs")
    .select("reward_name, punches_required, name")
    .eq("business_id", customer.business_id)
    .eq("is_active", true)
    .single();

  const { data: account } = await db
    .from("loyalty_accounts")
    .select("current_punches, lifetime_punches, rewards_redeemed")
    .eq("customer_id", customer.id)
    .single();

  const currentPunches = account?.current_punches ?? 0;
  const punchesRequired = program?.punches_required ?? 10;
  const rewardName = program?.reward_name ?? "Reward";
  const businessName = business?.name ?? "Rewards";
  const brandColor = business?.brand_color ?? "#6366f1";
  const logoUrl = (business as { logo_url?: string | null } | null)?.logo_url ?? null;
  const rewardReady = currentPunches >= punchesRequired;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const appleWalletUrl = `/api/wallet/apple/${token}`;
  const googleWalletUrl = `/api/wallet/google/${token}`;

  const walletNotConfigured = wallet === "apple-not-configured" || wallet === "google-not-configured";
  // Google Wallet only serves real customers once the issuer clears Google's
  // publishing review. Until then we keep the native button off this card so
  // nobody taps into a Google error — the QR above already works everywhere.
  const googlePublished = process.env.GOOGLE_WALLET_PUBLISHED === "true";
  const googlePending = wallet === "google-pending";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-6">
      <div className="w-full max-w-sm">
        {/* Card */}
        <div
          className="rounded-3xl text-white p-5 shadow-xl mb-4"
          style={{ background: `linear-gradient(135deg, ${brandColor}, ${darken(brandColor, 20)})` }}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={businessName}
                  className="w-12 h-12 rounded-xl object-cover bg-white/20"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-white text-lg font-bold">
                  {businessName.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-sm font-semibold">{businessName}</p>
                <p className="text-lg font-bold">{customer.first_name}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs opacity-70 uppercase tracking-wide">Punches</p>
              <p className="text-sm font-semibold opacity-90">{currentPunches} / {punchesRequired}</p>
            </div>
          </div>

          {/* Punch progress */}
          <div className="mb-4">
            <div className="flex items-end justify-between mb-2">
              <span className="text-4xl font-bold">{currentPunches}</span>
              <span className="text-lg opacity-70 mb-0.5">/ {punchesRequired}</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2">
              <div
                className="bg-white rounded-full h-2 transition-all"
                style={{ width: `${Math.min(100, (currentPunches / punchesRequired) * 100)}%` }}
              />
            </div>
          </div>

          {rewardReady ? (
            <div className="bg-white/20 rounded-2xl px-4 py-3 text-center">
              <p className="text-sm font-semibold">🎉 {rewardName} ready!</p>
              <p className="text-xs opacity-80">Show this to your cashier</p>
            </div>
          ) : (
            <div className="text-center opacity-80">
              <p className="text-sm">{rewardName} after {punchesRequired} punches</p>
              <p className="text-xs mt-0.5">{punchesRequired - currentPunches} more to go</p>
            </div>
          )}
        </div>

        {/* QR code */}
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-4 text-center">
          <p className="text-sm text-gray-500 mb-3">Show this QR code at the counter</p>
          <div className="flex justify-center">
            <QRCodeSVG value={token} size={160} level="M" />
          </div>
        </div>

        {/* Wallet buttons */}
        {walletNotConfigured && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 mb-3">
            <p className="text-sm text-amber-800">
              Wallet integration isn&apos;t set up yet. Use the QR code above — it works the same way!
            </p>
          </div>
        )}

        {googlePending && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 mb-3">
            <p className="text-sm text-amber-800">
              Google Wallet is being finalized. This is your card — show the QR
              code at the counter and you&apos;re all set.
            </p>
          </div>
        )}

        <div className="space-y-2">
          <a
            href={appleWalletUrl}
            className="flex items-center justify-center gap-2 w-full bg-black text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-900 transition-colors"
          >
            Add to Apple Wallet
          </a>
          {googlePublished && (
            <a
              href={googleWalletUrl}
              className="flex items-center justify-center gap-2 w-full bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              Add to Google Wallet
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function darken(hex: string, amount: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return hex;
  const r = Math.max(0, parseInt(result[1], 16) - amount);
  const g = Math.max(0, parseInt(result[2], 16) - amount);
  const b = Math.max(0, parseInt(result[3], 16) - amount);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}
