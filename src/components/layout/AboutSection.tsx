import { Sparkles } from "lucide-react";
import { renderFeatureIcon } from "@/components/landing/IconMap";

const DEFAULT_TITLE = "درباره درنیکا ساحل";
const DEFAULT_TEXT =
  "درنیکا ساحل با سال‌ها تجربه در تأمین تجهیزات صنعتی و تأسیساتی، مرجعی مطمئن برای پیمانکاران، مهندسان و صنایع است. ما با تکیه بر تنوع بی‌نظیر محصولات، مشاوره تخصصی و پشتیبانی هوشمند، خرید صنعتی را ساده، سریع و قابل اعتماد کرده‌ایم.";

const DEFAULT_ITEMS: { icon: string; title: string; text: string }[] = [
  { icon: "Boxes", title: "تنوع بی‌نظیر محصولات", text: "هزاران قلم تجهیزات صنعتی و تأسیساتی از برندهای معتبر داخلی و خارجی." },
  { icon: "Sparkles", title: "مشاوره هوش مصنوعی", text: "انتخاب دقیق کالا با کمک دستیار هوشمند و کارشناسان مجرب." },
  { icon: "Headset", title: "پشتیبانی تخصصی", text: "همراهی کامل پیش و پس از خرید برای پروژه‌های صنعتی شما." },
  { icon: "ShieldCheck", title: "ضمانت اصالت کالا", text: "تضمین کیفیت و اصالت تمام محصولات به‌همراه فاکتور رسمی." },
];

export function AboutSection({
  title,
  text,
  items: propItems,
}: {
  title?: string | null;
  text?: string | null;
  items?: { icon: string; title: string; text: string }[] | null;
}) {
  const heading = title?.trim() || DEFAULT_TITLE;
  const body = text?.trim() || DEFAULT_TEXT;
  const items = propItems && propItems.length > 0 ? propItems : DEFAULT_ITEMS;

  return (
    <section
      id="about"
      className="relative z-10 mx-auto mt-12 max-w-[96rem] scroll-mt-32 px-4 sm:mt-32 sm:px-6 lg:px-8"
    >
      <div className="glass relative overflow-hidden rounded-[2rem] px-4 py-6 text-pearl-100 shadow-[0_30px_80px_-50px_rgba(8,25,43,0.6)] sm:rounded-[2.5rem] sm:px-12 sm:py-16">
        <div className="grid-dots pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(circle_at_top,black,transparent_70%)]" />
        <div className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-petrol-500/20 blur-3xl" />

        <div className="relative grid gap-6 lg:grid-cols-2 lg:items-center">
          {/* متن معرفی */}
          <div className="text-center lg:text-right">
            <span className="inline-flex items-center gap-2 rounded-full border border-petrol-400/30 bg-petrol-500/10 px-3 py-1 text-[10px] font-semibold text-petrol-200 sm:text-xs">
              <Sparkles className="size-3" strokeWidth={1.6} />
              درباره ما
            </span>
            <h2 className="mt-3 text-xl font-black leading-tight text-pearl-50 sm:text-4xl">
              {heading}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-xs leading-6 text-pearl-200/80 sm:text-base lg:mx-0">
              {body}
            </p>
          </div>

          {/* ویژگی‌ها */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-2">
            {items.map((item) => {
              const iconKey = item.icon;
              return (
                <div
                  key={item.title}
                  className="glass group rounded-xl p-3 transition-all hover:-translate-y-1 hover:shadow-[0_20px_50px_-30px_rgba(45,212,191,0.5)]"
                >
                  <span className="flex size-8 items-center justify-center rounded-lg bg-petrol-500/15 text-petrol-200 transition-colors group-hover:bg-petrol-500/25">
                    {renderFeatureIcon(iconKey, "size-4")}
                  </span>
                  <h3 className="mt-2 text-[11px] font-bold text-pearl-50 sm:text-base">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-[9px] leading-4 text-pearl-200/70 sm:text-[13px]">
                    {item.text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
