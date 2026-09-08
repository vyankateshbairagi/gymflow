import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/permissions";

function dateKey(value: Date) { return value.toISOString().slice(0, 10); }
function formatDate(value: Date) { const [year, month, day] = dateKey(value).split("-"); return `${month}/${day}/${year}`; }
function priceLabel(value: string) { const [whole, decimals] = value.split("."); return `₹${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}${decimals ? `.${decimals}` : ".00"}`; }
function displayStatus(status: string, startDate: Date, endDate: Date) { if (status === "CANCELLED") return "CANCELLED"; const today = new Date().toISOString().slice(0, 10); if (dateKey(endDate) < today) return "EXPIRED"; if (dateKey(startDate) > today) return "UPCOMING"; return "ACTIVE"; }

export default async function SubscriptionDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!can(user.role, "subscriptions:view")) redirect("/dashboard");
  const { id } = await params;
  const subscription = await db.subscription.findFirst({ where: { id, organizationId: user.organizationId }, select: { id: true, startDate: true, endDate: true, amount: true, status: true, createdAt: true, updatedAt: true, member: { select: { name: true, phone: true } }, plan: { select: { name: true, durationInDays: true, isActive: true } } } });
  if (!subscription) notFound();
  const status = displayStatus(subscription.status, subscription.startDate, subscription.endDate);
  return <div className="space-y-6"><div><p className="text-sm text-muted-foreground">Subscription details</p><div className="flex items-center gap-3"><h1 className="text-2xl font-semibold tracking-tight">{subscription.plan.name} Membership</h1><Badge variant={status === "ACTIVE" ? "success" : status === "CANCELLED" ? "destructive" : status === "UPCOMING" ? "warning" : "secondary"}>{status}</Badge></div></div><Card><CardHeader><CardTitle>Subscription terms</CardTitle></CardHeader><CardContent className="grid gap-5 sm:grid-cols-2"><div><p className="text-xs text-muted-foreground">Member</p><p>{subscription.member.name}</p><p className="text-sm text-muted-foreground">{subscription.member.phone}</p></div><div><p className="text-xs text-muted-foreground">Plan</p><p>{subscription.plan.name}</p></div><div><p className="text-xs text-muted-foreground">Amount paid</p><p className="text-2xl font-semibold">{priceLabel(subscription.amount.toString())}</p></div><div><p className="text-xs text-muted-foreground">Start date</p><p>{formatDate(subscription.startDate)}</p></div><div><p className="text-xs text-muted-foreground">End date</p><p>{formatDate(subscription.endDate)}</p></div><div><p className="text-xs text-muted-foreground">Created</p><p>{formatDate(subscription.createdAt)}</p></div></CardContent></Card></div>;
}