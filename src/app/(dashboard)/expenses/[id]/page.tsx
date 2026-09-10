import { notFound, redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { expenseCategories } from "@/lib/validations/expense";

function money(value: string) { const [whole, decimals] = value.split("."); return `₹${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${decimals ?? "00"}`; }
function date(value: Date) { const [year, month, day] = value.toISOString().slice(0, 10).split("-"); return `${month}/${day}/${year}`; }
const labels: Record<string, string> = Object.fromEntries(expenseCategories.map((category) => [category, category.replaceAll("_", " ")]));

export default async function ExpenseDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!can(user.role, "expenses:view")) redirect("/dashboard");
  const { id } = await params;
  const expense = await db.expense.findFirst({ where: { id, organizationId: user.organizationId }, include: { creator: { select: { name: true, email: true } } } });
  if (!expense) notFound();
  return <div className="max-w-2xl space-y-6"><div><p className="text-sm text-muted-foreground">Expense details</p><h1 className="text-2xl font-semibold tracking-tight">{expense.title}</h1></div><Card><CardHeader><CardTitle>Expense</CardTitle></CardHeader><CardContent className="grid gap-5 sm:grid-cols-2"><div><p className="text-xs text-muted-foreground">Amount</p><p className="text-2xl font-semibold">{money(expense.amount.toString())}</p></div><div><p className="text-xs text-muted-foreground">Status</p><Badge variant={expense.status === "PAID" ? "success" : expense.status === "CANCELLED" ? "destructive" : "warning"}>{expense.status}</Badge></div><div><p className="text-xs text-muted-foreground">Category</p><p>{labels[expense.category] ?? expense.category}</p></div><div><p className="text-xs text-muted-foreground">Expense date</p><p>{date(expense.expenseDate)}</p></div><div><p className="text-xs text-muted-foreground">Payment method</p><p>{expense.paymentMethod ?? "-"}</p></div><div><p className="text-xs text-muted-foreground">Reference</p><p>{expense.referenceNumber ?? "-"}</p></div><div className="sm:col-span-2"><p className="text-xs text-muted-foreground">Notes</p><p>{expense.notes ?? "-"}</p></div></CardContent></Card><Card><CardHeader><CardTitle>Audit information</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2 text-sm"><div><p className="text-xs text-muted-foreground">Created by</p><p>{expense.creator?.name ?? "-"}</p></div><div><p className="text-xs text-muted-foreground">Created at</p><p>{date(expense.createdAt)}</p></div><div><p className="text-xs text-muted-foreground">Updated at</p><p>{date(expense.updatedAt)}</p></div></CardContent></Card>{can(user.role, "expenses:adjust") && expense.status !== "CANCELLED" && <p className="text-sm text-muted-foreground">Expense corrections are preserved through the audit history.</p>}</div>;
}
