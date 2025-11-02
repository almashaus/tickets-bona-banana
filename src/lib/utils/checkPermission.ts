import {
  MemberRole,
  PermissionAction,
  RolePermissions,
} from "@/src/types/permissions";
import { usePermissionStore } from "@/src/lib/stores/usePermissionStore";

export async function canMemberAccess(
  role: MemberRole | undefined,
  feature: string,
  action: PermissionAction
): Promise<boolean> {
  if (!role) return false;

  let rolePermissions = usePermissionStore.getState().rolePermissions;
  const setRolePermissions = usePermissionStore.getState().setRolePermissions;

  let perObject: RolePermissions | null = null;

  if (!rolePermissions) {
    const response = await fetch("/api/admin/permissions");

    if (response.ok) {
      const permissions: RolePermissions = await response.json();
      setRolePermissions(permissions);
      rolePermissions = permissions;
    } else {
      return false;
    }
  }

  perObject = rolePermissions;

  const permissions = perObject[role];
  if (!permissions) return false;
  const featurePerm = permissions.find((p) => p.feature === feature);

  if (!featurePerm) return false;

  return !!featurePerm[action];
}
