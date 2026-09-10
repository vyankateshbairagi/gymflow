"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { expenseSchema } from "@/lib/validations/expense";

type ActionResult = { success: boolean; message: string; fieldErrors?: Record<string, string> };
function errors(error: { issues: { path: PropertyKey[]; message: string }[] }) { return Object.fromEntries(error.issues.map((issue) => [String(issue.path[0]), issue.message])); }
function dateOnly(value: string) { return new Date(`${value}T00:00:00.000Z`); }

export async function createExpense(input: unknown): Promise<ActionResult> {
  const user = await requireAuth();
  if (!can(user.role, "expenses:create")) return { success: false, message: "You do not have permission to record expenses." };
  const parsed = expenseSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Please correct the highlighted fields.", fieldErrors: errors(parsed.error) };
  try {
    await db.$transaction(async (tx) => {
      const expense = await tx.expense.create({ data: { organizationId: user.organizationId, title: parsed.data.title.trim(), amount: new Prisma.Decimal(parsed.data.amount), category: parsed.data.category, expenseDate: dateOnly(parsed.data.expenseDate), paymentMethod: parsed.data.paymentMethod, referenceNumber: parsed.data.referenceNumber?.trim() || null, status: parsed.data.status, notes: parsed.data.notes?.trim() || null, createdBy: user.id }, select: { id: true } });
      await tx.auditLog.create({ data: { organizationId: user.organizationId, userId: user.id, action: "EXPENSE_CREATED", entity: "Expense", entityId: expense.id, newData: { amount: parsed.data.amount, category: parsed.data.category, status: parsed.data.status } } });
    });
    revalidatePath("/expenses"); revalidatePath("/reports");
    return { success: true, message: "Expense recorded successfully" };
  } catch { return { success: false, message: "Unable to record expense. Please try again." }; }
}

export async function cancelExpense(id: unknown): Promise<ActionResult> {
  const user = await requireAuth();
  if (!can(user.role, "expenses:adjust")) return { success: false, message: "You do not have permission to adjust expenses." };
  if (typeof id !== "string" || !id.trim()) return { success: false, message: "Expense not found." };
  try {
    await db.$transaction(async (tx) => {
      const expense = await tx.expense.findFirst({ where: { id, organizationId: user.organizationId }, select: { id: true, status: true } });
      if (!expense) throw new Error("NOT_FOUND");
      if (expense.status === "CANCELLED") throw new Error("ALREADY_CANCELLED");
      await tx.expense.update({ where: { id: expense.id }, data: { status: "CANCELLED" } });
      await tx.auditLog.create({ data: { organizationId: user.organizationId, userId: user.id, action: "EXPENSE_CANCELLED", entity: "Expense", entityId: expense.id, oldData: { status: expense.status }, newData: { status: "CANCELLED" } } });
    });
    revalidatePath("/expenses"); revalidatePath(`/expenses/${id}`); revalidatePath("/reports");
    return { success: true, message: "Expense cancelled successfully" };
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") return { success: false, message: "Expense not found." };
    if (error instanceof Error && error.message === "ALREADY_CANCELLED") return { success: false, message: "Expense is already cancelled." };
    return { success: false, message: "Unable to cancel expense. Please try again." };
  }
}
