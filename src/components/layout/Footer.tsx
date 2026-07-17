import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { getSocialIcon } from "@/components/ui/SocialIcons";
import { EnamadBadge } from "@/components/layout/EnamadBadge";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export function Footer({
  t,
  enamadCode,
  socialLinks = [],
}: {
  t: Dictionary;
  enamadCode?: string | null;
  socialLinks?: { label: string; url: string; icon: string }[];
}) {

  const year = new Date().getFullYear();
  const cols: { title: string; links: { label: string; href: string }[] }[] = [
    { title: t.footer.explore, links: [
      { label: t.nav.shop, href: "/shop" },
      { label: t.nav.finder, href: "/finder" },
      { label: t.nav.blog, href: "/blog" },
    ]},
    { title: t.footer.support, links: [
      { label: t.nav.quote, href: "/quote" },
      { label: t.nav.contractors, href: "/contractors" },
      { label: t.nav.contact, href: "/contact" },
    ]},
    { title: t.footer.legal || "قوانین", links: [
      { label: t.nav.about || "درباره ما", href: "/about" },
      { label: "حریم خصوصی", href: "/privacy" },
      { label: "قوانین و مقررات", href: "/terms" },
    ]},
  ];

  const socials = socialLinks.filter((item) => item.url && item.url !== "#");

  return (
    <div className="relative z-10 mx-auto mt-12 max-w-[96rem] px-4 pb-6 sm:mt-24 sm:px-6 lg:px-8">
    <footer className="glass relative overflow-hidden rounded-[2rem] text-pearl-100 shadow-[0_-30px_80px_-50px_rgba(8,25,43,0.6)] sm:rounded-[2.5rem]">
      <div className="grid-dots pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(circle_at_top,black,transparent_70%)]" />

      {/* ——— ردیف بالا: لوگو + اینماد ——— */}
      <div className="relative px-5 pt-6 pb-4 sm:px-8 sm:pt-14 sm:pb-8">
        {/* موبایل: اینماد چپ، لوگو راست */}
        <div className="flex flex-row items-start justify-between gap-4 sm:hidden">
          <div className="flex-1">
            <Logo />
            <p className="mt-2 text-[10px] font-semibold leading-5 text-pearl-200/90">{t.brand.tagline}</p>
            <div className="mt-2">
              <div className="flex items-center gap-1.5">
                {socials.map((s) => {
                  const SocialIcon = getSocialIcon(s.icon);
                  return (
                    <a key={s.label} href={s.url} aria-label={s.label}
                      className="glass flex size-7 items-center justify-center rounded-full text-pearl-200 transition-all hover:-translate-y-0.5 hover:text-petrol-300"
                      target="_blank" rel="noopener noreferrer">
                      <SocialIcon className="size-3" strokeWidth={1.6} />
                    </a>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="shrink-0">
            <EnamadOrPlaceholder enamadCode={enamadCode} />
          </div>
        </div>

        {/* دسکتاپ: لوگو راست، اینماد چپ */}
        <div className="hidden sm:flex sm:flex-row sm:items-start sm:justify-between sm:gap-8">
          <div>
            <Logo />
            <p className="mt-3 max-w-md text-sm leading-7 text-pearl-200/90">{t.brand.tagline}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {socials.map((s) => {
                const SocialIcon = getSocialIcon(s.icon);
                return (
                  <a key={s.label} href={s.url} aria-label={s.label}
                    className="glass flex size-9 items-center justify-center rounded-full text-pearl-200 transition-all hover:-translate-y-0.5 hover:text-petrol-300"
                    target="_blank" rel="noopener noreferrer">
                    <SocialIcon className="size-4" strokeWidth={1.6} />
                  </a>
                );
              })}
            </div>
          </div>
          <div className="shrink-0">
            <EnamadOrPlaceholder enamadCode={enamadCode} />
          </div>
        </div>
      </div>

      {/* ——— ردیف میانی: لینک‌ها ——— */}
      <div className="relative px-5 pb-6 sm:px-8 sm:pb-12">
        {/* دسکتاپ: ۳ ستونه */}
        <div className="hidden sm:grid sm:grid-cols-3 sm:gap-10">
          {cols.map((col) => (
            <div key={col.title}>
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-petrol-300/85 sm:text-xs">{col.title}</h4>
              <ul className="mt-4 space-y-3">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-[11px] text-pearl-200/80 transition-colors hover:text-petrol-300 sm:text-sm">{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* موبایل: ۳ ستون کنار هم */}
        <div className="grid grid-cols-3 gap-3 sm:hidden">
          {cols.map((col) => (
            <div key={col.title}>
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-petrol-300/85">{col.title}</h4>
              <ul className="mt-2 space-y-1.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-[11px] text-pearl-200/80 transition-colors hover:text-petrol-300">{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* ——— ردیف پایین ——— */}
      <div className="relative border-t border-pearl-100/5 bg-navy-950/40 sm:bg-transparent">
        <div className="flex flex-col items-center justify-between gap-1.5 px-5 py-4 pb-16 text-[10px] font-medium text-pearl-50/90 sm:flex-row sm:gap-3 sm:px-8 sm:py-6 sm:text-xs sm:text-pearl-200/90">
          <span className="drop-shadow-sm">
            © {year} {t.brand.name} — {t.footer.rights}
          </span>
          <span className="tracking-[0.2em] text-[9px] font-semibold text-petrol-300/90 sm:text-xs sm:tracking-widest sm:text-pearl-200/90">DORNIKA SAHEL</span>
        </div>
      </div>
    </footer>
    </div>
  );
}

// ─── کامپوننت نماد اعتماد — اگر کد ثبت نشده باشد چیزی نمایش نمی‌دهد ───
function EnamadOrPlaceholder({ enamadCode }: { enamadCode?: string | null }) {
  if (enamadCode && enamadCode.trim()) {
    return <EnamadBadge code={enamadCode} />;
  }
  // اگر کد نماد در پنل تنظیم نشده، هیچ چیزی نمایش نده
  return null;
}
