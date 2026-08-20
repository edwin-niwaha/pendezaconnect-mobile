import type { User } from "@/types";

const STAFF_ROLES = new Set(["administrator", "manager", "staff", "boo", "hof", "ed", "accountant"]);

export function isStaffAccount(user?: User | null) {
  return Boolean(
    user?.account_type === "staff" ||
      user?.role && STAFF_ROLES.has(user.role) ||
      user?.staff_role && STAFF_ROLES.has(user.staff_role)
  );
}

export function isClientAccount(user?: User | null) {
  return user?.account_type === "client";
}

export function isSponsorAccount(user?: User | null) {
  return user?.account_type === "sponsor";
}

export function isGuestAccount(user?: User | null) {
  return user?.account_type === "guest";
}
