import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SignOutButton } from "./SignOutButton";
import { Logo } from "@/components/Logo";
import { nav } from "./nav";
import { MobileNav } from "./MobileNav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: business } = await supabase
    .from("businesses")
    .select("name, slug")
    .eq("owner_user_id", user.id)
    .limit(1)
    .maybeSingle();

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

      {/* Mobile bottom nav — scrollable purple carousel */}
      <MobileNav />

      {/* Main */}
      <main className="flex-1 min-w-0 overflow-x-hidden pb-20 md:pb-0">{children}</main>
    </div>
  );
}
