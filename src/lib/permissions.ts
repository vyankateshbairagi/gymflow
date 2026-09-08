import type { UserRole } from "@prisma/client";

// ---------------------------------------------------------------------------
// Single source of truth for "who can do what". Keep role checks flowing
// through `can()` rather than scattering `role === "OWNER"` checks across
// pages/actions, so adding a permission later is a one-line change here
// instead of a hunt-and-replace.
// ---------------------------------------------------------------------------

export type Permission =
  | "settings:manage"
  | "staff:manage"
  | "payments:void"
  | "reports:view";

const rolePermissions: Record<UserRole, Permission[]> = {
  OWNER: ["settings:manage", "staff:manage", "payments:void", "reports:view"],
  STAFF: ["reports:view"],
};

export function can(role: UserRole, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) ?? false;
}

export function isOwner(role: UserRole): boolean {
  return role === "OWNER";
}

