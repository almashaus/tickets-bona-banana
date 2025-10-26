// types/permissions.ts
export enum MemberRole {
  ADMIN = "Admin",
  MANAGER = "Manager",
  ORGANIZER = "Organizer",
  SUPPORT = "Support",
  ANALYST = "Analyst",
  PARTNER = "Partner",
}

export enum MemberStatus {
  ACTIVE = "Active",
  SUSPENDED = "Suspended",
}

export type PermissionAction = "view" | "create" | "edit" | "delete";

export type Feature =
  | "Event Management"
  | "Report Access"
  | "Send Notifications"
  | "User Management"
  | "Financial Reports";

export type FeaturePermission = {
  feature: Feature;
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
};

// Each role has multiple features with their permissions
export type RolePermissions = {
  [key in MemberRole]: FeaturePermission[];
};
