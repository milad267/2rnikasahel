"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, ShoppingBag, Package, Tag, Tags, FileText, Sliders,
  CreditCard, MessageSquare, Bot, Inbox, Sparkles, Users, Code, Server,
  Image, Database, Settings, ChevronLeft, ChevronDown, LogOut,
  ExternalLink, Menu, Type, Search, Truck, Camera, BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoutButton } from "@/components/auth/LogoutButton";

// ─── تعریف منوها ───
const MENU_GROUPS = [
  {
    title: "اصلی",
    items: [
      { label: "داشبورد", icon: LayoutDashboard, href: "/admin" },
      { label: "سفارشات", icon: ShoppingBag, href: "/admin/orders" },
      { label: "معرفی پروژه", icon: BookOpen, href: "/admin/about-project" },
    ],
  },
  {
    title: "فروشگاه",
    items: [
      { label: "محصولات", icon: Package, href: "/admin/products" },
      { label: "دسته‌بندی‌ها", icon: Tag, href: "/admin/categories" },
      { label: "برندها", icon: Tags, href: "/admin/brands" },
      { label: "روش‌های ارسال", icon: Truck, href: "/admin/shipping-methods" },
    ],
  },
  {
    title: "محتوا",
    items: [
      { label: "بلاگ", icon: FileText, href: "/admin/blog" },
      { label: "اسلایدر", icon: Sliders, href: "/admin/slider" },
    ],
  },
  {
    title: "ارتباطات و درگاه‌ها",
    items: [
      { label: "درگاه‌های پرداخت", icon: CreditCard, href: "/admin/payments" },
      { label: "ارتباطات", icon: MessageSquare, href: "/admin/communications" },
      { label: "ربات تلگرام", icon: Bot, href: "/admin/telegram-bot" },
      { label: "مدیریت اینستاگرام", icon: Camera, href: "/admin/instagram" },
      { label: "پیام‌های تماس", icon: Inbox, href: "/admin/contact-messages" },
    ],
  },
  {
    title: "هوشمند",
    items: [
      { label: "هوش مصنوعی و سئو", icon: Sparkles, href: "/admin/ai" },
    ],
  },
  {
    title: "مدیریت سیستم",
    items: [
      { label: "کاربران", icon: Users, href: "/admin/users" },
      { label: "بکاپ و بازیابی", icon: Database, href: "/admin/backup" },
      { label: "مدیریت سرور", icon: Server, href: "/admin/server" },
      { label: "تنظیمات سایت", icon: Settings, href: "/admin/settings" },
    ],
  },
];

type Props = { adminName: string; adminEmail: string };

export function AdminSidebar({ adminName, adminEmail }: Props) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef({ y: 0, scrollTop: 0 });
  const [unreadCount, setUnreadCount] = useState(0);
  // وضعیت باز/بسته بودن هر گروه (به‌صورت پیش‌فرض همه باز)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(MENU_GROUPS.map((g) => [g.title, true])),
  );

  const toggleGroup = (title: string) =>
    setOpenGroups((prev) => ({ ...prev, [title]: !prev[title] }));

  // بازیابی وضعیت گروه‌ها از localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("admin_sidebar_groups");
      if (saved) setOpenGroups((prev) => ({ ...prev, ...JSON.parse(saved) }));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try { localStorage.setItem("admin_sidebar_groups", JSON.stringify(openGroups)); }
    catch { /* ignore */ }
  }, [openGroups]);


  // دریافت تعداد پیام‌های نخوانده
  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await fetch("/api/admin/contact-messages/unread-count");
        const data = await res.json();
        setUnreadCount(data.count || 0);
      } catch {}
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  // بارگذاری وضعیت از localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("admin_sidebar_collapsed");
      if (saved === "true") setCollapsed(true);
    } catch { /* ignore */ }
  }, []);

  // ذخیره وضعیت
  useEffect(() => {
    try { localStorage.setItem("admin_sidebar_collapsed", String(collapsed)); }
    catch { /* ignore */ }
    document.documentElement.style.setProperty("--sidebar-width", collapsed ? "72px" : "260px");
  }, [collapsed]);

  // بستن Drawer موبایل با کلیک بیرون
  useEffect(() => {
    if (!mobileOpen) return;
    const handle = () => setMobileOpen(false);
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, [mobileOpen]);

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  // اسکرول با غلطک موس - جلوگیری از اسکرول پس‌زمینه
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const handleWheel = (e: WheelEvent) => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const atTop = scrollTop === 0;
      const atBottom = scrollTop + clientHeight >= scrollHeight;
      if ((atTop && e.deltaY < 0) || (atBottom && e.deltaY > 0)) return; // اجازه اسکرول به مرورگر در لبه‌ها
      e.preventDefault();
      e.stopPropagation();
      container.scrollTop += e.deltaY;
    };
    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, []);

  // تنظیم ارتفاع داینامیک
  useEffect(() => {
    const setHeights = () => {
      const header = document.querySelector("header");
      const footer = document.querySelector("footer");
      if (header) document.documentElement.style.setProperty("--header-height", `${header.offsetHeight}px`);
      if (footer) document.documentElement.style.setProperty("--footer-height", `${footer.offsetHeight}px`);
    };
    setHeights();
    window.addEventListener("resize", setHeights);
    return () => window.removeEventListener("resize", setHeights);
  }, []);
  const onMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setDragging(true);
    dragStart.current = { y: e.clientY, scrollTop: scrollRef.current.scrollTop };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !scrollRef.current) return;
    scrollRef.current.scrollTop = dragStart.current.scrollTop - (e.clientY - dragStart.current.y);
  };
  const onMouseUp = () => setDragging(false);

  const sidebarContent = (
      <aside
        style={{
          top: "var(--header-height, 80px)",
          height: "calc(100vh - var(--header-height, 80px) - var(--footer-height, 100px))",
          width: collapsed ? "72px" : "260px",
        }}
        className={cn(
          "glass fixed right-0 z-40 flex flex-col overflow-hidden text-white",
          "rounded-l-2xl shadow-2xl",
          "transition-all duration-300 ease-in-out",
        )}
      >
      {/* Header - ثابت */}
      <div className="flex-shrink-0 border-b border-white/10 p-3">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div>
              <h2 className="text-sm font-bold">درنیکا ساحل</h2>
              <p className="text-[10px] text-white/40">پنل مدیریت</p>
            </div>
          )}
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "flex size-8 items-center justify-center rounded-xl transition-colors hover:bg-white/10",
              collapsed && "mx-auto",
            )}
          >
          <ChevronLeft
            className={cn(
              "size-4 text-white/50 transition-transform duration-300",
              collapsed && "rotate-180",
            )}
            strokeWidth={1.6}
          />
          </button>
        </div>
      </div>

      {/* Middle - اسکرول‌پذیر با درگ */}
      <nav
        ref={scrollRef}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        className={cn(
          "flex-1 overflow-y-auto px-3 py-4 sidebar-scroll",
          dragging && "cursor-grabbing select-none",
          !dragging && "cursor-grab",
        )}
      >
        {MENU_GROUPS.map((group, gi) => {
          const isOpen = collapsed ? true : openGroups[group.title] !== false;
          const hasActive = group.items.some((it) => isActive(it.href));
          return (
          <div key={group.title} className={cn(gi > 0 && "mt-4 border-t border-white/10 pt-4")}>
            {/* هدر گروه — دکمه کشویی */}
            {!collapsed && (
              <button
                type="button"
                onClick={() => toggleGroup(group.title)}
                className="mb-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-bold text-slate-300/90 transition-colors hover:bg-white/5"
              >
                <span className="flex items-center gap-2">
                  {group.title}
                  {hasActive && !isOpen && <span className="size-1.5 rounded-full bg-petrol-400" />}
                </span>
                <ChevronDown
                  className={cn("size-3.5 text-slate-400 transition-transform duration-300", !isOpen && "-rotate-90")}
                  strokeWidth={2}
                />
              </button>
            )}

            <div className={cn("space-y-1 overflow-hidden transition-all duration-300", !isOpen && "hidden")}>
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                      active
                        ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/25"
                        : "text-slate-300 hover:bg-white/5 hover:text-white",
                      collapsed && "justify-center px-0",
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon
                      className={cn("size-5 shrink-0", active ? "text-white" : "text-slate-400 group-hover:text-white")}
                      strokeWidth={1.5}
                    />
                      {!collapsed && (
                        <>
                          <span className="flex-1 truncate">{item.label}</span>
                          {item.label === "پیام‌های تماس" && unreadCount > 0 && (
                            <span className="flex size-5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">{unreadCount > 99 ? "99+" : unreadCount}</span>
                          )}
                          {active && <span className="size-1.5 rounded-full bg-white/80" />}
                        </>
                      )}
                  </Link>
                );
              })}
            </div>
          </div>
          );
        })}
      </nav>

      {/* Footer - ثابت */}
      <div className="flex-shrink-0 border-t border-white/10 p-3">
        {collapsed ? (
          <div className="flex justify-center">
            <div className="flex size-8 items-center justify-center rounded-full bg-petrol-600 text-xs font-bold text-white">
              {adminName.charAt(0)}
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 rounded-xl bg-white/5 p-2">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-petrol-600 text-xs font-bold text-white">
                {adminName.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-white">{adminName}</p>
                <p className="truncate text-[10px] text-white/40" dir="ltr">{adminEmail}</p>
              </div>
            </div>
            <Link
              href="/"
              className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-1.5 text-[11px] font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              <ExternalLink className="size-3.5" strokeWidth={1.5} />
              مشاهده سایت
            </Link>
            <LogoutButton compact />
          </div>
        )}
      </div>
    </aside>
  );

  return (
    <>
      {/* Sidebar دسکتاپ */}
      <div
        className={cn("fixed right-0 z-40 hidden md:block")}
        style={{
          top: "var(--header-height, 80px)",
          height: "calc(100vh - var(--header-height, 80px) - var(--footer-height, 100px))",
          width: collapsed ? "72px" : "260px",
        }}
      >
        {sidebarContent}
      </div>

      {/* دکمه همبرگر موبایل */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed right-4 top-4 z-[70] flex size-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-lg md:hidden"
      >
        <Menu className="size-5" strokeWidth={1.5} />
      </button>

      {/* Drawer موبایل */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[80] md:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute right-0 top-0 h-full w-[260px]">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
