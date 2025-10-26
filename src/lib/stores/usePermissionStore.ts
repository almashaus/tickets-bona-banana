import { RolePermissions } from "@/src/types/permissions";
import { create } from "zustand";

interface Roles {
  rolePermissions: RolePermissions | null;
  setRolePermissions: (r: RolePermissions | null) => void;
}

export const usePermissionStore = create<Roles>()((set) => ({
  rolePermissions: null,
  setRolePermissions: (r) => set({ rolePermissions: r }),
}));
