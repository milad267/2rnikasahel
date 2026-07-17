import type { Metadata } from "next";
import Link from "next/link";
import { Phone, Mail, MapPin, Clock, MessageSquare } from "lucide-react";
import { ContactForm } from "./ContactForm";
import { getSetting } from "@/lib/settings";

export const metadata: Metadata = {
  title: "تماس با ما",
  description: "راه‌های ارتباط با درنیکا ساحل؛ تلفن، ایمیل، آدرس و فرم تماس.",
};

async function getContactInfo() {
  const phone = await getSetting<string>("contact.phone", "general");
  const email = await getSetting<string>("contact.email", "general");
  const address = await getSetting<string>("contact.address", "general");
  const hours = await getSetting<string>("contact.hours", "general");
  return { phone, email, address, hours };
}

export default async function ContactPage() {
  const info = await getContactInfo();

  const contactItems = [
    { icon: Phone, title: "تلفن تماس", value: info.phone || "لطفاً از پنل مدیریت تنظیم کنید", href: info.phone ? `tel:${info.phone}` : null, dir: "ltr" as const },
    { icon: Mail, title: "ایمیل", value: info.email || "لطفاً از پنل مدیریت تنظیم کنید", href: info.email ? `mailto:${info.email}` : null, dir: "ltr" as const },
    { icon: MapPin, title: "آدرس", value: info.address || "لطفاً از پنل مدیریت تنظیم کنید", href: null, dir: "rtl" as const },
    { icon: Clock, title: "ساعات کاری", value: info.hours || "شنبه تا پنجشنبه، ۹ صبح تا ۶ عصر", href: null, dir: "rtl" as const },
  ];

  return (
    <div className="min-h-screen px-4 pb-24 pt-40 sm:px-6 lg:px-8 lg:pt-44">
      <div className="mx-auto max-w-[96rem]">
        {/* مسیر ناوبری */}
        <nav className="mb-6 flex items-center gap-2 text-xs text-charcoal-500">
          <Link href="/" className="transition-colors hover:text-petrol-600">خانه</Link>
          <span>/</span>
          <span className="text-navy-900">تماس با ما</span>
        </nav>

        {/* هدر */}
        <div className="mb-8">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-petrol-600/10 px-3 py-1 text-[11px] font-medium text-petrol-700">
            <MessageSquare className="size-3.5" strokeWidth={1.7} />
            در تماس باشید
          </span>
          <h1 className="text-gradient-navy mt-4 py-1 text-3xl font-black leading-[1.35] sm:text-5xl">
            تماس با ما
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-8 text-charcoal-600">
            سوال، پیشنهاد یا درخواست استعلام قیمت دارید؟ از طریق فرم زیر یا راه‌های ارتباطی، پیام خود را
            برای ما ارسال کنید. کارشناسان ما در سریع‌ترین زمان پاسخ‌گو خواهند بود.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* اطلاعات تماس */}
          <div className="space-y-4 lg:col-span-2">
            {contactItems.map((item) => {
              const Icon = item.icon;
              const content = (
                <div className="card flex items-start gap-4 rounded-[1.5rem] p-5 transition-all hover:shadow-[0_20px_50px_-30px_rgba(19,78,92,0.5)]">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-petrol-600/12 text-petrol-700">
                    <Icon className="size-5" strokeWidth={1.5} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-charcoal-500">{item.title}</p>
                    <p className="mt-1 text-sm font-bold text-navy-900" dir={item.dir}>{item.value}</p>
                  </div>
                </div>
              );
              return item.href ? (
                <a key={item.title} href={item.href} className="block">{content}</a>
              ) : (
                <div key={item.title}>{content}</div>
              );
            })}
          </div>

          {/* فرم تماس */}
          <div className="lg:col-span-3">
            <ContactForm />
          </div>
        </div>
      </div>
    </div>
  );
}
