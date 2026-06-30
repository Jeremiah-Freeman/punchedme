import { LayoutDashboard, Users, Settings, QrCode, Package, MapPin, CreditCard } from "lucide-react";

// Ordered by importance — the first five surface without scrolling in the
// mobile bottom carousel; the rest scroll into view. Shared by the desktop
// sidebar and the mobile carousel so they never drift apart.
export const nav = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/scan", label: "Scan Mode", icon: QrCode },
  { href: "/dashboard/customers", label: "Customers", icon: Users },
  { href: "/dashboard/program", label: "Program", icon: Package },
  { href: "/dashboard/assets", label: "Assets", icon: Settings },
  { href: "/dashboard/locations", label: "Locations", icon: MapPin },
  { href: "/dashboard/billing", label: "Plan & Billing", icon: CreditCard },
];
