import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { getI18n } from "@/lib/i18n/server";
import { localeDirection } from "@/lib/i18n/config";
import { AuroraBackground } from "@/components/landing/AuroraBackground";
import { SmoothScroll } from "@/components/landing/SmoothScroll";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { getCommerceCounts, readSessionToken } from "@/lib/commerce";
import { getCurrentUser } from "@/lib/auth";
import { getSetting } from "@/lib/settings";

export const metadata: Metadata = {
  title: {
    default: "درنیکا ساحل | مرجع تخصصی تجهیزات صنعتی و تأسیسات",
    template: "%s | درنیکا ساحل",
  },
  description:
    "درنیکا ساحل؛ پلتفرم لوکس صنعتی برای خرید تجهیزات صنعتی و تأسیساتی با تنوع بی‌نظیر و مشاوره هوش مصنوعی.",
  icons: {
    icon: "/logo/favicon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#05101d",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const { locale, t } = await getI18n();
  const dir = localeDirection[locale];
  const sessionToken = await readSessionToken();
  const [counts, user, enamadCode] = await Promise.all([getCommerceCounts(sessionToken), getCurrentUser(), getSetting<string>("footer.enamad_code", "general")]);

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <SmoothScroll />
        <AuroraBackground />
        <Navbar
          locale={locale}
          t={t}
          cartCount={counts.cartCount}
          wishlistCount={counts.wishlistCount}
          user={user}
        />
        <main className="relative">{children}</main>

        <Footer t={t} enamadCode={enamadCode} />
      </body>
    </html>
  );
}