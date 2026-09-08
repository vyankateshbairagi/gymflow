"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { subscriptionFormSchema } from "@/lib/validations/subscription";

type ActionResult = { success: boolean; message: string; fieldErrors?: Record<string, string> };

function fieldErrors(error: { issues: { path: PropertyKey[]; message: string }[] }) {
  return Object.fromEntries(error.issues.map((issue) => [String(issue.path[0]), issue.message]));
}

function dateOnly(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function endDate(startDate: Date, durationInDays: number) {
  const end = new Date(startDate);
  end.setUTCDate(end.getUTCDate() + durationInDays - 1);
  return end;
}

export async function createSubscription(input: unknown): Promise<ActionResult> {
  const user = await requireAuth();
  if (!can(user.role, "subscriptions:create")) return { success: false, message: "You do not have permission to create subscriptions." };
  const parsed = subscriptionFormSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Please correct the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };

  const start = dateOnly(parsed.data.startDate);
  if (Number.isNaN(start.getTime())) return { success: false, message: "Enter a valid start date.", fieldErrors: { startDate: "Enter a valid start date." } };

  try {
    await db.$transaction(async (tx) => {
      const [member, plan] = await Promise.all([
        tx.member.findFirst({ where: { id: parsed.data.memberId, organizationId: user.organizationId }, select: { id: true } }),
        tx.membershipPlan.findFirst({ where: { id: parsed.data.planId, organizationId: user.organizationId, isActive: true }, select: { id: true, price: true, durationInDays: true } }),
      ]);
      if (!member) throw new Error("MEMBER_NOT_FOUND");
      if (!plan) throw new Error("PLAN_NOT_FOUND_OR_INACTIVE");

      const today = new Date();
      const activeSubscription = await tx.subscription.findFirst({ where: { organizationId: user.organizationId, memberId: member.id, status: "ACTIVE", startDate: { lte: today }, endDate: { gte: today } }, select: { id: true } });
      if (activeSubscription) throw new Error("ACTIVE_SUBSCRIPTION_EXISTS");

      await tx.subscription.create({ data: { organizationId: user.organizationId, memberId: member.id, planId: plan.id, startDate: start, endDate: endDate(start, plan.durationInDays), amount: plan.price, status: "ACTIVE" } });
    });
    revalidatePath("/subscriptions");
    revalidatePath(`/members/${parsed.data.memberId}`);
    revalidatePath(`/plans/${parsed.data.planId}`);
    return { success: true, message: "Subscription created successfully" };
  } catch (error) {
    if (error instanceof Error && error.message === "MEMBER_NOT_FOUND") return { success: false, message: "Member not found." };
    if (error instanceof Error && error.message === "PLAN_NOT_FOUND_OR_INACTIVE") return { success: false, message: "Selected membership plan is inactive or unavailable." };
    if (error instanceof Error && error.message === "ACTIVE_SUBSCRIPTION_EXISTS") return { success: false, message: "Member already has an active subscription." };
    return { success: false, message: "Unable to create subscription. Please try again." };
  }
}

export async function cancelSubscription(id: unknown): Promise<ActionResult> {
  const user = await requireAuth();
  if (!can(user.role, "subscriptions:cancel")) return { success: false, message: "Only owners can cancel subscriptions." };
  if (typeof id !== "string" || !id.trim()) return { success: false, message: "Subscription not found." };
  try {
    const result = await db.subscription.updateMany({ where: { id, organizationId: user.organizationId }, data: { status: "CANCELLED" } });
    if (result.count !== 1) return { success: false, message: "Subscription not found." };
    revalidatePath("/subscriptions");
    revalidatePath(`/subscriptions/${id}`);
    return { success: true, message: "Subscription cancelled successfully" };
  } catch {
    return { success: false, message: "Unable to cancel subscription. Please try again." };
  }
}