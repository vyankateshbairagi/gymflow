"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { memberFormSchema, memberUpdateSchema, type MemberFormValues } from "@/lib/validations/member";

type ActionResult = { success: boolean; message: string; fieldErrors?: Record<string, string> };

function fieldErrors(error: { issues: { path: PropertyKey[]; message: string }[] }) {
  return Object.fromEntries(error.issues.map((issue) => [String(issue.path[0]), issue.message]));
}

function toDate(value: string) { return new Date(`${value}T00:00:00.000Z`); }
function toNullable(value: string | undefined) { return value?.trim() ? value.trim() : null; }

function toEmergencyContact(input: MemberFormValues) {
  const name = input.emergencyContactName?.trim();
  const phone = input.emergencyContactPhone?.trim();
  return name || phone ? [name, phone].filter(Boolean).join(" · ") : null;
}

function memberData(input: MemberFormValues) {
  return {
    name: `${input.firstName.trim()} ${input.lastName.trim()}`,
    phone: input.phone.trim(),
    email: toNullable(input.email)?.toLowerCase() ?? null,
    gender: toNullable(input.gender),
    dateOfBirth: input.dateOfBirth ? toDate(input.dateOfBirth) : null,
    joiningDate: toDate(input.joiningDate),
    address: toNullable(input.address),
    emergencyContact: toEmergencyContact(input),
    status: input.status,
  };
}

export async function createMember(input: MemberFormValues): Promise<ActionResult> {
  const user = await requireAuth();
  if (!can(user.role, "members:create")) return { success: false, message: "You do not have permission to add members." };
  const parsed = memberFormSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Please correct the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  try {
    await db.member.create({ data: { organizationId: user.organizationId, memberCode: `GYM-${randomUUID().slice(0, 8).toUpperCase()}`, ...memberData(parsed.data) } });
    revalidatePath("/members");
    return { success: true, message: "Member added successfully" };
  } catch { return { success: false, message: "Unable to add member right now." }; }
}

export async function updateMember(input: unknown): Promise<ActionResult> {
  const user = await requireAuth();
  if (!can(user.role, "members:update")) return { success: false, message: "You do not have permission to update members." };
  const parsed = memberUpdateSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Please correct the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  const { id, ...values } = parsed.data;
  try {
    const result = await db.member.updateMany({ where: { id, organizationId: user.organizationId }, data: memberData(values) });
    if (result.count !== 1) return { success: false, message: "Member not found." };
    revalidatePath("/members");
    revalidatePath(`/members/${id}`);
    return { success: true, message: "Member updated successfully" };
  } catch { return { success: false, message: "Unable to update member right now." }; }
}

export async function deactivateMember(id: unknown): Promise<ActionResult> {
  const user = await requireAuth();
  if (!can(user.role, "members:deactivate")) return { success: false, message: "Only owners can deactivate members." };
  if (typeof id !== "string" || !id.trim()) return { success: false, message: "Member not found." };
  try {
    const result = await db.member.updateMany({ where: { id, organizationId: user.organizationId }, data: { status: "INACTIVE" } });
    if (result.count !== 1) return { success: false, message: "Member not found." };
    revalidatePath("/members");
    revalidatePath(`/members/${id}`);
    return { success: true, message: "Member deactivated successfully" };
  } catch { return { success: false, message: "Unable to deactivate member right now." }; }
}