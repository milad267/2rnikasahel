"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Package, Settings, ShieldCheck, LogOut, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { AuthPopup } from "@/components/popups/AuthPopup";
import { LogoutButton } from "@/components/auth/LogoutButton";

type UserInfo = {
  id: number;
  name: string;
  phone: string;
  role: string;
};

type UserDropdownProps = {
  user: UserInfo;
};

export function UserDropdown({ user }: UserDropdownProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const isAdmin = user.role === "superadmin" || user.role === "admin";

  // بستن منو با کلیک بیرون
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-full bg-pearl-50 px-3.5 py-1.5 text-xs font-semibold text-navy-900 transition-all hover:bg-pearl-100"
      >
        <User className="size-3.5 text-petrol-700" strokeWidth={1.8} />
        <span className="max-w-[100px] truncate">{user.name}</span>
        <ChevronDown
          className={cn(
            "size-3 text-charcoal-400 transition-transform duration-200",
            open && "rotate-180",
          )}
          strokeWidth={2}
        />
      </button>

      {open && (
        <div className="card absolute end-0 top-11 z-50 w-56 overflow-hidden rounded-2xl p-1.5 shadow-2xl">
          {/* هدر مینیاتوری کاربر */}
          <div className="rounded-xl bg-navy-900/[0.03] px-3 py-2.5">
            <p className="text-xs font-bold text-navy-900">{user.name}</p>
            <p className="text-[10px] text-charcoal-500" dir="ltr">{user.phone}</p>
          </div>

          <div className="mt-1 space-y-0.5">
            <DropItem
              href="/profile#profile"
              icon={User}
              label="پروفایل کاربری"
              onClick={() => setOpen(false)}
            />
            <DropItem
              href="/profile#orders"
              icon={Package}
              label="سفارشات من"
              onClick={() => setOpen(false)}
            />
            <DropItem
              href="/profile#settings"
              icon={Settings}
              label="تنظیمات حساب"
              onClick={() => setOpen(false)}
            />
          </div>

          {/* دکمه پنل مدیریت (فقط برای نقش‌های ادمین) */}
          {isAdmin && (
            <>
              <div className="my-1 border-t border-navy-900/10" />
              <DropItem
                href="/admin"
                icon={ShieldCheck}
                label="ورود به پنل مدیریت"
                className="text-petrol-700"
                iconClass="text-petrol-600"
                onClick={() => setOpen(false)}
              />
            </>
          )}

          <div className="mt-1 border-t border-navy-900/10 pt-1">
            <LogoutButton compact onClick={() => setOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

function DropItem({
  href,
  icon: Icon,
  label,
  onClick,
  className,
  iconClass,
}: {
  href: string;
  icon: typeof User;
  label: string;
  onClick?: () => void;
  className?: string;
  iconClass?: string;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-medium transition-all hover:bg-navy-900/[0.05]",
        className || "text-navy-900",
      )}
    >
      <Icon className={cn("size-4", iconClass || "text-charcoal-400")} strokeWidth={1.7} />
      {label}
    </Link>
  );
}
