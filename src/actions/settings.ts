"use server";

import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import {
  organizationUpdateSchema,
  preferencesSchema,
  staffCreateSchema,
  staffUpdateSchema,
} from "@/lib/validations/settings";

type ActionResult = { success: boolean; message: string; fieldErrors?: Record<string, string> };

function errors(error: { issues: { path: PropertyKey[]; message: string }[] }) {
  return Object.fromEntries(error.issues.map((issue) => [String(issue.path[0]), issue.message]));
}

function toNullable(value: string | undefined) {
  return value?.trim() ? value.trim() : null;
}

// ---------------------------------------------------------------------------
// Organization profile
// ---------------------------------------------------------------------------

export async function updateOrganization(input: unknown): Promise<ActionResult> {
  const user = await requireAuth();
  if (!can(user.role, "settings:manage")) {
    return { success: false, message: "You do not have permission to update organization details." };
  }

  const parsed = organizationUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Please correct the highlighted fields.", fieldErrors: errors(parsed.error) };
  }

  try {
    await db.$transaction(async (tx) => {
      // organizationId always comes from the session — never from `input`,
      // and organizationUpdateSchema doesn't even accept one.
      const before = await tx.organization.findUniqueOrThrow({
        where: { id: user.organizationId },
        select: { name: true, email: true, phone: true, address: true },
      });

      const after = {
        name: parsed.data.name.trim(),
        email: toNullable(parsed.data.email)?.toLowerCase() ?? null,
        phone: toNullable(parsed.data.phone),
        address: toNullable(parsed.data.address),
      };

      await tx.organization.update({ where: { id: user.organizationId }, data: after });

      await tx.auditLog.create({
        data: {
          organizationId: user.organizationId,
          userId: user.id,
          action: "ORGANIZATION_UPDATED",
          entity: "Organization",
          entityId: user.organizationId,
          oldData: before,
          newData: after,
        },
      });
    });

    revalidatePath("/settings");
    return { success: true, message: "Organization details updated successfully" };
  } catch {
    return { success: false, message: "Unable to update organization details right now." };
  }
}

// ---------------------------------------------------------------------------
// Preferences
// ---------------------------------------------------------------------------

export async function updatePreferences(input: unknown): Promise<ActionResult> {
  const user = await requireAuth();
  if (!can(user.role, "settings:manage")) {
    return { success: false, message: "You do not have permission to update preferences." };
  }

  const parsed = preferencesSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Please correct the highlighted fields.", fieldErrors: errors(parsed.error) };
  }

  try {
    await db.$transaction(async (tx) => {
      const before = await tx.organization.findUniqueOrThrow({
        where: { id: user.organizationId },
        select: { currency: true, timezone: true },
      });

      await tx.organization.update({
        where: { id: user.organizationId },
        data: { currency: parsed.data.currency, timezone: parsed.data.timezone },
      });

      await tx.auditLog.create({
        data: {
          organizationId: user.organizationId,
          userId: user.id,
          action: "ORGANIZATION_PREFERENCES_UPDATED",
          entity: "Organization",
          entityId: user.organizationId,
          oldData: before,
          newData: parsed.data,
        },
      });
    });

    revalidatePath("/settings");
    return { success: true, message: "Preferences updated successfully" };
  } catch {
    return { success: false, message: "Unable to update preferences right now." };
  }
}

// ---------------------------------------------------------------------------
// Staff accounts
//
// Every mutation below filters on { organizationId: user.organizationId,
// role: "STAFF" } wherever it targets an existing user id. That second
// condition is deliberate, not incidental: it means an OWNER account can
// never be matched by these actions no matter what id a client sends, which
// is what guarantees (a) a staff member can never be edited into/out of
// ownership here (there's no role field on the update schema at all), and
// (b) the last/only OWNER account can never be deactivated through this
// flow, because OWNER rows are simply never a valid target of it.
// ---------------------------------------------------------------------------

export async function createStaff(input: unknown): Promise<ActionResult> {
  const user = await requireAuth();
  if (!can(user.role, "staff:manage")) {
    return { success: false, message: "You do not have permission to add staff accounts." };
  }

  const parsed = staffCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Please correct the highlighted fields.", fieldErrors: errors(parsed.error) };
  }

  const email = parsed.data.email.trim().toLowerCase();

  try {
    const existing = await db.user.findFirst({
      where: { organizationId: user.organizationId, email },
      select: { id: true },
    });
    if (existing) {
      return {
        success: false,
        message: "Please correct the highlighted fields.",
        fieldErrors: { email: "This email is already in use." },
      };
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);

    await db.$transaction(async (tx) => {
      // role is hardcoded here, never taken from `input` — staffCreateSchema
      // doesn't have a role field, so there's nothing for a client to submit.
      const staff = await tx.user.create({
        data: {
          organizationId: user.organizationId,
          name: parsed.data.name.trim(),
          email,
          passwordHash,
          role: "STAFF",
        },
        select: { id: true },
      });

      await tx.auditLog.create({
        data: {
          organizationId: user.organizationId,
          userId: user.id,
          action: "STAFF_CREATED",
          entity: "User",
          entityId: staff.id,
          newData: { name: parsed.data.name.trim(), email, role: "STAFF" },
        },
      });
    });

    revalidatePath("/settings");
    return { success: true, message: "Staff account created successfully" };
  } catch (error) {
    const isDuplicateEmail =
      error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
    if (isDuplicateEmail) {
      return {
        success: false,
        message: "Please correct the highlighted fields.",
        fieldErrors: { email: "This email is already in use." },
      };
    }
    return { success: false, message: "Unable to create staff account right now." };
  }
}

export async function updateStaff(input: unknown): Promise<ActionResult> {
  const user = await requireAuth();
  if (!can(user.role, "staff:manage")) {
    return { success: false, message: "You do not have permission to update staff accounts." };
  }

  const parsed = staffUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Please correct the highlighted fields.", fieldErrors: errors(parsed.error) };
  }

  const { id, ...values } = parsed.data;
  const email = values.email.trim().toLowerCase();

  try {
    const emailTaken = await db.user.findFirst({
      where: { organizationId: user.organizationId, email, NOT: { id } },
      select: { id: true },
    });
    if (emailTaken) {
      return {
        success: false,
        message: "Please correct the highlighted fields.",
        fieldErrors: { email: "This email is already in use." },
      };
    }

    const result = await db.$transaction(async (tx) => {
      const before = await tx.user.findFirst({
        where: { id, organizationId: user.organizationId, role: "STAFF" },
        select: { name: true, email: true, isActive: true },
      });
      if (!before) return { count: 0 };

      const after = { name: values.name.trim(), email, isActive: values.isActive };

      const update = await tx.user.updateMany({
        where: { id, organizationId: user.organizationId, role: "STAFF" },
        data: after,
      });

      if (update.count > 0) {
        await tx.auditLog.create({
          data: {
            organizationId: user.organizationId,
            userId: user.id,
            action: "STAFF_UPDATED",
            entity: "User",
            entityId: id,
            oldData: before,
            newData: after,
          },
        });
      }

      return update;
    });

    if (result.count === 0) {
      return { success: false, message: "Staff account not found." };
    }

    revalidatePath("/settings");
    return { success: true, message: "Staff account updated successfully" };
  } catch (error) {
    const isDuplicateEmail =
      error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
    if (isDuplicateEmail) {
      return {
        success: false,
        message: "Please correct the highlighted fields.",
        fieldErrors: { email: "This email is already in use." },
      };
    }
    return { success: false, message: "Unable to update staff account right now." };
  }
}

async function setStaffActive(userId: unknown, isActive: boolean, action: string): Promise<ActionResult> {
  const user = await requireAuth();
  if (!can(user.role, "staff:manage")) {
    return { success: false, message: "You do not have permission to manage staff accounts." };
  }
  if (typeof userId !== "string" || !userId.trim()) {
    return { success: false, message: "Staff account not found." };
  }

  try {
    const result = await db.$transaction(async (tx) => {
      const before = await tx.user.findFirst({
        where: { id: userId, organizationId: user.organizationId, role: "STAFF" },
        select: { isActive: true },
      });
      if (!before) return { count: 0 };

      const update = await tx.user.updateMany({
        where: { id: userId, organizationId: user.organizationId, role: "STAFF" },
        data: { isActive },
      });

      if (update.count > 0) {
        await tx.auditLog.create({
          data: {
            organizationId: user.organizationId,
            userId: user.id,
            action,
            entity: "User",
            entityId: userId,
            oldData: { isActive: before.isActive },
            newData: { isActive },
          },
        });
      }

      return update;
    });

    if (result.count === 0) {
      return { success: false, message: "Staff account not found." };
    }

    revalidatePath("/settings");
    return {
      success: true,
      message: isActive ? "Staff account activated successfully" : "Staff account deactivated successfully",
    };
  } catch {
    return { success: false, message: "Unable to update staff account right now." };
  }
}

export async function deactivateStaff(userId: unknown): Promise<ActionResult> {
  return setStaffActive(userId, false, "STAFF_DEACTIVATED");
}

export async function reactivateStaff(userId: unknown): Promise<ActionResult> {
  return setStaffActive(userId, true, "STAFF_ACTIVATED");
}
