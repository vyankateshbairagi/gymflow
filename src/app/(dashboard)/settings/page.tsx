import { redirect } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { SettingsWorkspace } from "@/components/settings/settings-workspace";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/permissions";

export default async function SettingsPage() {
  const user = await getCurrentUser();

  // RBAC: only OWNER can reach this page at all today (settings:manage and
  // staff:manage are both OWNER-only permissions — see src/lib/permissions.ts
  // from Day 2). Keeping this as a hard redirect, rather than loosening it
  // to a read-only view for STAFF, matches the existing permission
  // architecture exactly instead of inventing a new "view" grade for it.
  if (!can(user.role, "settings:manage")) redirect("/dashboard");

  const organization = await db.organization.findUniqueOrThrow({
    where: { id: user.organizationId },
    select: { name: true, email: true, phone: true, address: true, currency: true, timezone: true },
  });

  // Explicit select — passwordHash (and everything else on User) never
  // leaves the server. Scoped to role: "STAFF" so the Owner's own account
  // never appears as a manageable row here (see src/actions/settings.ts for
  // why that matters for the "can't deactivate the only Owner" guarantee).
  const staff = await db.user.findMany({
    where: { organizationId: user.organizationId, role: "STAFF" },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your gym organization, staff accounts, and preferences.
        </p>
      </div>
      <Card>
        <CardContent className="p-0">
          <SettingsWorkspace
            organization={organization}
            staff={staff.map((member) => ({ ...member, createdAt: member.createdAt.toISOString() }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
