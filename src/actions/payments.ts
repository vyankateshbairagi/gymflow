"use server";

import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { paymentSchema, refundSchema } from "@/lib/validations/payment";

type ActionResult = { success: boolean; message: string; fieldErrors?: Record<string, string> };
function errors(error: { issues: { path: PropertyKey[]; message: string }[] }) { return Object.fromEntries(error.issues.map((issue) => [String(issue.path[0]), issue.message])); }
function dateOnly(value: string) { return new Date(`${value}T00:00:00.000Z`); }
function receipt() { return `PAY-${Date.now()}-${randomUUID().slice(0, 6).toUpperCase()}`; }

export async function createPayment(input: unknown): Promise<ActionResult> {
  const user = await requireAuth();
  if (!can(user.role, "payments:create")) return { success: false, message: "You do not have permission to record payments." };
  const parsed = paymentSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Please correct the highlighted fields.", fieldErrors: errors(parsed.error) };
  try {
    await db.$transaction(async (tx) => {
      const amount = new Prisma.Decimal(parsed.data.amount);
      const subscription = await tx.subscription.findFirst({ where: { id: parsed.data.subscriptionId, memberId: parsed.data.memberId, organizationId: user.organizationId }, select: { id: true, amount: true } });
      if (!subscription) throw new Error("SUBSCRIPTION_NOT_FOUND");
      const history = await tx.payment.findMany({ where: { organizationId: user.organizationId, subscriptionId: subscription.id }, select: { amount: true, originalPaymentId: true, status: true } });
      const paid = history.filter((payment) => payment.originalPaymentId === null && payment.status !== "FAILED" && payment.status !== "VOIDED").reduce((sum, payment) => sum.plus(payment.amount), new Prisma.Decimal(0));
      const refunded = history.filter((payment) => payment.originalPaymentId !== null && (payment.status === "REFUNDED" || payment.status === "PARTIALLY_REFUNDED")).reduce((sum, payment) => sum.plus(payment.amount), new Prisma.Decimal(0));
      const outstanding = subscription.amount.minus(paid).plus(refunded);
      if (amount.greaterThan(outstanding)) throw new Error("OVERPAYMENT");
      await tx.payment.create({ data: { organizationId: user.organizationId, memberId: parsed.data.memberId, subscriptionId: subscription.id, amount, paymentMethod: parsed.data.paymentMethod, paymentDate: dateOnly(parsed.data.paymentDate), receiptNumber: receipt(), status: "COMPLETED", notes: parsed.data.notes?.trim() || parsed.data.referenceNumber?.trim() || null, createdBy: user.id } });
      await tx.auditLog.create({ data: { organizationId: user.organizationId, userId: user.id, action: "PAYMENT_CREATED", entity: "Payment", entityId: subscription.id, newData: { amount: parsed.data.amount, paymentMethod: parsed.data.paymentMethod } } });
    });
    revalidatePath("/payments"); revalidatePath(`/subscriptions/${parsed.data.subscriptionId}`); revalidatePath(`/members/${parsed.data.memberId}`);
    return { success: true, message: "Payment recorded successfully" };
  } catch (error) {
    if (error instanceof Error && error.message === "SUBSCRIPTION_NOT_FOUND") return { success: false, message: "Subscription not found for this member." };
    if (error instanceof Error && error.message === "OVERPAYMENT") return { success: false, message: "Payment exceeds the outstanding amount." };
    return { success: false, message: "Unable to record payment. Please try again." };
  }
}

export async function refundPayment(input: unknown): Promise<ActionResult> {
  const user = await requireAuth();
  if (!can(user.role, "payments:refund")) return { success: false, message: "You do not have permission to refund payments." };
  const parsed = refundSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Please correct the highlighted fields.", fieldErrors: errors(parsed.error) };
  try {
    await db.$transaction(async (tx) => {
      const original = await tx.payment.findFirst({ where: { id: parsed.data.paymentId, organizationId: user.organizationId, status: { in: ["COMPLETED", "PARTIALLY_REFUNDED"] } } });
      if (!original) throw new Error("PAYMENT_NOT_FOUND");
      const existing = await tx.payment.aggregate({ where: { originalPaymentId: original.id }, _sum: { amount: true } });
      const refundAmount = new Prisma.Decimal(parsed.data.amount);
      if (refundAmount.greaterThan(original.amount.minus(existing._sum.amount ?? 0))) throw new Error("REFUND_TOO_LARGE");
      await tx.payment.create({ data: { organizationId: user.organizationId, memberId: original.memberId, subscriptionId: original.subscriptionId, amount: refundAmount, paymentMethod: original.paymentMethod, paymentDate: new Date(), receiptNumber: receipt(), status: refundAmount.equals(original.amount) ? "REFUNDED" : "PARTIALLY_REFUNDED", notes: parsed.data.reason, createdBy: user.id, originalPaymentId: original.id } });
      await tx.payment.update({ where: { id: original.id }, data: { status: refundAmount.equals(original.amount) ? "REFUNDED" : "PARTIALLY_REFUNDED" } });
      await tx.auditLog.create({ data: { organizationId: user.organizationId, userId: user.id, action: "PAYMENT_REFUNDED", entity: "Payment", entityId: original.id, oldData: { amount: original.amount.toString(), status: original.status }, newData: { amount: parsed.data.amount, reason: parsed.data.reason } } });
    });
    revalidatePath("/payments"); revalidatePath(`/payments/${parsed.data.paymentId}`);
    return { success: true, message: "Payment refund recorded successfully" };
  } catch (error) {
    if (error instanceof Error && error.message === "PAYMENT_NOT_FOUND") return { success: false, message: "Payment not found or already refunded." };
    if (error instanceof Error && error.message === "REFUND_TOO_LARGE") return { success: false, message: "Refund exceeds the original payment amount." };
    return { success: false, message: "Unable to refund payment. Please try again." };
  }
}