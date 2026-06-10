"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { nav } from "./nav";

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t md:hidden z-50 pb-[env(safe-area-inset-bottom)]">
      <div className="flex overflow-x-auto gap-1 px-2 py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`shrink-0 min-w-[64px] flex flex-col items-center justify-center gap-1 px-2.5 py-2 rounded-xl transition-colors ${
                active ? "bg-indigo-50" : "active:bg-indigo-50"
              }`}
            >
              <Icon className={`w-[22px] h-[22px] ${active ? "text-indigo-700" : "text-indigo-600"}`} />
              <span
                className={`text-[11px] leading-none whitespace-nowrap ${
                  active ? "text-indigo-700 font-semibold" : "text-indigo-600"
                }`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
