import { LucideIcon } from "lucide-react";

export type Item = {
  title: string;
  url: string;
  icon: LucideIcon;
  notifications?: number;
};
