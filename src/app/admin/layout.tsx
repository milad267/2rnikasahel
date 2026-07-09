import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { HeightSync } from "@/components/admin/HeightSync";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminAssistant } from "@/components/admin/AdminAssistant";
import { AdminFloatingButtons } from "@/components/admin/AdminFloatingButtons";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "superadmin" && user.role !== "admin") redirect("/");

  return (
    <div id="admin-root" data-admin>
      <HeightSync />
      <AdminSidebar adminName={user.name} adminEmail={user.email || user.phone || ""} />

      <main
        style={{
          marginRight: "var(--sidebar-width, 260px)",
          paddingTop: "var(--header-height, 80px)",
          minHeight: "100vh",
          transition: "margin-right 0.3s ease-in-out",
        }}
      >
        <div className="p-6 md:p-8">{children}</div>
      </main>

      <AdminAssistant />
      <AdminFloatingButtons />
    </div>
  );
}
