import type { LucideIcon } from "lucide-react";
import type { UserRole } from "@prisma/client";
import {
  LayoutDashboard,
  Users,
  Tag,
  RefreshCw,
  Wallet,
  CalendarCheck,
  BarChart3,
  Settings,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** If set, only these roles see this item in the sidebar. */
  roles?: UserRole[];
};

export const mainNavItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Members", href: "/members", icon: Users },
  { label: "Membership Plans", href: "/plans", icon: Tag },
  { label: "Subscriptions", href: "/subscriptions", icon: RefreshCw },
  { label: "Payments", href: "/payments", icon: Wallet },
  { label: "Attendance", href: "/attendance", icon: CalendarCheck },
  { label: "Reports", href: "/reports", icon: BarChart3 },
];

// Settings is OWNER-only. Hiding it here is a UX nicety, not the real
// guard — the page itself also calls requireRole("OWNER"), since a client
// nav filter alone can't stop direct navigation. See src/lib/permissions.ts.
export const secondaryNavItems: NavItem[] = [
  { label: "Settings", href: "/settings", icon: Settings, roles: ["OWNER"] },
];

