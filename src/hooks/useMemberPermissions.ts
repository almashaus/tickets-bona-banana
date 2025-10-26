import useSWR from "swr";
import { AppUser } from "@/src/models/user";
import { canMemberAccess } from "@/src/lib/utils/checkPermission";
import { MemberRole, PermissionAction } from "../types/permissions";

type PermissionKey = [MemberRole, string, PermissionAction];

const fetchPermission = async (
  role: MemberRole,
  feature: string,
  action: PermissionAction
) => {
  return canMemberAccess(role, feature, action);
};

export function useMemberPermissionChecker(user: AppUser | null | undefined) {
  const role = user?.dashboard?.role;

  function checkPermission(feature: string, action: PermissionAction) {
    const { data, isLoading } = useSWR(
      role ? ([role, feature, action] as PermissionKey) : null,
      ([role, feature, action]) => fetchPermission(role, feature, action),
      { revalidateOnFocus: false }
    );
    return { allowed: data ?? false, isLoading };
  }

  return { checkPermission };
}
