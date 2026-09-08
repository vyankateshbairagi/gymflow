import { MemberWorkspace } from "@/components/members/member-workspace";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { redirect } from "next/navigation";

export default async function MembersPage() {
  const user = await getCurrentUser();
  if (!can(user.role, "members:view")) redirect("/dashboard");
  const members = await db.member.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, phone: true, email: true, status: true, joiningDate: true, gender: true, dateOfBirth: true, address: true, emergencyContact: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Members</h1>
          <p className="text-sm text-muted-foreground">Manage your gym members</p>
        </div>
      </div>
      <Card>
        <CardContent className="p-0">
          <MemberWorkspace
            members={members.map((member) => ({ ...member, joiningDate: member.joiningDate.toISOString(), dateOfBirth: member.dateOfBirth?.toISOString() ?? null }))}
            canEdit={can(user.role, "members:update")}
            canDeactivate={can(user.role, "members:deactivate")}
            canCreate={can(user.role, "members:create")}
          />
        </CardContent>
      </Card>
    </div>
  );
}
