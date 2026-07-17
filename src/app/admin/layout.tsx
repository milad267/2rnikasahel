import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { HeightSync } from "@/components/admin/HeightSync";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminAssistant } from "@/components/admin/AdminAssistant";
import AdminToaster from "@/components/admin/AdminToaster";
import { hasModuleAccess } from "@/lib/admin-permissions-server";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "superadmin" && user.role !== "admin") redirect("/");
  const canUseAi = await hasModuleAccess(user.id, user.role, "ai");

  return (
    <div id="admin-root" data-admin>
      <HeightSync />
      <AdminSidebar adminName={user.name} adminEmail={user.email || user.phone || ""} />

      <main
        style={{
          paddingTop: "var(--header-height, 80px)",
          minHeight: "100vh",
          transition: "margin-right 0.3s ease-in-out",
        }}
        className="md:mr-[260px]"
      >
        <div className="p-4 md:p-8">{children}</div>
      </main>

      {canUseAi ? <AdminAssistant /> : null}
      <AdminToaster />
    </div>
  );
}
