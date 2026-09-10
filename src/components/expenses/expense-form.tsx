"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { createExpense } from "@/actions/expenses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { expenseCategories, expenseSchema, type ExpenseFormValues } from "@/lib/validations/expense";

const labels: Record<(typeof expenseCategories)[number], string> = { RENT: "Rent", ELECTRICITY: "Electricity", WATER: "Water", INTERNET: "Internet", EQUIPMENT: "Equipment", EQUIPMENT_REPAIR: "Equipment repair", MAINTENANCE: "Maintenance", CLEANING: "Cleaning", STAFF: "Staff", MARKETING: "Marketing", SUPPLIES: "Supplies", SOFTWARE: "Software", INSURANCE: "Insurance", TAX: "Tax", MISCELLANEOUS: "Miscellaneous", OTHER: "Other" };

export function ExpenseForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const { register, handleSubmit, setError: setFieldError, formState: { errors } } = useForm<ExpenseFormValues>({ resolver: zodResolver(expenseSchema), defaultValues: { category: "OTHER", amount: "", title: "", expenseDate: new Date().toISOString().slice(0, 10), paymentMethod: "CASH", referenceNumber: "", notes: "", status: "PAID" } });
  const submit = (values: ExpenseFormValues) => startTransition(async () => { const result = await createExpense(values); if (!result.success) { setError(result.message); Object.entries(result.fieldErrors ?? {}).forEach(([field, message]) => setFieldError(field as keyof ExpenseFormValues, { message })); return; } router.push("/expenses"); router.refresh(); });
  return <form onSubmit={handleSubmit(submit)} className="space-y-4"><label className="space-y-1 text-sm"><span>Category *</span><select {...register("category")} className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm">{expenseCategories.map((category) => <option key={category} value={category}>{labels[category]}</option>)}</select>{errors.category && <span className="text-xs text-destructive">{errors.category.message}</span>}</label><label className="space-y-1 text-sm"><span>Description *</span><Input {...register("title")} />{errors.title && <span className="text-xs text-destructive">{errors.title.message}</span>}</label><label className="space-y-1 text-sm"><span>Amount *</span><Input inputMode="decimal" {...register("amount")} />{errors.amount && <span className="text-xs text-destructive">{errors.amount.message}</span>}</label><label className="space-y-1 text-sm"><span>Expense date *</span><Input type="date" {...register("expenseDate")} /></label><label className="space-y-1 text-sm"><span>Payment method</span><select {...register("paymentMethod")} className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm">{["CASH", "UPI", "CARD", "BANK_TRANSFER", "CHEQUE", "ONLINE", "OTHER"].map((method) => <option key={method}>{method}</option>)}</select></label><label className="space-y-1 text-sm"><span>Reference number</span><Input {...register("referenceNumber")} /></label><label className="space-y-1 text-sm"><span>Notes</span><textarea {...register("notes")} className="border-input bg-background min-h-20 w-full rounded-md border px-3 py-2" /></label>{error && <p className="text-sm text-destructive">{error}</p>}<div className="flex justify-end"><Button disabled={isPending}>{isPending ? "Recording..." : "Record expense"}</Button></div></form>;
}
