"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { membershipPlanFormSchema, membershipPlanUpdateSchema, type MembershipPlanFormValues } from "@/lib/validations/membership-plan";

type ActionResult = { success: boolean; message: string; fieldErrors?: Record<string, string> };

function fieldErrors(error: { issues: { path: PropertyKey[]; message: string }[] }) {
  return Object.fromEntries(error.issues.map((issue) => [String(issue.path[0]), issue.message]));
}

function planData(input: MembershipPlanFormValues) {
  return {
    name: input.name.trim(),
    description: input.description?.trim() || null,
    price: input.price.trim(),
    durationInDays: input.durationInDays,
    isActive: input.isActive,
  };
}

export async function createMembershipPlan(input: unknown): Promise<ActionResult> {
  const user = await requireAuth();
  if (!can(user.role, "plans:create")) return { success: false, message: "You do not have permission to create plans." };
  const parsed = membershipPlanFormSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Please correct the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };

  try {
    const duplicate = await db.membershipPlan.findFirst({ where: { organizationId: user.organizationId, name: { equals: parsed.data.name.trim(), mode: "insensitive" } }, select: { id: true } });
    if (duplicate) return { success: false, message: "A plan with this name already exists." };
    await db.membershipPlan.create({ data: { organizationId: user.organizationId, ...planData(parsed.data) } });
    revalidatePath("/plans");
    return { success: true, message: "Membership plan created successfully" };
  } catch {
    return { success: false, message: "Unable to create the membership plan right now." };
  }
}

export async function updateMembershipPlan(input: unknown): Promise<ActionResult> {
  const user = await requireAuth();
  if (!can(user.role, "plans:update")) return { success: false, message: "You do not have permission to update plans." };
  const parsed = membershipPlanUpdateSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Please correct the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  const { id, ...values } = parsed.data;

  try {
    const duplicate = await db.membershipPlan.findFirst({ where: { organizationId: user.organizationId, name: { equals: values.name.trim(), mode: "insensitive" }, NOT: { id } }, select: { id: true } });
    if (duplicate) return { success: false, message: "A plan with this name already exists." };
    const result = await db.membershipPlan.updateMany({ where: { id, organizationId: user.organizationId }, data: planData(values) });
    if (result.count !== 1) return { success: false, message: "Membership plan not found." };
    revalidatePath("/plans");
    revalidatePath(`/plans/${id}`);
    return { success: true, message: "Membership plan updated successfully" };
  } catch {
    return { success: false, message: "Unable to update the membership plan right now." };
  }
}

export async function deactivateMembershipPlan(id: unknown): Promise<ActionResult> {
  const user = await requireAuth();
  if (!can(user.role, "plans:deactivate")) return { success: false, message: "Only owners can deactivate membership plans." };
  if (typeof id !== "string" || !id.trim()) return { success: false, message: "Membership plan not found." };

  try {
    const result = await db.membershipPlan.updateMany({ where: { id, organizationId: user.organizationId }, data: { isActive: false } });
    if (result.count !== 1) return { success: false, message: "Membership plan not found." };
    revalidatePath("/plans");
    revalidatePath(`/plans/${id}`);
    return { success: true, message: "Membership plan deactivated successfully" };
  } catch {
    return { success: false, message: "Unable to deactivate the membership plan right now." };
  }
}