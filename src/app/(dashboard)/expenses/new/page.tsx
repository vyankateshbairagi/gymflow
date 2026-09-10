import { redirect } from "next/navigation";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/permissions";

export default async function NewExpensePage() {
  const user = await getCurrentUser();
  if (!can(user.role, "expenses:create")) redirect("/expenses");
  return <div className="mx-auto max-w-2xl space-y-6"><div><h1 className="text-2xl font-semibold tracking-tight">Record expense</h1><p className="text-sm text-muted-foreground">Add a protected operational expense record.</p></div><Card><CardHeader><CardTitle>Expense information</CardTitle></CardHeader><CardContent><ExpenseForm /></CardContent></Card></div>;
}
