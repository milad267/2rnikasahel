"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, X, Search, ShoppingBag, Heart, User, Layers, Home, LayoutGrid, FileText, Building2, Phone } from "lucide-react";

import { motion, AnimatePresence } from "motion/react";
import { Logo } from "@/components/brand/Logo";
import { CartPopup } from "@/components/popups/CartPopup";
import { WishlistPopup } from "@/components/popups/WishlistPopup";
import { AuthPopup } from "@/components/popups/AuthPopup";
import { ContactPopup } from "@/components/popups/ContactPopup";
import { AboutPopup } from "@/components/popups/AboutPopup";
import { SearchPopup } from "@/components/popups/SearchPopup";
import { MegaMenu } from "@/components/layout/MegaMenu";
import { UserDropdown } from "@/components/layout/UserDropdown";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { cn } from "@/lib/utils";

type PopupName = "cart" | "wishlist" | "auth" | "contact" | "about" | "search" | null;

type NavbarUser = {
  id: number;
  name: string;
  phone: string;
  role: string;
} | null;

export function Navbar({
  locale,
  t,
  cartCount = 0,
  wishlistCount = 0,
  user = null,
}: {
  locale: Locale;
  t: Dictionary;
  cartCount?: number;
  wishlistCount?: number;
  user?: NavbarUser;
}) {
  const [open, setOpen] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [popup, setPopup] = useState<PopupName>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchResults, setSearchResults] = useState<{ id: number; slug: string; title: string; categoryTitle: string | null }[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activePath = usePathname() ?? "/";
  const isLandingPage = activePath === "/";
  const canAccessAdmin = user?.role === "superadmin" || user?.role === "admin";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);


  useEffect(() => {
    const hidden = open || !!popup;
    document.body.style.overflow = hidden ? "hidden" : "";
    document.documentElement.style.overflow = hidden ? "hidden" : "";
    document.body.style.overscrollBehavior = hidden ? "none" : "";
    document.documentElement.style.overscrollBehavior = hidden ? "none" : "";
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
      document.body.style.overscrollBehavior = "";
      document.documentElement.style.overscrollBehavior = "";
    };
  }, [open, popup]);

  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    if (searchTimer.current) clearTimeout(searchTimer.current);
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery.trim())}`);
        if (res.ok) setSearchResults((await res.json()) || []);
      } finally {
        setSearching(false);
      }
    }, 220);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [searchQuery]);

  type NavLink = { href: string; label: string; popup?: string; scroll?: boolean };
  const links: NavLink[] = [
    { href: "/", label: t.nav.home },
    { href: "/shop", label: t.nav.shop },
    { href: "/blog", label: t.nav.blog },
    { href: "#about", label: t.nav.about, popup: "about", scroll: true },
    { href: "#contact", label: t.nav.contact, popup: "contact" },
  ];

  const scrollToAbout = (e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.getElementById("about");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      // اگر بخش درباره ما در این صفحه نبود، به خانه برو و اسکرول کن
      window.location.href = "/#about";
    }
  };



  const isActive = (href: string) => {
    if (href === "/") return activePath === "/";
    return activePath.startsWith(href);
  };

  const navLinkClass = (href: string) =>
    cn(
      "group relative rounded-full px-3.5 py-2 text-sm font-medium transition-all duration-300",
      isActive(href)
        ? "bg-petrol-600/25 text-pearl-50"
        : "text-pearl-200/75 hover:bg-pearl-100/8 hover:text-pearl-50",
    );

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-all duration-500",
          scrolled ? "py-1.5" : "py-4",
        )}
      >
        <div className="mx-auto max-w-[96rem] px-1 sm:px-1 lg:px-3">
          <div
            className={cn(
              "glass rounded-[1.75rem] px-3 py-2 transition-all duration-500 sm:px-5",
              scrolled
                ? "rounded-2xl bg-charcoal-800/70 shadow-[var(--shadow-luxe)] backdrop-blur-3xl"
                : "shadow-[0_16px_50px_-40px_rgba(8,25,43,0.6)]",
            )}
          >
            {/* ردیف بالا: فقط لوگو بالاتر از بقیه */}
            <div className="flex items-center justify-between gap-3">
              {/* لوگو - در موبایل هنگام جستجو مخفی می‌شود */}
              <Link href="/" className={`shrink-0 min-w-0 ${showMobileSearch ? 'hidden lg:block' : ''}`} aria-label="درنیکا ساحل">
                <Logo className="[&_[class*='flex-col']]:min-w-0" />
              </Link>

              {/* موبایل: حالت جستجو (جایگزین دکمه‌ها در هدر) */}
              {showMobileSearch && (
                <div className="flex items-center gap-2 w-full lg:hidden">
                  <div className="flex-1">
                    <InlineSearch
                      query={searchQuery}
                      setQuery={setSearchQuery}
                      focused={searchFocused}
                      setFocused={setSearchFocused}
                      searching={searching}
                      results={searchResults}
                      mobile
                      onNavigate={() => { setShowMobileSearch(false); setSearchQuery(""); }}
                    />
                  </div>
                  <button type="button" onClick={() => { setShowMobileSearch(false); setSearchQuery(""); }}
                    className="flex size-9 shrink-0 items-center justify-center rounded-full bg-pearl-100/10 text-pearl-100 hover:bg-pearl-100/20">
                    <X className="size-4" strokeWidth={1.7} />
                  </button>
                </div>
              )}

              {/* موبایل: دکمه‌های عادی (مخفی هنگام جستجو) */}
              <div className={`flex items-center gap-1.5 lg:hidden ${showMobileSearch ? 'hidden' : ''}`}>
                <button type="button" onClick={() => setShowMobileSearch(true)} aria-label="جستجو"
                  className="flex size-9 items-center justify-center rounded-full bg-pearl-100/10 text-pearl-100 hover:bg-pearl-100/20">
                  <Search className="size-4" strokeWidth={1.7} />
                </button>
                <button type="button" onClick={() => setPopup("wishlist")} aria-label="علاقه‌مندی‌ها"
                  className="relative flex size-9 items-center justify-center rounded-full bg-petrol-600 text-pearl-50 shadow-md">
                  <Heart className="size-4" strokeWidth={1.7} />
                  {wishlistCount > 0 && <Badge count={wishlistCount} />}
                </button>
                <button type="button" onClick={() => setPopup("cart")} aria-label="سبد خرید"
                  className="relative flex size-9 items-center justify-center rounded-full bg-petrol-600 text-pearl-50 shadow-md">
                  <ShoppingBag className="size-4" strokeWidth={1.7} />
                  {cartCount > 0 && <Badge count={cartCount} />}
                </button>
                {canAccessAdmin && (
                  <Link href="/admin" aria-label="پنل مدیریت"
                    className="flex size-9 items-center justify-center rounded-full bg-petrol-600 text-pearl-50 shadow-md">
                    <Layers className="size-4" strokeWidth={1.7} />
                  </Link>
                )}
                <button type="button" onClick={() => setOpen(true)} aria-label="menu"
                  className="flex size-9 items-center justify-center rounded-full bg-petrol-600 text-pearl-50">
                  <Menu className="size-4" strokeWidth={1.7} />
                </button>
              </div>
            </div>

            {/* ردیف پایین دسکتاپ: مگا منو زیر لوگو و هم‌تراز با باقی دکمه‌ها */}
            <div className="mt-2 hidden items-center justify-between gap-3 lg:flex">
              <div className="flex items-center gap-1.5">
                <MegaMenu t={t} />
                <nav className="flex items-center gap-1">
                  {links.map((l) => (
                    <Link
                      key={l.href}
                      href={l.href}
                      onClick={(e) => {
                        if (l.href === "#about") {
                          if (isLandingPage) {
                            scrollToAbout(e);
                            return;
                          }
                          e.preventDefault();
                          setPopup("about");
                          return;
                        }
                        if ((l as any).popup) {
                          e.preventDefault();
                          setPopup((l as any).popup);
                        }
                      }}
                      className={navLinkClass(l.href)}
                    >
                      <span className="relative z-10">{l.label}</span>

                      <span
                        className={cn(
                          "absolute inset-x-3 bottom-1 h-0.5 origin-left rounded-full bg-petrol-300 transition-transform duration-300",
                          isActive(l.href) ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100",
                        )}
                      />
                    </Link>
                  ))}
                </nav>
              </div>

              <div className="flex items-center gap-2">
                <InlineSearch
                  query={searchQuery}
                  setQuery={setSearchQuery}
                  focused={searchFocused}
                  setFocused={setSearchFocused}
                  searching={searching}
                  results={searchResults}
                />
                {/* <LanguageSwitcher current={locale} /> */}
                <button
                  type="button"
                  aria-label={t.nav.wishlist}
                  onClick={() => setPopup("wishlist")}
                  className="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-petrol-600 text-pearl-50 shadow-[var(--shadow-glow-petrol)] transition-all hover:bg-petrol-500 hover:scale-105"
                >
                  <Heart className="size-[18px]" strokeWidth={1.7} />
                  {wishlistCount > 0 && <Badge count={wishlistCount} />}
                </button>
                <button
                  type="button"
                  aria-label={t.nav.cart}
                  onClick={() => setPopup("cart")}
                  className="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-petrol-600 text-pearl-50 shadow-[var(--shadow-glow-petrol)] transition-all hover:bg-petrol-500 hover:scale-105"
                >
                  <ShoppingBag className="size-[18px]" strokeWidth={1.7} />
                  {cartCount > 0 && <Badge count={cartCount} />}
                </button>
                {user ? (
                  <UserDropdown user={user} />
                ) : (
                  <button
                    type="button"
                    onClick={() => setPopup("auth")}
                    className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-pearl-50 px-4 py-1.5 text-sm font-semibold text-navy-900 transition-all hover:bg-pearl-100"
                  >
                    <User className="size-4 text-petrol-700" strokeWidth={1.8} />
                    ورود / ثبت‌نام
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] lg:hidden">
            <div className="absolute inset-0 bg-navy-950/80 backdrop-blur-xl" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ y: "-100%" }}
              animate={{ y: 0 }}
              exit={{ y: "-100%" }}
              transition={{ type: "spring", stiffness: 260, damping: 30 }}
              className="glass absolute inset-x-3 top-3 max-h-[92vh] overflow-y-auto rounded-[2rem] p-5 shadow-[var(--shadow-luxe)]"
            >
              <div className="flex items-center justify-between">
                <Logo />
                <button type="button" onClick={() => setOpen(false)}
                  className="flex size-8 items-center justify-center rounded-full bg-white/10 text-pearl-100 backdrop-blur-sm border border-white/10 shadow-lg hover:bg-white/20 hover:scale-105 active:scale-95 transition-all duration-200">
                  <X className="size-4" strokeWidth={2} />
                </button>
              </div>

              <div className="mt-5">
                <InlineSearch
                  query={searchQuery}
                  setQuery={setSearchQuery}
                  focused={searchFocused}
                  setFocused={setSearchFocused}
                  searching={searching}
                  results={searchResults}
                  mobile
                  onNavigate={() => setOpen(false)}
                />
              </div>

              <nav className="mt-6 grid grid-cols-5 gap-1.5">
                {links.map((l, i) => {
                  const icons: Record<string, React.ReactNode> = {
                    "/": <Home className="size-5" strokeWidth={1.5} />,
                    "/shop": <LayoutGrid className="size-5" strokeWidth={1.5} />,
                    "/blog": <FileText className="size-5" strokeWidth={1.5} />,
                    "#about": <Building2 className="size-5" strokeWidth={1.5} />,
                    "#contact": <Phone className="size-5" strokeWidth={1.5} />,
                  };
                  return (
                    <motion.div key={l.href} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 + i * 0.05 }}>
                      <Link
                        href={l.href}
                        onClick={(e) => {
                          setOpen(false);
                          if (l.href === "#about") {
                            if (isLandingPage) {
                              setTimeout(() => scrollToAbout(e), 320);
                              return;
                            }
                            e.preventDefault();
                            setPopup("about");
                            return;
                          }
                          if ((l as any).popup) { e.preventDefault(); setPopup((l as any).popup); }
                        }}
                        className={cn(
                          "flex flex-col items-center gap-1 rounded-2xl px-2 py-3 text-center transition-colors",
                          isActive(l.href) ? "bg-petrol-600/25 text-pearl-50" : "bg-pearl-100/[0.04] text-pearl-100/80 hover:bg-petrol-600/20",
                        )}
                      >
                        <span className="flex size-10 items-center justify-center rounded-xl bg-petrol-600/15 text-petrol-200">
                          {icons[l.href] || <Home className="size-5" strokeWidth={1.5} />}
                        </span>
                        <span className="text-[9px] font-medium leading-tight">{l.label}</span>
                      </Link>
                    </motion.div>
                  );
                })}
              </nav>

              <div className="mt-4">
                <p className="mb-2 flex items-center gap-2 px-1 text-[10px] font-semibold uppercase tracking-widest text-petrol-300/70">
                  <Layers className="size-3" />
                  دسته‌بندی‌ها
                </p>
                <MegaMenu t={t} mobile onClose={() => setOpen(false)} />
              </div>

              {user ? (
                <Link href="/profile" onClick={() => setOpen(false)} className="mt-5 flex items-center justify-center gap-2 rounded-2xl bg-pearl-50 px-4 py-3 text-sm font-bold text-navy-900">
                  <User className="size-4 text-petrol-700" strokeWidth={2} />
                  {user.name}
                </Link>
              ) : (
                <button type="button" onClick={() => { setOpen(false); setPopup("auth"); }} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-pearl-50 px-4 py-3 text-sm font-bold text-navy-900">
                  <User className="size-4 text-petrol-700" strokeWidth={2} />
                  ورود / ثبت‌نام
                </button>
              )}
              {canAccessAdmin && (
                <Link href="/admin" onClick={() => setOpen(false)} className="mt-3 flex items-center justify-center gap-2 rounded-2xl border border-petrol-300/30 bg-petrol-600/15 px-4 py-3 text-sm font-bold text-petrol-100">
                  <Layers className="size-4" strokeWidth={2} />
                  ورود به پنل مدیریت
                </Link>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <CartPopup open={popup === "cart"} onClose={() => setPopup(null)} />
      <WishlistPopup open={popup === "wishlist"} onClose={() => setPopup(null)} />
      <AuthPopup open={popup === "auth"} onClose={() => setPopup(null)} />
      <SearchPopup open={popup === "search"} onClose={() => setPopup(null)} />
      <ContactPopup open={popup === "contact"} onClose={() => setPopup(null)} />
      <AboutPopup open={popup === "about"} onClose={() => setPopup(null)} />
    </>
  );
}

function Badge({ count }: { count: number }) {
  return (
    <span className="absolute -end-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-pearl-50 text-[9px] font-black text-petrol-700 shadow-md">
      {count}
    </span>
  );
}

function InlineSearch({
  query,
  setQuery,
  focused,
  setFocused,
  searching,
  results,
  mobile = false,
  onNavigate,
}: {
  query: string;
  setQuery: (value: string) => void;
  focused: boolean;
  setFocused: (value: boolean) => void;
  searching: boolean;
  results: { id: number; slug: string; title: string; categoryTitle: string | null }[];
  mobile?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <div className={cn("relative w-full", mobile ? "block" : "hidden md:block")} onBlur={() => setTimeout(() => setFocused(false), 150)}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (query.trim()) {
            window.location.href = `/shop?q=${encodeURIComponent(query.trim())}`;
            setFocused(false);
            onNavigate?.();
          }
        }}
      >
        <div
          className={cn(
            "flex h-10 items-center gap-2 rounded-full border px-3 transition-all duration-300",
            mobile
              ? "w-full border-pearl-100/15 bg-pearl-100/8 px-3 py-2"
              : focused
              ? "w-72 border-petrol-400/60 bg-pearl-100/15"
              : "w-44 border-pearl-100/15 bg-pearl-100/8 focus-within:w-72 focus-within:border-petrol-400/60",
          )}
        >
          <Search className="size-4 text-pearl-200/70" strokeWidth={1.6} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            placeholder="جستجو در محصولات…"
            className="w-full bg-transparent text-xs text-pearl-100 placeholder-pearl-200/40 outline-none"
          />
        </div>
      </form>
      <AnimatePresence>
        {focused && (results.length > 0 || searching || query.trim().length >= 2) && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className={cn("card absolute z-50 overflow-hidden rounded-2xl border border-pearl-100/10 p-2 shadow-2xl backdrop-blur-2xl", mobile ? "inset-x-0 top-12 max-h-[60vh] overflow-y-auto" : "end-0 top-12 w-80")}
          >
            {searching && results.length === 0 && <p className="px-3 py-3 text-[11px] text-charcoal-500">در حال جستجو...</p>}
            {results.map((r) => (
              <Link
                key={r.id}
                href={`/shop/${r.slug}`}
                onClick={() => {
                  setFocused(false);
                  setQuery("");
                  onNavigate?.();
                }}
                className="flex items-center justify-between rounded-xl px-3 py-2.5 text-xs hover:bg-petrol-600/10"
              >
                <span className="line-clamp-1 font-medium text-navy-900">{r.title}</span>
                <span className="ms-2 text-[10px] text-charcoal-500">{r.categoryTitle}</span>
              </Link>
            ))}
            {!searching && results.length === 0 && query.trim().length >= 2 && <p className="px-3 py-3 text-[11px] text-charcoal-500">نتیجه‌ای یافت نشد.</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
