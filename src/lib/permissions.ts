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
  | "reports:view"
  | "members:view"
  | "members:create"
  | "members:update"
  | "members:deactivate"
  | "plans:view"
  | "plans:create"
  | "plans:update"
  | "plans:deactivate"
  | "subscriptions:view"
  | "subscriptions:create"
  | "subscriptions:update"
  | "subscriptions:cancel";

const rolePermissions: Record<UserRole, Permission[]> = {
  OWNER: ["settings:manage", "staff:manage", "payments:void", "reports:view", "members:view", "members:create", "members:update", "members:deactivate", "plans:view", "plans:create", "plans:update", "plans:deactivate", "subscriptions:view", "subscriptions:create", "subscriptions:update", "subscriptions:cancel"],
  STAFF: ["reports:view", "members:view", "members:create", "members:update", "plans:view", "subscriptions:view", "subscriptions:create", "subscriptions:update"],
};

export function can(role: UserRole, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) ?? false;
}

export function isOwner(role: UserRole): boolean {
  return role === "OWNER";
}

