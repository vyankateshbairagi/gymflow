"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, MoreHorizontal, Plus, Search, XCircle } from "lucide-react";

import { cancelSubscription, createSubscription } from "@/actions/subscriptions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { subscriptionFormSchema, type SubscriptionFormValues } from "@/lib/validations/subscription";

type Subscription = { id: string; memberId: string; planId: string; startDate: string; endDate: string; amount: string; status: "ACTIVE" | "EXPIRED" | "CANCELLED"; member: { name: string; phone: string }; plan: { name: string } };
type Member = { id: string; name: string; phone: string };
type Plan = { id: string; name: string; price: string; durationInDays: number };

function dateKey(value: string) { return value.slice(0, 10); }
function formatDate(value: string) { const [year, month, day] = dateKey(value).split("-"); return `${month}/${day}/${year}`; }
function priceLabel(value: string) { const [whole, decimals] = value.split("."); return `₹${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}${decimals ? `.${decimals}` : ".00"}`; }
function durationLabel(days: number) { if (days % 365 === 0) return `${days / 365} ${days / 365 === 1 ? "Year" : "Years"}`; if (days % 30 === 0) return `${days / 30} ${days / 30 === 1 ? "Month" : "Months"}`; return `${days} ${days === 1 ? "Day" : "Days"}`; }
function todayKey() { return new Date().toISOString().slice(0, 10); }
function displayStatus(subscription: Subscription) { if (subscription.status === "CANCELLED") return "CANCELLED"; if (dateKey(subscription.endDate) < todayKey()) return "EXPIRED"; if (dateKey(subscription.startDate) > todayKey()) return "UPCOMING"; return "ACTIVE"; }
function statusVariant(status: string) { return status === "ACTIVE" ? "success" : status === "CANCELLED" ? "destructive" : status === "UPCOMING" ? "warning" : "secondary"; }
function calculateEndDate(startDate: string, durationInDays: number) { const date = new Date(`${startDate}T00:00:00.000Z`); date.setUTCDate(date.getUTCDate() + durationInDays - 1); return date.toISOString().slice(0, 10); }

function SubscriptionForm({ members, plans, onDone }: { members: Member[]; plans: Plan[]; onDone: (message: string) => void }) {
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const { control, register, handleSubmit, setError: setFieldError, formState: { errors } } = useForm<SubscriptionFormValues>({ resolver: zodResolver(subscriptionFormSchema), defaultValues: { memberId: "", planId: "", startDate: todayKey() } });
  const planId = useWatch({ control, name: "planId" });
  const startDate = useWatch({ control, name: "startDate" });
  const selectedPlan = plans.find((plan) => plan.id === planId);
  const onSubmit = (values: SubscriptionFormValues) => startTransition(async () => { setError(""); const result = await createSubscription(values); if (!result.success) { setError(result.message); Object.entries(result.fieldErrors ?? {}).forEach(([field, message]) => setFieldError(field as keyof SubscriptionFormValues, { message })); return; } onDone(result.message); });
  return <form onSubmit={handleSubmit(onSubmit)} className="space-y-4"><label className="space-y-1 text-sm"><span>Member *</span><select {...register("memberId")} className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"><option value="">Select member</option>{members.map((member) => <option key={member.id} value={member.id}>{member.name} — {member.phone}</option>)}</select>{errors.memberId && <span className="text-xs text-destructive">{errors.memberId.message}</span>}</label><label className="space-y-1 text-sm"><span>Membership plan *</span><select {...register("planId")} className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"><option value="">Select active plan</option>{plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name} — {priceLabel(plan.price)} / {durationLabel(plan.durationInDays)}</option>)}</select>{errors.planId && <span className="text-xs text-destructive">{errors.planId.message}</span>}</label><label className="space-y-1 text-sm"><span>Start date *</span><Input type="date" {...register("startDate")} aria-invalid={Boolean(errors.startDate)} />{errors.startDate && <span className="text-xs text-destructive">{errors.startDate.message}</span>}</label>{selectedPlan && startDate && <div className="rounded-md border bg-muted/30 p-4 text-sm"><p className="font-medium">Selected plan</p><div className="mt-2 grid gap-2 sm:grid-cols-3"><span>{selectedPlan.name}</span><span>{priceLabel(selectedPlan.price)}</span><span>{durationLabel(selectedPlan.durationInDays)} · Ends {formatDate(calculateEndDate(startDate, selectedPlan.durationInDays))}</span></div></div>}{error && <p className="text-sm text-destructive">{error}</p>}<div className="flex justify-end"><Button type="submit" disabled={isPending}>{isPending ? "Creating..." : "Create subscription"}</Button></div></form>;
}

export function SubscriptionWorkspace({ subscriptions, members, plans, canCreate, canCancel }: { subscriptions: Subscription[]; members: Member[]; plans: Plan[]; canCreate: boolean; canCancel: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [formOpen, setFormOpen] = useState(false);
  const [toCancel, setToCancel] = useState<Subscription | null>(null);
  const [notice, setNotice] = useState("");
  const [isPending, startTransition] = useTransition();
  const filtered = subscriptions.filter((subscription) => { const currentStatus = displayStatus(subscription); const text = `${subscription.member.name} ${subscription.member.phone} ${subscription.plan.name}`.toLowerCase(); return text.includes(query.toLowerCase()) && (status === "ALL" || currentStatus === status); });
  const done = (message: string) => { setFormOpen(false); setNotice(message); router.refresh(); };
  const cancel = () => { if (!toCancel) return; startTransition(async () => { const result = await cancelSubscription(toCancel.id); setNotice(result.message); if (result.success) { setToCancel(null); router.refresh(); } }); };
  return <><div className="flex flex-col gap-3 border-b p-4 sm:flex-row"><div className="relative flex-1"><Search className="text-muted-foreground absolute top-2.5 left-3 size-4" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search member, phone, or plan" className="pl-9" /></div><select value={status} onChange={(event) => setStatus(event.target.value)} className="border-input bg-background h-9 rounded-md border px-3 text-sm"><option value="ALL">All statuses</option><option value="ACTIVE">Active</option><option value="UPCOMING">Upcoming</option><option value="EXPIRED">Expired</option><option value="CANCELLED">Cancelled</option></select>{canCreate && <Button onClick={() => setFormOpen(true)}><Plus className="size-4" />New subscription</Button>}</div>{notice && <p className="border-b bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</p>}{filtered.length === 0 ? <div className="flex flex-col items-center gap-2 px-6 py-16 text-center"><p className="font-medium">{subscriptions.length ? "No subscriptions match your search" : "No subscriptions yet"}</p><p className="text-sm text-muted-foreground">{subscriptions.length ? "Try a different search or status filter." : "Create a subscription to start tracking member history."}</p>{canCreate && !subscriptions.length && <Button onClick={() => setFormOpen(true)}><Plus className="size-4" />New subscription</Button>}</div> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-muted-foreground"><th className="h-10 px-4 font-medium">Member</th><th className="h-10 px-4 font-medium">Plan</th><th className="h-10 px-4 font-medium">Start</th><th className="h-10 px-4 font-medium">End</th><th className="h-10 px-4 font-medium">Amount</th><th className="h-10 px-4 font-medium">Status</th><th className="h-10 px-4 text-right font-medium">Actions</th></tr></thead><tbody>{filtered.map((subscription) => { const currentStatus = displayStatus(subscription); return <tr key={subscription.id} className="border-b hover:bg-muted/50"><td className="p-4"><Link href={`/subscriptions/${subscription.id}`} className="font-medium hover:underline">{subscription.member.name}</Link><p className="text-xs text-muted-foreground">{subscription.member.phone}</p></td><td className="p-4">{subscription.plan.name}</td><td className="p-4">{formatDate(subscription.startDate)}</td><td className="p-4">{formatDate(subscription.endDate)}</td><td className="p-4 font-medium">{priceLabel(subscription.amount)}</td><td className="p-4"><Badge variant={statusVariant(currentStatus)}>{currentStatus}</Badge></td><td className="p-4 text-right"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={`Actions for ${subscription.member.name}`}><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem asChild><Link href={`/subscriptions/${subscription.id}`}><Eye className="size-4" />View</Link></DropdownMenuItem>{canCancel && currentStatus === "ACTIVE" && <DropdownMenuItem variant="destructive" disabled={isPending} onClick={() => setToCancel(subscription)}><XCircle className="size-4" />Cancel subscription</DropdownMenuItem>}</DropdownMenuContent></DropdownMenu></td></tr>; })}</tbody></table></div>}
    <Dialog open={formOpen} onOpenChange={setFormOpen}><DialogContent><DialogHeader><DialogTitle>New subscription</DialogTitle><DialogDescription>Select a member and active plan. Price and duration are read from the database when saved.</DialogDescription></DialogHeader><div className="mt-5"><SubscriptionForm members={members} plans={plans} onDone={done} /></div></DialogContent></Dialog>
    <Dialog open={toCancel !== null} onOpenChange={(open) => !open && !isPending && setToCancel(null)}><DialogContent><DialogHeader><DialogTitle>Cancel subscription?</DialogTitle><DialogDescription>This subscription will be marked as cancelled. Historical subscription information will be preserved.</DialogDescription></DialogHeader><div className="mt-6 flex justify-end gap-3"><Button variant="outline" disabled={isPending} onClick={() => setToCancel(null)}>Cancel</Button><Button variant="destructive" disabled={isPending} onClick={cancel}>{isPending ? "Cancelling..." : "Confirm Cancellation"}</Button></div></DialogContent></Dialog>
  </>;
}