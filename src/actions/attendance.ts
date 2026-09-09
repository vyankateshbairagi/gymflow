"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { checkInSchema, checkOutSchema } from "@/lib/validations/attendance";

type ActionResult = { success: boolean; message: string; fieldErrors?: Record<string, string> };
function fieldErrors(error: { issues: { path: PropertyKey[]; message: string }[] }) { return Object.fromEntries(error.issues.map((issue) => [String(issue.path[0]), issue.message])); }
function todayDate() { const now = new Date(); return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())); }
function activeSubscriptionWhere(today: Date) { return { status: "ACTIVE" as const, startDate: { lte: today }, endDate: { gte: today } }; }

export async function checkInMember(input: unknown): Promise<ActionResult> {
  const user = await requireAuth();
  if (!can(user.role, "attendance:create")) return { success: false, message: "You do not have permission to check in members." };
  const parsed = checkInSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Please select a member.", fieldErrors: fieldErrors(parsed.error) };
  const date = todayDate();
  try {
    const result = await db.$transaction(async (tx) => {
      const member = await tx.member.findFirst({ where: { id: parsed.data.memberId, organizationId: user.organizationId }, select: { id: true, name: true } });
      if (!member) throw new Error("MEMBER_NOT_FOUND");
      const subscription = await tx.subscription.findFirst({ where: { organizationId: user.organizationId, memberId: member.id, ...activeSubscriptionWhere(new Date()) }, select: { id: true } });
      if (!subscription) throw new Error("NO_ACTIVE_MEMBERSHIP");
      const open = await tx.attendance.findFirst({ where: { organizationId: user.organizationId, memberId: member.id, checkOutTime: null }, select: { id: true } });
      if (open) throw new Error("ALREADY_CHECKED_IN");
      const attendance = await tx.attendance.create({ data: { organizationId: user.organizationId, memberId: member.id, date, checkInTime: new Date() }, select: { id: true } });
      await tx.auditLog.create({ data: { organizationId: user.organizationId, userId: user.id, action: "ATTENDANCE_CHECKED_IN", entity: "Attendance", entityId: attendance.id, newData: { memberId: member.id } } });
      return member;
    });
    revalidatePath("/attendance"); revalidatePath(`/members/${parsed.data.memberId}`); revalidatePath("/dashboard");
    return { success: true, message: `${result.name} checked in successfully.` };
  } catch (error) {
    if (error instanceof Error && error.message === "MEMBER_NOT_FOUND") return { success: false, message: "Member not found." };
    if (error instanceof Error && error.message === "NO_ACTIVE_MEMBERSHIP") return { success: false, message: "This member does not have an active membership." };
    if (error instanceof Error && error.message === "ALREADY_CHECKED_IN") return { success: false, message: "This member is already checked in." };
    return { success: false, message: "Unable to check in member. Please try again." };
  }
}

export async function checkOutMember(input: unknown): Promise<ActionResult> {
  const user = await requireAuth();
  if (!can(user.role, "attendance:update")) return { success: false, message: "You do not have permission to check out members." };
  const parsed = checkOutSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Attendance record not found.", fieldErrors: fieldErrors(parsed.error) };
  try {
    await db.$transaction(async (tx) => {
      const record = await tx.attendance.findFirst({ where: { id: parsed.data.attendanceId, organizationId: user.organizationId }, select: { id: true, memberId: true, checkOutTime: true } });
      if (!record) throw new Error("ATTENDANCE_NOT_FOUND");
      if (record.checkOutTime) throw new Error("ALREADY_CHECKED_OUT");
      await tx.attendance.update({ where: { id: record.id }, data: { checkOutTime: new Date() } });
      await tx.auditLog.create({ data: { organizationId: user.organizationId, userId: user.id, action: "ATTENDANCE_CHECKED_OUT", entity: "Attendance", entityId: record.id, newData: { memberId: record.memberId } } });
    });
    revalidatePath("/attendance"); revalidatePath("/dashboard");
    return { success: true, message: "Member checked out successfully." };
  } catch (error) {
    if (error instanceof Error && error.message === "ATTENDANCE_NOT_FOUND") return { success: false, message: "Attendance record not found." };
    if (error instanceof Error && error.message === "ALREADY_CHECKED_OUT") return { success: false, message: "This attendance record has already been completed." };
    return { success: false, message: "Unable to check out member. Please try again." };
  }
}