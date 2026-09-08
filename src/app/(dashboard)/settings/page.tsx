import { Settings } from "lucide-react";
import { PlaceholderPage } from "@/components/shared/placeholder-page";
import { requireRole } from "@/lib/auth";

export default async function SettingsPage() {
  // RBAC: only OWNER can reach this page. STAFF get bounced back to
  // /dashboard. This is the real guard — hiding the nav link for STAFF
  // (see src/components/layout/nav-items.ts) is just a UX nicety on top.
  await requireRole("OWNER");

  return (
    <PlaceholderPage
      title="Settings"
      description="Organization details, staff accounts, and preferences."
      icon={Settings}
    />
  );
}
