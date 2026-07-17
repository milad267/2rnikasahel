import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { getI18n } from "@/lib/i18n/server";
import { localeDirection } from "@/lib/i18n/config";
import { AuroraBackground } from "@/components/landing/AuroraBackground";
import { SmoothScroll } from "@/components/landing/SmoothScroll";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HideOnAdmin } from "@/components/layout/HideOnAdmin";
import { UserAssistant } from "@/components/popups/UserAssistant";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { getCommerceCounts, readSessionToken } from "@/lib/commerce";
import { getCurrentUser } from "@/lib/auth";
import { getSetting, preloadSettings } from "@/lib/settings";
import { ThemeApplier } from "@/components/admin/ThemeApplier";
import { SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE } from "@/lib/seo";

const DEFAULT_TITLE = "درنیکا ساحل | مرجع تخصصی تجهیزات صنعتی و تأسیسات";
const DEFAULT_DESCRIPTION =
  "درنیکا ساحل؛ پلتفرم لوکس صنعتی برای خرید تجهیزات صنعتی و تأسیساتی با تنوع بی‌نظیر و مشاوره هوش مصنوعی.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: DEFAULT_TITLE,
    template: "%s | درنیکا ساحل",
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "تجهیزات صنعتی",
    "تأسیسات",
    "شیرآلات صنعتی",
    "لوله و اتصالات",
    "درنیکا ساحل",
    "فروشگاه صنعتی",
  ],
  authors: [{ name: SITE_NAME }],
  icons: {
    icon: "/logo/favicon.svg",
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "fa_IR",
    url: SITE_URL,
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

export const viewport: Viewport = {
  themeColor: "#f7f2ea",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const { locale, t } = await getI18n();
  const dir = localeDirection[locale];
  const sessionToken = await readSessionToken();
  const [counts, user, enamadCode, rawSocials] = await Promise.all([
    getCommerceCounts(sessionToken),
    getCurrentUser(),
    getSetting<string>("footer.enamad_code", "general"),
    getSetting<string>("site.socials", "general"),
    preloadSettings(),
  ]);

  let socialLinks: { label: string; url: string; icon: string }[] = [];
  try { const parsed = JSON.parse(rawSocials || "[]"); if (Array.isArray(parsed)) socialLinks = parsed; } catch {}


  return (
    <html lang={locale} dir={dir} suppressHydrationWarning data-scroll-behavior="smooth">
      <body className="min-h-screen antialiased bg-white text-navy-900 select-none">
        <ThemeApplier>
          <SmoothScroll />
          <AuroraBackground />
          <Navbar
          locale={locale}
          t={t}
          cartCount={counts.cartCount}
          wishlistCount={counts.wishlistCount}
          user={user}
        />
        <main className="relative pb-20 lg:pb-0">{children}</main>

        <HideOnAdmin>
          <Footer t={t} enamadCode={enamadCode} socialLinks={socialLinks} />
          <UserAssistant />
        </HideOnAdmin>

        <MobileBottomNav
          cartCount={counts.cartCount}
          wishlistCount={counts.wishlistCount}
          isLoggedIn={!!user}
          labels={{
            home: t.nav.home,
            shop: t.nav.shop,
            cart: t.nav.cart,
            wishlist: t.nav.wishlist,
            account: "حساب",
          }}
        />
        </ThemeApplier>
      </body>
    </html>
  );
}