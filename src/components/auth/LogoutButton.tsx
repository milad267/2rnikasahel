"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50/50 px-4 py-2 text-xs font-semibold text-red-600 transition-all hover:bg-red-100 disabled:opacity-50"
    >
      <LogOut className="size-4" strokeWidth={1.8} />
      {loading ? "در حال خروج..." : "خروج از حساب"}
    </button>
  );
}
