import { ShieldCheck, BadgeCheck, Truck, Headset } from "lucide-react";
import { Reveal } from "@/components/landing/Reveal";

const items = [
  {
    icon: BadgeCheck,
    title: "اصالت کالا تضمینی",
    desc: "تأمین مستقیم از نمایندگی‌های رسمی",
  },
  {
    icon: Truck,
    title: "ارسال سراسری",
    desc: "تحویل سریع به تمام نقاط ایران",
  },
  {
    icon: Headset,
    title: "مشاوره تخصصی",
    desc: "پشتیبانی مهندسان مجرب تأسیسات",
  },
  {
    icon: ShieldCheck,
    title: "پرداخت امن",
    desc: "درگاه‌های معتبر و نماد اعتماد",
  },
];

export function TrustBox() {
  return (
    <Reveal>
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="card grid grid-cols-2 gap-px overflow-hidden rounded-[2rem] md:grid-cols-4">
          {items.map((it) => {
            const Icon = it.icon;
            return (
              <div
                key={it.title}
                className="group flex flex-col items-center gap-2 bg-navy-900/[0.02] px-4 py-7 text-center transition-colors hover:bg-petrol-600/[0.04] sm:px-6 sm:py-8"
              >
                <span className="flex size-12 items-center justify-center rounded-2xl bg-petrol-600/12 text-petrol-700 transition-all group-hover:scale-110 group-hover:bg-petrol-600/20">
                  <Icon className="size-6" strokeWidth={1.5} />
                </span>
                <span className="mt-1 text-xs font-bold text-navy-900 sm:text-sm">
                  {it.title}
                </span>
                <span className="text-[10px] leading-5 text-charcoal-500 sm:text-xs">
                  {it.desc}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </Reveal>
  );
}
