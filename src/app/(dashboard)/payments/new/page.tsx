import { redirect } from "next/navigation";
import { PaymentForm } from "@/components/payments/payment-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/permissions";

export default async function NewPaymentPage() {
  const user = await getCurrentUser();
  if (!can(user.role, "payments:create")) redirect("/payments");
  const subscriptions = await db.subscription.findMany({ where: { organizationId: user.organizationId, status: { not: "CANCELLED" } }, orderBy: { createdAt: "desc" }, select: { id: true, memberId: true, amount: true, member: { select: { name: true, phone: true } }, plan: { select: { name: true } }, payments: { where: { status: "COMPLETED" }, select: { amount: true } } } });
  return <div className="mx-auto max-w-2xl space-y-6"><div><h1 className="text-2xl font-semibold tracking-tight">Record payment</h1><p className="text-sm text-muted-foreground">Add an immutable payment record to a member subscription.</p></div><Card><CardHeader><CardTitle>Payment information</CardTitle></CardHeader><CardContent><PaymentForm subscriptions={subscriptions.map((subscription) => ({ ...subscription, amount: subscription.amount.toString(), payments: subscription.payments.map((payment) => payment.amount.toString()) }))} /></CardContent></Card></div>;
}