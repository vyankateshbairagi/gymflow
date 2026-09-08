"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, MoreHorizontal, Pencil, Plus, Search, Trash2 } from "lucide-react";

import { createMembershipPlan, deactivateMembershipPlan, updateMembershipPlan } from "@/actions/membership-plans";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { membershipPlanFormSchema, type MembershipPlanFormValues } from "@/lib/validations/membership-plan";

type Plan = { id: string; name: string; description: string | null; price: string; durationInDays: number; isActive: boolean; createdAt: string; updatedAt: string };
const emptyValues: MembershipPlanFormValues = { name: "", description: "", price: "", durationInDays: 30, isActive: true };

function durationLabel(days: number) { if (days % 365 === 0) return `${days / 365} ${days / 365 === 1 ? "Year" : "Years"}`; if (days % 30 === 0) return `${days / 30} ${days / 30 === 1 ? "Month" : "Months"}`; return `${days} ${days === 1 ? "Day" : "Days"}`; }
function priceLabel(price: string) { const [whole, decimals] = price.split("."); const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ","); return `₹${grouped}${decimals ? `.${decimals}` : ""}`; }
function normalizeNumber(value: string) {
  const normalized = value.replace(/^0+(?=\d)/, "").replace(/(?:\.0+|(?<=\.\d)0+)$/, "");
  return normalized || "0";
}
function normalizePrice(value: string) {
  return normalizeNumber(value.replace(/[₹,\s]/g, ""));
}
function durationSearchDays(value: string) {
  const durationMatch = value.match(/^(\d+(?:\.\d+)?)\s*(day|days|month|months)$/i);
  if (!durationMatch) return null;
  const amount = Number(durationMatch[1]);
  if (!Number.isInteger(amount) || amount <= 0) return null;
  return /month/i.test(durationMatch[2]) ? amount * 30 : amount;
}
function planMatchesSearch(plan: Plan, rawQuery: string) {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return true;

  const durationDays = durationSearchDays(query);
  if (durationDays !== null) return plan.durationInDays === durationDays;

  const numericQuery = query.replace(/[₹,\s]/g, "");
  if (/^\d+(?:\.\d+)?$/.test(numericQuery)) {
    return normalizePrice(plan.price) === normalizeNumber(numericQuery) || String(plan.durationInDays) === normalizeNumber(numericQuery);
  }

  const text = `${plan.name} ${plan.description ?? ""}`.toLowerCase();
  return text.includes(query);
}
function formValues(plan?: Plan): MembershipPlanFormValues { return plan ? { name: plan.name, description: plan.description ?? "", price: plan.price, durationInDays: plan.durationInDays, isActive: plan.isActive } : emptyValues; }

function PlanForm({ plan, onDone }: { plan?: Plan; onDone: (message: string) => void }) {
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const { register, handleSubmit, setError: setFieldError, formState: { errors } } = useForm<z.input<typeof membershipPlanFormSchema>, undefined, MembershipPlanFormValues>({ resolver: zodResolver(membershipPlanFormSchema), defaultValues: formValues(plan) });
  const onSubmit = (values: MembershipPlanFormValues) => startTransition(async () => { setError(""); const result = plan ? await updateMembershipPlan({ ...values, id: plan.id }) : await createMembershipPlan(values); if (!result.success) { setError(result.message); Object.entries(result.fieldErrors ?? {}).forEach(([field, message]) => setFieldError(field as keyof MembershipPlanFormValues, { message })); return; } onDone(result.message); });
  const field = (name: keyof MembershipPlanFormValues, label: string, type = "text") => <label className="space-y-1 text-sm"><span>{label}</span><Input type={type} {...register(name)} aria-invalid={Boolean(errors[name])} />{errors[name] && <span className="text-xs text-destructive">{errors[name]?.message}</span>}</label>;
  return <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">{field("name", "Plan name")}{field("price", "Price", "text")} {field("durationInDays", "Duration in days", "number")}<label className="space-y-1 text-sm"><span>Description</span><textarea {...register("description")} className="border-input bg-background min-h-20 w-full rounded-md border px-3 py-2" aria-invalid={Boolean(errors.description)} />{errors.description && <span className="text-xs text-destructive">{errors.description.message}</span>}</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" {...register("isActive")} />Active plan</label>{error && <p className="text-sm text-destructive">{error}</p>}<div className="flex justify-end"><Button type="submit" disabled={isPending}>{isPending ? "Saving..." : plan ? "Save changes" : "Create plan"}</Button></div></form>;
}

export function PlanWorkspace({ plans, canCreate, canEdit, canDeactivate }: { plans: Plan[]; canCreate: boolean; canEdit: boolean; canDeactivate: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [formPlan, setFormPlan] = useState<Plan | "add" | null>(null);
  const [planToDeactivate, setPlanToDeactivate] = useState<Plan | null>(null);
  const [notice, setNotice] = useState("");
  const [isPending, startTransition] = useTransition();
  const filtered = plans.filter((plan) => planMatchesSearch(plan, query) && (status === "ALL" || (status === "ACTIVE" ? plan.isActive : !plan.isActive)));
  const done = (message: string) => { setFormPlan(null); setNotice(message); router.refresh(); };
  const deactivate = () => { if (!planToDeactivate) return; startTransition(async () => { const result = await deactivateMembershipPlan(planToDeactivate.id); setNotice(result.message); if (result.success) { setPlanToDeactivate(null); router.refresh(); } }); };
  return <>
    <div className="flex flex-col gap-3 border-b p-4 sm:flex-row"><div className="relative flex-1"><Search className="text-muted-foreground absolute top-2.5 left-3 size-4" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search plans, price, or duration..." className="pl-9" /></div><select value={status} onChange={(event) => setStatus(event.target.value)} className="border-input bg-background h-9 rounded-md border px-3 text-sm"><option value="ALL">All statuses</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select>{canCreate && <Button onClick={() => setFormPlan("add")}><Plus className="size-4" />Add plan</Button>}</div>
    {notice && <p className="border-b bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</p>}
    {filtered.length === 0 ? <div className="flex flex-col items-center gap-2 px-6 py-16 text-center"><p className="font-medium">{plans.length ? "No membership plans match your search" : "No membership plans yet"}</p><p className="text-sm text-muted-foreground">{plans.length ? "Try a different search or status filter." : "Create your first membership plan to start offering memberships."}</p>{canCreate && !plans.length && <Button onClick={() => setFormPlan("add")}><Plus className="size-4" />Add plan</Button>}</div> : <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">{filtered.map((plan) => <Card key={plan.id} className="relative"><CardHeader><div className="flex items-start justify-between gap-3"><div><CardTitle>{plan.name}</CardTitle><p className="mt-2 text-2xl font-semibold">{priceLabel(plan.price)}</p><p className="text-sm text-muted-foreground">{durationLabel(plan.durationInDays)}</p></div><Badge variant={plan.isActive ? "success" : "secondary"}>{plan.isActive ? "Active" : "Inactive"}</Badge></div></CardHeader><CardContent className="space-y-4"><p className="min-h-10 text-sm text-muted-foreground">{plan.description || "No description provided."}</p><div className="flex justify-end gap-2"><Button variant="outline" size="sm" asChild><Link href={`/plans/${plan.id}`}><Eye className="size-4" />View</Link></Button>{canEdit && <Button variant="outline" size="sm" onClick={() => setFormPlan(plan)}><Pencil className="size-4" />Edit</Button>}{canDeactivate && plan.isActive && <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={`More actions for ${plan.name}`}><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem variant="destructive" disabled={isPending} onClick={() => setPlanToDeactivate(plan)}><Trash2 className="size-4" />Deactivate</DropdownMenuItem></DropdownMenuContent></DropdownMenu>}</div></CardContent></Card>)}</div>}
    <Dialog open={formPlan !== null} onOpenChange={(open) => !open && setFormPlan(null)}><DialogContent><DialogHeader><DialogTitle>{formPlan === "add" ? "Add membership plan" : "Edit membership plan"}</DialogTitle><DialogDescription>Set the pricing and duration offered to your members.</DialogDescription></DialogHeader><div className="mt-5"><PlanForm plan={formPlan && formPlan !== "add" ? formPlan : undefined} onDone={done} /></div></DialogContent></Dialog>
    <Dialog open={planToDeactivate !== null} onOpenChange={(open) => !open && !isPending && setPlanToDeactivate(null)}><DialogContent><DialogHeader><DialogTitle>Deactivate membership plan?</DialogTitle><DialogDescription>Existing subscriptions using this plan should remain intact. The plan will no longer be available for new subscriptions.</DialogDescription></DialogHeader><div className="mt-6 flex justify-end gap-3"><Button variant="outline" disabled={isPending} onClick={() => setPlanToDeactivate(null)}>Cancel</Button><Button variant="destructive" disabled={isPending} onClick={deactivate}>{isPending ? "Deactivating..." : "Deactivate Plan"}</Button></div></DialogContent></Dialog>
  </>;
}