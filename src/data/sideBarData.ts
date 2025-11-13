import {
  CalendarRange,
  LayoutDashboard,
  ShieldCheck,
  Ticket,
  UserRound,
  UserRoundCog,
  UsersRound,
  Percent,
  FileText,
  Settings,
} from "lucide-react";
import { Item } from "../types/sidebarItem";

export const sidebarData: Item[] = [
  {
    title: "Dashboard",
    url: "/admin",
    icon: LayoutDashboard,
  },
  {
    title: "Events",
    url: "/admin/events",
    icon: CalendarRange,
  },
  {
    title: "Reservations",
    url: "/admin/reservations",
    icon: Ticket,
  },
  {
    title: "Customers",
    url: "/admin/customers",
    icon: UsersRound,
  },
  {
    title: "Team Members",
    url: "/admin/members",
    icon: UserRoundCog,
  },
  {
    title: "Coupons",
    url: "...",
    icon: Percent,
  },
  {
    title: "Reports",
    url: "/admin/reports",
    icon: FileText,
  },
  {
    title: "Permissions",
    url: "/admin/permissions",
    icon: ShieldCheck,
  },
  {
    title: "Settings",
    url: "/admin/settings",
    icon: Settings,
  },
  {
    title: "Profile",
    url: "/admin/profile",
    icon: UserRound,
  },
];
