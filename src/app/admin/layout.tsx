import type React from "react";
import { DashboardSidebar } from "@/src/components/ui/dashboard-sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div dir="ltr" className="flex">
      <DashboardSidebar />
      <section className="w-full">{children}</section>
    </div>
  );
}
