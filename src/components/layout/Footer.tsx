import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Instagram, Telegram, LinkedIn, Phone } from "@/components/ui/SocialIcons";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export function Footer({ t }: { t: Dictionary }) {
  const year = new Date().getFullYear();
  const cols: { title: string; links: { label: string; href: string }[] }[] = [
    {
      title: t.footer.explore,
      links: [
        { label: t.nav.shop, href: "/shop" },
        { label: t.nav.categories, href: "/shop" },
        { label: t.nav.finder, href: "/finder" },
        { label: t.nav.blog, href: "/blog" },
      ],
    },
    {
      title: t.footer.support,
      links: [
        { label: t.nav.quote, href: "/quote" },
        { label: t.nav.contractors, href: "/contractors" },
        { label: t.nav.contact, href: "/contact" },
      ],
    },
  ];

  const socials = [
    { label: "Instagram", href: "#", icon: Instagram },
    { label: "Telegram", href: "#", icon: Telegram },
    { label: "LinkedIn", href: "#", icon: LinkedIn },
    { label: "Phone", href: "#", icon: Phone },
  ];

  return (
    <footer className="relative z-10 mt-12 overflow-hidden rounded-t-[2rem] border-t border-pearl-100/10 bg-navy-950 text-pearl-100 shadow-[0_-30px_80px_-50px_rgba(8,25,43,0.6)] sm:mt-24 sm:rounded-t-[2.5rem]">
      <div className="grid-dots pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(circle_at_top,black,transparent_70%)]" />

      {/* ——— ردیف بالا: لوگو | اینماد (موبایل روبروی هم) ——— */}
      <div className="relative mx-auto flex max-w-7xl flex-col gap-6 px-4 pt-8 pb-6 sm:px-6 sm:pt-14 sm:pb-8">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-xs font-semibold leading-6 text-pearl-200/90 sm:text-sm sm:leading-7">
              {t.brand.tagline}
            </p>
          </div>

          {/* نماد اعتماد الکترونیکی — موبایل روبروی لوگو */}
          <a
            href="#"
            aria-label={t.footer.enamad}
            className="glass flex items-center gap-2 rounded-xl p-2 transition-all hover:-translate-y-0.5 sm:rounded-2xl sm:p-3"
          >
            <span className="flex size-9 items-center justify-center rounded-lg bg-petrol-600/20 text-petrol-200 sm:size-14 sm:rounded-xl">
              <ShieldCheck className="size-4 sm:size-8" strokeWidth={1.4} />
            </span>
            <span className="flex flex-col">
              <span className="text-[10px] font-bold text-pearl-50 sm:text-sm">eNamad</span>
              <span className="hidden text-[11px] leading-5 text-pearl-200/55 sm:block">
                {t.footer.enamadNote}
              </span>
            </span>
          </a>
        </div>

        {/* شبکه‌های اجتماعی */}
        <div>
          <h5 className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-petrol-300/70 sm:text-xs">
            {t.footer.social}
          </h5>
          <div className="flex items-center gap-2">
            {socials.map((s) => {
              const Icon = s.icon;
              return (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  className="glass flex size-8 items-center justify-center rounded-full text-pearl-200 transition-all hover:-translate-y-0.5 hover:text-petrol-300"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Icon className="size-[14px]" strokeWidth={1.6} />
                </a>
              );
            })}
          </div>
        </div>

      </div>

      {/* ——— ردیف میانی: لینک‌ها ——— */}
      <div className="relative mx-auto grid max-w-7xl grid-cols-2 gap-x-6 gap-y-6 px-4 pb-8 sm:grid-cols-2 sm:gap-10 sm:px-6 sm:pb-12">
        {cols.map((col) => (
          <div key={col.title}>
            <h4 className="text-[10px] font-semibold uppercase tracking-widest text-petrol-300/70 sm:text-xs">
              {col.title}
            </h4>
            <ul className="mt-2 space-y-1.5 sm:mt-4 sm:space-y-3">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="text-[11px] text-pearl-200/60 transition-colors hover:text-petrol-300 sm:text-sm"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* ——— ردیف پایین ——— */}
      <div className="relative border-t border-pearl-100/5">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-1.5 px-4 py-4 text-[9px] text-pearl-200/40 sm:flex-row sm:gap-3 sm:px-6 sm:py-6 sm:text-xs">
          <span>
            © {year} {t.brand.name} — {t.footer.rights}
          </span>
          <span className="tracking-[0.2em] text-[8px] sm:text-xs sm:tracking-widest">DORNIKA SAHEL</span>
        </div>
      </div>
    </footer>
  );
}
