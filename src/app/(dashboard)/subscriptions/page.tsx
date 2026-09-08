import { Card, CardContent } from "@/components/ui/card";
import { SubscriptionWorkspace } from "@/components/subscriptions/subscription-workspace";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { redirect } from "next/navigation";

export default async function SubscriptionsPage() {
  const user = await getCurrentUser();
  if (!can(user.role, "subscriptions:view")) redirect("/dashboard");
  const [subscriptions, members, plans] = await Promise.all([
    db.subscription.findMany({ where: { organizationId: user.organizationId }, orderBy: { createdAt: "desc" }, select: { id: true, memberId: true, planId: true, startDate: true, endDate: true, amount: true, status: true, member: { select: { name: true, phone: true } }, plan: { select: { name: true } } } }),
    db.member.findMany({ where: { organizationId: user.organizationId }, orderBy: { name: "asc" }, select: { id: true, name: true, phone: true } }),
    db.membershipPlan.findMany({ where: { organizationId: user.organizationId, isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, price: true, durationInDays: true } }),
  ]);

  return <div className="space-y-6"><div><h1 className="text-2xl font-semibold tracking-tight">Subscriptions</h1><p className="text-sm text-muted-foreground">Manage member memberships and subscription history.</p></div><Card><CardContent className="p-0"><SubscriptionWorkspace subscriptions={subscriptions.map((subscription) => ({ ...subscription, amount: subscription.amount.toString(), startDate: subscription.startDate.toISOString(), endDate: subscription.endDate.toISOString() }))} members={members} plans={plans.map((plan) => ({ ...plan, price: plan.price.toString() }))} canCreate={can(user.role, "subscriptions:create")} canCancel={can(user.role, "subscriptions:cancel")} /></CardContent></Card></div>;
}
