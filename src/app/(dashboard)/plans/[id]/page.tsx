import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/permissions";

function durationLabel(days: number) { if (days % 365 === 0) return `${days / 365} ${days / 365 === 1 ? "Year" : "Years"}`; if (days % 30 === 0) return `${days / 30} ${days / 30 === 1 ? "Month" : "Months"}`; return `${days} ${days === 1 ? "Day" : "Days"}`; }
function priceLabel(price: string) { const [whole, decimals] = price.split("."); return `₹${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}${decimals ? `.${decimals}` : ""}`; }
function dateLabel(value: Date) { const [year, month, day] = value.toISOString().slice(0, 10).split("-"); return `${month}/${day}/${year}`; }

export default async function PlanDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!can(user.role, "plans:view")) redirect("/dashboard");
  const { id } = await params;
  const plan = await db.membershipPlan.findFirst({ where: { id, organizationId: user.organizationId }, include: { _count: { select: { subscriptions: true } } } });
  if (!plan) notFound();
  return <div className="space-y-6"><div><p className="text-sm text-muted-foreground">Membership plan</p><div className="flex items-center gap-3"><h1 className="text-2xl font-semibold tracking-tight">{plan.name}</h1><Badge variant={plan.isActive ? "success" : "secondary"}>{plan.isActive ? "Active" : "Inactive"}</Badge></div></div><Card><CardHeader><CardTitle>Plan details</CardTitle></CardHeader><CardContent className="grid gap-5 sm:grid-cols-2"><div><p className="text-xs text-muted-foreground">Price</p><p className="text-2xl font-semibold">{priceLabel(plan.price.toString())}</p></div><div><p className="text-xs text-muted-foreground">Duration</p><p>{durationLabel(plan.durationInDays)}</p></div><div className="sm:col-span-2"><p className="text-xs text-muted-foreground">Description</p><p>{plan.description ?? "No description provided."}</p></div><div><p className="text-xs text-muted-foreground">Created</p><p>{dateLabel(plan.createdAt)}</p></div><div><p className="text-xs text-muted-foreground">Updated</p><p>{dateLabel(plan.updatedAt)}</p></div></CardContent></Card><Card><CardHeader><CardTitle>Subscriptions</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">{plan._count.subscriptions} subscription{plan._count.subscriptions === 1 ? "" : "s"} using this plan.</CardContent></Card></div>;
}