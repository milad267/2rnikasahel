"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, LayoutGrid, ShoppingCart, Heart, User, X, ArrowLeft, Trash2, Loader2, ShoppingBag, LogIn, UserPlus, Package, Plus, Minus } from "lucide-react";
import { cn, formatRial } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";

type Props = {
  cartCount?: number;
  wishlistCount?: number;
  isLoggedIn?: boolean;
  labels?: { home: string; shop: string; cart: string; wishlist: string; account: string };
};

type CartItemView = {
  id: number; quantity: number; priceSnapshot: string;
  productTitleSnapshot: string; variantTitleSnapshot: string;
  variantId: number; productSlug: string;
  coverImage?: string | null;
};

type WishlistView = {
  productId: number; slug: string; title: string;
  categoryTitle: string | null; minPrice: string; variantCount: number;
};

export function MobileBottomNav({ cartCount = 0, wishlistCount = 0, isLoggedIn = false, labels }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  const [cartOpen, setCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState<CartItemView[]>([]);
  const [cartLoading, setCartLoading] = useState(false);

  const [wishlistOpen, setWishlistOpen] = useState(false);
  const [wishlistItems, setWishlistItems] = useState<WishlistView[]>([]);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  const [accountOpen, setAccountOpen] = useState(false);

  const hide = pathname.startsWith("/admin") || pathname === "/";

  const l = labels ?? { home: "خانه", shop: "فروشگاه", cart: "سبد", wishlist: "علاقه‌مندی", account: "حساب" };

  // ─── Cart ───
  async function openCart() {
    setCartOpen(true); setCartLoading(true);
    try {
      const res = await fetch("/api/cart/items?popup=true");
      if (res.ok) setCartItems(await res.json());
    } finally { setCartLoading(false); }
  }
  async function removeItem(variantId: number) {
    await fetch("/api/cart/items", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ variantId }) });
    const res = await fetch("/api/cart/items?popup=true");
    if (res.ok) setCartItems(await res.json());
    router.refresh();
  }
  async function updateQty(variantId: number, qty: number) {
    if (qty < 1) return removeItem(variantId);
    await fetch("/api/cart/items", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ variantId, quantity: qty }) });
    const res = await fetch("/api/cart/items?popup=true");
    if (res.ok) setCartItems(await res.json());
  }
  const subtotal = cartItems.reduce((s, i) => s + Number(i.priceSnapshot) * i.quantity, 0);

  // ─── Wishlist ───
  async function openWishlist() {
    setWishlistOpen(true); setWishlistLoading(true);
    try {
      const res = await fetch("/api/wishlist?popup=true");
      if (res.ok) setWishlistItems(await res.json());
    } finally { setWishlistLoading(false); }
  }

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  // ─── Shared drawer styles ───
  const Drawer = ({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) => (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end lg:hidden">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="absolute inset-0 bg-navy-950/55 backdrop-blur-md" />
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
            className="relative w-full max-h-[80vh] rounded-t-[2rem] bg-white shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-navy-900/10 shrink-0">
              <span className="text-sm font-bold text-navy-900">{title}</span>
              <button onClick={onClose} className="flex size-8 items-center justify-center rounded-full bg-navy-900/5 text-charcoal-500">
                <X className="size-4" strokeWidth={2} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <AnimatePresence>
        {!hide && (
          <motion.nav
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", damping: 24, stiffness: 260 }}
            className="fixed inset-x-0 bottom-0 z-40 lg:hidden"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
            aria-label="ناوبری موبایل"
          >
        <div className="glass mx-3 mb-3 flex items-center justify-around rounded-2xl border border-white/10 px-1 py-1.5 shadow-2xl">
          <Link href="/" className={cn("relative flex min-h-12 min-w-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 transition-colors", isActive("/") && pathname === "/" ? "text-petrol-300" : "text-white/60 hover:text-white")}>
            <Home className="size-[22px]" strokeWidth={isActive("/") && pathname === "/" ? 2.2 : 1.7} />
            <span className="text-[9px] font-medium">{l.home}</span>
            {isActive("/") && pathname === "/" && <span className="absolute bottom-0.5 h-0.5 w-6 rounded-full bg-petrol-400" />}
          </Link>
          <Link href="/shop" className={cn("relative flex min-h-12 min-w-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 transition-colors", isActive("/shop") ? "text-petrol-300" : "text-white/60 hover:text-white")}>
            <LayoutGrid className="size-[22px]" strokeWidth={isActive("/shop") ? 2.2 : 1.7} />
            <span className="text-[9px] font-medium">{l.shop}</span>
            {isActive("/shop") && <span className="absolute bottom-0.5 h-0.5 w-6 rounded-full bg-petrol-400" />}
          </Link>
          <button type="button" onClick={openCart} className="relative flex min-h-12 min-w-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 transition-colors text-white/60 hover:text-white">
            <span className="relative">
              <ShoppingCart className="size-[22px]" strokeWidth={1.7} />
              {cartCount > 0 && <span className="absolute -right-2 -top-1.5 flex size-4 items-center justify-center rounded-full bg-petrol-500 text-[9px] font-bold text-white">{cartCount > 9 ? "9+" : cartCount}</span>}
            </span>
            <span className="text-[9px] font-medium">{l.cart}</span>
          </button>
          <button type="button" onClick={openWishlist} className="relative flex min-h-12 min-w-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 transition-colors text-white/60 hover:text-white">
            <span className="relative">
              <Heart className="size-[22px]" strokeWidth={1.7} />
              {wishlistCount > 0 && <span className="absolute -right-2 -top-1.5 flex size-4 items-center justify-center rounded-full bg-petrol-500 text-[9px] font-bold text-white">{wishlistCount > 9 ? "9+" : wishlistCount}</span>}
            </span>
            <span className="text-[9px] font-medium">{l.wishlist}</span>
          </button>
          <button type="button" onClick={() => setAccountOpen(true)} className="relative flex min-h-12 min-w-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 transition-colors text-white/60 hover:text-white">
            <User className="size-[22px]" strokeWidth={1.7} />
            <span className="text-[9px] font-medium">{l.account}</span>
          </button>
        </div>
      </motion.nav>
      )}
    </AnimatePresence>

      {/* ─── Cart Drawer ─── */}
      <Drawer open={cartOpen} onClose={() => setCartOpen(false)} title="🛒 سبد خرید">
        {cartLoading && <Loader2 className="mx-auto size-6 animate-spin text-petrol-600" />}
        {!cartLoading && cartItems.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <ShoppingBag className="size-10 text-charcoal-400" strokeWidth={1.4} />
            <p className="text-sm text-charcoal-500">سبد خرید شما خالی است.</p>
          </div>
        )}
        {!cartLoading && cartItems.map((item) => (
          <div key={item.id} className="flex items-center gap-3 rounded-2xl bg-navy-900/[0.03] p-3 mb-2">
            <div className="size-14 shrink-0 rounded-xl overflow-hidden bg-slate-100">
              {item.coverImage ? <img src={item.coverImage} alt={item.productTitleSnapshot} className="size-full object-cover" /> : <div className="flex size-full items-center justify-center text-slate-300 text-xs">📦</div>}
            </div>
            <div className="min-w-0 flex-1">
              <Link href={`/shop/${item.productSlug}`} onClick={() => setCartOpen(false)} className="line-clamp-1 text-xs font-bold text-navy-900 hover:text-petrol-600">{item.productTitleSnapshot}</Link>
              <p className="mt-0.5 text-[11px] text-charcoal-500">{item.variantTitleSnapshot}</p>
              <p className="mt-1 text-xs font-semibold text-navy-900">{formatRial(Number(item.priceSnapshot) * item.quantity)}</p>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg bg-navy-900/5 px-2 py-1">
              <button type="button" onClick={() => updateQty(item.variantId, item.quantity - 1)} disabled={item.quantity <= 1}
                className="text-navy-500 hover:text-navy-900 disabled:opacity-30">
                <Minus className="size-3.5" strokeWidth={2} />
              </button>
              <span className="min-w-[2ch] text-center text-xs font-bold text-navy-900">{item.quantity}</span>
              <button type="button" onClick={() => updateQty(item.variantId, item.quantity + 1)}
                className="text-navy-500 hover:text-navy-900">
                <Plus className="size-3.5" strokeWidth={2} />
              </button>
            </div>
            <button type="button" onClick={() => removeItem(item.variantId)} className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-500 hover:bg-red-100">
              <Trash2 className="size-4" strokeWidth={1.8} />
            </button>
          </div>
        ))}
        {!cartLoading && cartItems.length > 0 && (
          <div className="border-t border-navy-900/10 pt-4 mt-2 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-xs text-charcoal-500">جمع کل</span>
              <span className="text-sm font-black text-navy-900">{formatRial(subtotal)}</span>
            </div>
            <div className="flex gap-2">
              <Link href="/cart" onClick={() => setCartOpen(false)} className="flex-1 rounded-full border border-navy-900/10 py-2.5 text-xs font-semibold text-navy-900 text-center">مشاهده کامل</Link>
              <Link href="/checkout" onClick={() => setCartOpen(false)} className="flex-1 flex items-center justify-center gap-1.5 rounded-full bg-petrol-600 py-2.5 text-xs font-semibold text-pearl-50 shadow-md"><ArrowLeft className="size-3.5" strokeWidth={1.8} /> پرداخت</Link>
            </div>
          </div>
        )}
      </Drawer>

      {/* ─── Wishlist Drawer ─── */}
      <Drawer open={wishlistOpen} onClose={() => setWishlistOpen(false)} title="❤️ علاقه‌مندی‌ها">
        {wishlistLoading && <Loader2 className="mx-auto size-6 animate-spin text-petrol-600" />}
        {!wishlistLoading && wishlistItems.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <Heart className="size-10 text-charcoal-400" strokeWidth={1.4} />
            <p className="text-sm text-charcoal-500">لیست علاقه‌مندی‌ها خالی است.</p>
            <Link href="/shop" onClick={() => setWishlistOpen(false)} className="rounded-full bg-petrol-600 px-5 py-2 text-xs font-semibold text-pearl-50">رفتن به فروشگاه</Link>
          </div>
        )}
        {!wishlistLoading && wishlistItems.map((item) => (
          <div key={item.productId} className="flex items-center justify-between rounded-2xl bg-navy-900/[0.03] p-3.5 mb-2">
            <div className="min-w-0 flex-1">
              <Link href={`/shop/${item.slug}`} onClick={() => setWishlistOpen(false)} className="line-clamp-1 text-xs font-bold text-navy-900 hover:text-petrol-600">{item.title}</Link>
              {item.categoryTitle && <p className="mt-0.5 text-[10px] text-charcoal-500">{item.categoryTitle}</p>}
              <p className="mt-1 text-xs font-semibold text-navy-900">{formatRial(item.minPrice)}</p>
            </div>
          </div>
        ))}
      </Drawer>

      {/* ─── Account Drawer ─── */}
      <Drawer open={accountOpen} onClose={() => setAccountOpen(false)} title="👤 حساب کاربری">
        {isLoggedIn ? (
          <div className="space-y-3 py-4">
            <Link href="/profile" onClick={() => setAccountOpen(false)} className="flex items-center gap-3 rounded-2xl bg-navy-900/[0.03] p-4 hover:bg-petrol-50/50 transition-colors">
              <User className="size-5 text-petrol-600" strokeWidth={1.6} />
              <span className="text-xs font-semibold text-navy-900">پروفایل کاربری</span>
            </Link>
            <Link href="/orders" onClick={() => setAccountOpen(false)} className="flex items-center gap-3 rounded-2xl bg-navy-900/[0.03] p-4 hover:bg-petrol-50/50 transition-colors">
              <Package className="size-5 text-petrol-600" strokeWidth={1.6} />
              <span className="text-xs font-semibold text-navy-900">سفارشات من</span>
            </Link>
            <Link href="/profile/settings" onClick={() => setAccountOpen(false)} className="flex items-center gap-3 rounded-2xl bg-navy-900/[0.03] p-4 hover:bg-petrol-50/50 transition-colors">
              <UserPlus className="size-5 text-petrol-600" strokeWidth={1.6} />
              <span className="text-xs font-semibold text-navy-900">تنظیمات حساب</span>
            </Link>
            <form action="/api/auth/logout" method="POST">
              <button type="submit" className="flex w-full items-center gap-3 rounded-2xl bg-red-50 p-4 hover:bg-red-100 transition-colors">
                <LogIn className="size-5 text-red-500" strokeWidth={1.6} />
                <span className="text-xs font-semibold text-red-600">خروج از حساب</span>
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-3 py-4">
            <Link href="/login" onClick={() => setAccountOpen(false)} className="flex items-center justify-center gap-2 rounded-full bg-petrol-600 py-3 text-xs font-semibold text-pearl-50 shadow-md">
              <LogIn className="size-4" strokeWidth={1.6} /> ورود به حساب
            </Link>
            <Link href="/register" onClick={() => setAccountOpen(false)} className="flex items-center justify-center gap-2 rounded-full border border-navy-900/10 py-3 text-xs font-semibold text-navy-900">
              <UserPlus className="size-4" strokeWidth={1.6} /> ثبت‌نام
            </Link>
          </div>
        )}
      </Drawer>
    </>
  );
}
