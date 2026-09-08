"use client";

import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { createPayment } from "@/actions/payments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { paymentSchema, type PaymentFormValues } from "@/lib/validations/payment";

type Subscription = { id: string; memberId: string; amount: string; member: { name: string; phone: string }; plan: { name: string }; payments: string[] };
function money(value: string) { return `₹${Number(value).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }

export function PaymentForm({ subscriptions }: { subscriptions: Subscription[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const { control, register, setValue, handleSubmit, setError: setFieldError, formState: { errors } } = useForm<PaymentFormValues>({ resolver: zodResolver(paymentSchema), defaultValues: { memberId: "", subscriptionId: "", amount: "", paymentMethod: "CASH", paymentDate: new Date().toISOString().slice(0, 10), referenceNumber: "", notes: "" } });
  const subscriptionId = useWatch({ control, name: "subscriptionId" });
  const selected = subscriptions.find((subscription) => subscription.id === subscriptionId);
  const paid = selected?.payments.reduce((sum, value) => sum + Number(value), 0) ?? 0;
  const outstanding = selected ? Math.max(0, Number(selected.amount) - paid) : 0;
  const submit = (values: PaymentFormValues) => startTransition(async () => { setError(""); const result = await createPayment(values); if (!result.success) { setError(result.message); Object.entries(result.fieldErrors ?? {}).forEach(([field, message]) => setFieldError(field as keyof PaymentFormValues, { message })); return; } router.push("/payments"); router.refresh(); });
  return <form onSubmit={handleSubmit(submit)} className="space-y-4"><label className="space-y-1 text-sm"><span>Member / subscription *</span><select {...register("subscriptionId", { onChange: (event) => { const item = subscriptions.find((entry) => entry.id === event.target.value); setValue("memberId", item?.memberId ?? ""); } })} className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"><option value="">Select active subscription</option>{subscriptions.map((item) => <option key={item.id} value={item.id}>{item.member.name} — {item.plan.name} ({item.member.phone})</option>)}</select>{errors.subscriptionId && <span className="text-xs text-destructive">{errors.subscriptionId.message}</span>}</label><input type="hidden" {...register("memberId")} />{selected && <div className="rounded-md border bg-muted/30 p-3 text-sm">Subscription fee: {money(selected.amount)} · Paid: {money(String(paid))} · Outstanding: {money(String(outstanding))}</div>}<label className="space-y-1 text-sm"><span>Amount *</span><Input type="text" inputMode="decimal" {...register("amount")} aria-invalid={Boolean(errors.amount)} />{errors.amount && <span className="text-xs text-destructive">{errors.amount.message}</span>}</label><label className="space-y-1 text-sm"><span>Payment method *</span><select {...register("paymentMethod")} className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm">{["CASH", "UPI", "CARD", "BANK_TRANSFER", "CHEQUE", "ONLINE", "OTHER"].map((method) => <option key={method}>{method}</option>)}</select></label><label className="space-y-1 text-sm"><span>Payment date *</span><Input type="date" {...register("paymentDate")} /></label><label className="space-y-1 text-sm"><span>Reference number</span><Input {...register("referenceNumber")} /></label><label className="space-y-1 text-sm"><span>Notes</span><textarea {...register("notes")} className="border-input bg-background min-h-20 w-full rounded-md border px-3 py-2" /></label>{error && <p className="text-sm text-destructive">{error}</p>}<div className="flex justify-end"><Button disabled={isPending}>{isPending ? "Recording..." : "Record payment"}</Button></div></form>;
}
