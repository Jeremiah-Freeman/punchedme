import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Users, Settings, QrCode, Package, MapPin } from "lucide-react";
import { SignOutButton } from "./SignOutButton";
import { Logo } from "@/components/Logo";

const nav = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/customers", label: "Customers", icon: Users },
  { href: "/dashboard/program", label: "Program", icon: Package },
  { href: "/dashboard/locations", label: "Locations", icon: MapPin },
  { href: "/dashboard/scan", label: "Scan Mode", icon: QrCode },
  { href: "/dashboard/assets", label: "Assets", icon: Settings },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // TEMP DIAGNOSTIC: capture the real error + stage instead of a blank 500.
  let stage = "start";
  let business: { name: string; slug: string } | null = null;
  let userId = "";
  try {
    stage = "createClient";
    const supabase = await createClient();

    stage = "getUser";
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr) throw new Error(`getUser returned error: ${userErr.message}`);
    const user = userData.user;
    if (!user) redirect("/auth/login");
    userId = user.id;

    stage = "businesses.select";
    const { data: biz, error: bizErr } = await supabase
      .from("businesses")
      .select("name, slug")
      .eq("owner_user_id", user.id)
      .single();
    if (bizErr) throw new Error(`businesses query error: ${bizErr.message} (code ${bizErr.code})`);
    if (!biz) redirect("/onboarding");
    business = biz;
  } catch (e: unknown) {
    const err = e as { digest?: string; message?: string; stack?: string };
    // Let Next's redirect() pass through untouched.
    if (typeof err?.digest === "string" && err.digest.startsWith("NEXT_REDIRECT")) {
      throw e;
    }
    return (
      <div style={{ padding: 24, fontFamily: "monospace", fontSize: 13, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
        <strong>DASHBOARD DEBUG — failed at stage: {stage}</strong>
        {"\n"}userId: {userId || "(none)"}
        {"\n\n"}message: {err?.message ?? String(e)}
        {"\n\n"}stack:
        {"\n"}{err?.stack ?? "(no stack)"}
      </div>
    );
  }

  if (!business) redirect("/onboarding");

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-56 bg-white border-r min-h-screen">
        <div className="p-5 border-b">
          <Link href="/dashboard" className="flex items-center">
            <Logo size={28} wordmark />
          </Link>
          <p className="text-xs text-gray-500 mt-0.5 truncate">{business.name}</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t">
          <SignOutButton />
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t md:hidden z-50 flex">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex-1 flex flex-col items-center gap-1 py-3 text-gray-600 hover:text-indigo-600"
          >
            <Icon className="w-5 h-5" />
            <span className="text-xs">{label}</span>
          </Link>
        ))}
      </div>

      {/* Main */}
      <main className="flex-1 pb-20 md:pb-0">{children}</main>
    </div>
  );
}
