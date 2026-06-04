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
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: business } = await supabase
    .from("businesses")
    .select("name, slug")
    .eq("owner_user_id", user.id)
    .single();

  if (!business) redirect("/onboarding");

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-56 bg-white border-r min-h-screen">
        <div className="p-5 border-b">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-lg text-gray-900">
            <Logo size={32} />
            Punched
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
