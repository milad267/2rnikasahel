"use client";

import { useEffect, useState, useRef } from "react";
import { Save, Plus, Trash2, Info, Phone, Mail, Globe, Image as ImageIcon, Layout, Search, Shield, Clock, Palette, Paintbrush, CreditCard, MapPin, ToggleLeft, Download, Upload, RefreshCw, Eye, EyeOff, Smartphone, MessageSquare, X, Loader2, User } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PALETTES, type ColorPalette } from "@/lib/palettes";

type Setting = { id: number; key: string; value: any; group: string; locale: string; };
type TabKey = "general" | "contact" | "appearance" | "palettes" | "about" | "seo" | "footer" | "landing" | "security";

const TABS: { key: TabKey; label: string; icon: any; divider?: boolean }[] = [
  // ═══ تنظیمات اصلی ═══
  { key: "general", label: "اطلاعات عمومی", icon: Info },
  { key: "appearance", label: "ظاهر", icon: Paintbrush },
  { key: "palettes", label: "پالت رنگی", icon: Palette },
  { key: "landing", label: "صفحه اصلی", icon: Layout, divider: true },
  // ═══ محتوای سایت ═══
  { key: "about", label: "درباره ما", icon: User },
  { key: "footer", label: "فوتر", icon: Globe },
  { key: "contact", label: "تماس‌ها", icon: Phone, divider: true },
  // ═══ خدمات ═══
  { key: "seo", label: "سئو", icon: Search },
  { key: "security", label: "امنیت", icon: Shield },
];

export default function SettingsPage() {
  const [tab, setTab] = useState<TabKey>("general");
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [phones, setPhones] = useState<{ label: string; number: string }[]>([]);
  const [emails, setEmails] = useState<{ label: string; email: string }[]>([]);
  const [socials, setSocials] = useState<{ label: string; url: string; icon: string }[]>([]);
  const [workingHours, setWorkingHours] = useState<{ day: string; hours: string }[]>([]);
  const [floatingCards, setFloatingCards] = useState<{ icon: string; title: string; value: string }[]>([]);
  const [addresses, setAddresses] = useState<{ label: string; address: string; lat?: string; lng?: string }[]>([]);

  function getVal(key: string, fallback = ""): string {
    const found = settings.find(s => s.key === key);
    return (found?.value ?? fallback) || fallback;
  }

  useEffect(() => {
    fetch("/api/admin/settings").then(r => r.json()).then(d => {
      const arr: Setting[] = d.data || d;
      setSettings(arr);
      try {
        setPhones(JSON.parse(arr.find(s => s.key === "site.phones")?.value || "[]"));
        setEmails(JSON.parse(arr.find(s => s.key === "site.emails")?.value || "[]"));
        setSocials(JSON.parse(arr.find(s => s.key === "site.socials")?.value || "[]"));
        setWorkingHours(JSON.parse(arr.find(s => s.key === "site.working_hours")?.value || "[]"));
        setAddresses(JSON.parse(arr.find(s => s.key === "site.addresses")?.value || "[]"));
        const cardsRaw = JSON.parse(arr.find(s => s.key === "hero.cards")?.value || "[]");
        setFloatingCards(Array.isArray(cardsRaw) && cardsRaw.length > 0 ? cardsRaw : [
          { icon: "Boxes", title: "سیستم تنوع محصول", value: "نامحدود" },
          { icon: "Cpu", title: "هوش مصنوعی", value: "۴ ماژول" },
          { icon: "Layers", title: "واحدهای اندازه‌گیری", value: "۱۹+" },
        ]);
      } catch {}
    }).finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    const getEl = (id: string) => (document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement)?.value;
    const fetches: Promise<any>[] = [
      fetch("/api/admin/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: "site.phones", value: JSON.stringify(phones) }) }),
      fetch("/api/admin/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: "site.emails", value: JSON.stringify(emails) }) }),
      fetch("/api/admin/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: "site.socials", value: JSON.stringify(socials) }) }),
      fetch("/api/admin/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: "site.working_hours", value: JSON.stringify(workingHours) }) }),
      fetch("/api/admin/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: "site.addresses", value: JSON.stringify(addresses) }) }),
      fetch("/api/admin/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: "hero.cards", value: JSON.stringify(floatingCards), group: "landing" }) }),
    ];

    // About items (JSON array)
    try {
      const aboutItems: { icon: string; title: string; text: string }[] = [];
      for (let i = 0; i < 4; i++) {
        const icon = getEl(`landing_about_items_${i}_icon`);
        const title = getEl(`landing_about_items_${i}_title`);
        const text = getEl(`landing_about_items_${i}_text`);
        if (icon || title || text) aboutItems.push({ icon, title, text });
      }
      if (aboutItems.length > 0) {
        fetches.push(fetch("/api/admin/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: "landing.about.items", value: JSON.stringify(aboutItems), group: "landing" }) }));
      }
    } catch {}

    // General text fields
    const textFields = [
      "brand.name", "brand.tagline", "site.logo", "site.favicon", "site.language", "site.currency", "site.timezone",
      "site.maintenance_mode", "site.maintenance_message",
      "footer.enamad_code", "footer.copyright", "footer.enamad_note",
      "about.title", "about.content",
      "about.page_title", "about.page_desc",
      "about.values",
      "about.mission_title", "about.mission_desc",
      "about.vision_title", "about.vision_desc",
      "about.cta_title", "about.cta_desc",
      "about.cta_btn1", "about.cta_btn1_link",
      "about.cta_btn2", "about.cta_btn2_link",
      "seo.ga_id", "seo.gtm_id", "seo.meta_keywords", "seo.robots_txt",
      "security.max_login_attempts", "security.recaptcha_key", "security.recaptcha_secret",
      "security.min_password_length",
      "landing.hero.badge", "landing.hero.title", "landing.hero.subtitle", "landing.hero.ctaPrimary", "landing.hero.ctaSecondary",
      "landing.stats.products", "landing.stats.brands", "landing.stats.contractors", "landing.stats.support",
      "landing.features.title", "landing.features.subtitle",
      "landing.features.items.variants.icon", "landing.features.items.variants.title", "landing.features.items.variants.desc",
      "landing.features.items.ai.icon", "landing.features.items.ai.title", "landing.features.items.ai.desc",
      "landing.features.items.b2b.icon", "landing.features.items.b2b.title", "landing.features.items.b2b.desc",
      "landing.features.items.secure.icon", "landing.features.items.secure.title", "landing.features.items.secure.desc",
      "landing.trust.icon1", "landing.trust.title1", "landing.trust.desc1",
      "landing.trust.icon2", "landing.trust.title2", "landing.trust.desc2",
      "landing.trust.icon3", "landing.trust.title3", "landing.trust.desc3",
      "landing.trust.icon4", "landing.trust.title4", "landing.trust.desc4",
    ];
    for (const key of textFields) {
      const val = getEl(key.replace(/\./g, "_"));
      if (val !== undefined) {
        let group = "general";
        if (key.startsWith("landing.")) group = "landing";
        else if (key.startsWith("seo.")) group = "seo";
        else if (key.startsWith("security.")) group = "security";
        else if (key.startsWith("about.") && key !== "about.title" && key !== "about.content") group = "about";
        else if (key.startsWith("footer.")) group = "footer";
        fetches.push(fetch("/api/admin/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key, value: val || "", group }) }));
      }
    }
    // Boolean toggles
    const boolFields = ["site.maintenance_enabled", "site.registration_enabled", "security.force_https", "security.captcha_enabled"];
    for (const key of boolFields) {
      const el = document.getElementById(key.replace(/\./g, "_")) as HTMLInputElement;
      if (el) {
        fetches.push(fetch("/api/admin/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key, value: el.checked ? "true" : "false", group: "general" }) }));
      }
    }

    try {
      await Promise.all(fetches);
      toast.success("✅ تنظیمات ذخیره شد");
    } catch { toast.error("خطا در ذخیره"); }
    setSaving(false);
  }

  if (loading) return <div className="flex h-40 items-center justify-center"><div className="size-6 animate-spin rounded-full border-4 border-petrol-600 border-t-transparent" /></div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">تنظیمات سایت</h1>
          <p className="mt-1 text-sm text-slate-500">مدیریت کامل تنظیمات فروشگاه</p>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-slate-800 to-slate-900 px-5 py-2.5 text-xs font-semibold text-white shadow-md disabled:opacity-50">
          <Save className="size-4" /> {saving ? "..." : "ذخیره همه"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-2xl bg-slate-100 p-1.5 overflow-x-auto">
        {TABS.map((t, i) => {
          const Icon = t.icon;
          return (
            <button key={t.key} type="button" onClick={() => setTab(t.key)}
              className={cn(
                "flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-semibold transition-all flex-1 justify-center whitespace-nowrap",
                tab === t.key
                  ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/50"
                  : "text-slate-500 hover:text-slate-700 hover:bg-white/50",
                t.divider && i > 0 ? "mr-1 border-r border-slate-300/50 pr-2" : ""
              )}>
              <Icon className="size-3.5" strokeWidth={1.7} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* General */}
      {tab === "general" && (
        <div className="space-y-4">
          <Section title="📋 اطلاعات پایه">
            <div className="grid gap-4 sm:grid-cols-2">
              <InputField id="brand_name" label="نام سایت" def={getVal("brand.name", "درنیکا ساحل")} />
              <InputField id="brand_tagline" label="شعار" def={getVal("brand.tagline", "مرجع تخصصی تجهیزات صنعتی")} />
            </div>
          </Section>
          <Section title="🌐 زبان و منطقه">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">زبان پیش‌فرض</label>
                <select id="site_language" defaultValue={getVal("site.language", "fa")} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none">
                  <option value="fa">🇮🇷 فارسی</option>
                  <option value="en">🇬🇧 English</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">واحد پول</label>
                <select id="site_currency" defaultValue={getVal("site.currency", "IRR")} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none">
                  <option value="IRR">ریال (IRR)</option>
                  <option value="IRT">تومان (IRT)</option>
                  <option value="USD">دلار (USD)</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">منطقه زمانی</label>
                <select id="site_timezone" defaultValue={getVal("site.timezone", "Asia/Tehran")} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none">
                  <option value="Asia/Tehran">تهران (UTC+3:30)</option>
                  <option value="UTC">UTC</option>
                </select>
              </div>
            </div>
          </Section>
          <Section title="🔧 حالت تعمیرات">
            <div className="flex items-center gap-3">
              <label className="relative inline-flex cursor-pointer items-center">
                <input id="site_maintenance_enabled" type="checkbox" defaultChecked={getVal("site.maintenance_enabled") === "true"} className="peer sr-only" />
                <div className="h-6 w-11 overflow-hidden rounded-full bg-slate-200 after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-amber-500 ltr:peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full" />
              </label>
              <span className="text-xs font-medium text-slate-700">فعال‌سازی حالت تعمیرات</span>
            </div>
            <InputField id="site_maintenance_message" label="پیام حالت تعمیرات" def={getVal("site.maintenance_message", "سایت در حال بروزرسانی است. لطفاً بعداً مراجعه کنید.")} area />
          </Section>
        </div>
      )}

      {/* Contact */}
      {tab === "contact" && (
        <div className="space-y-4">
          <Section title="📞 شماره‌های تماس">
            {phones.map((p, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input value={p.label} onChange={e => { const n = [...phones]; n[i].label = e.target.value; setPhones(n); }} placeholder="برچسب" className="w-28 rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none" />
                <input value={p.number} onChange={e => { const n = [...phones]; n[i].number = e.target.value; setPhones(n); }} placeholder="شماره" className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none" dir="ltr" />
                <button onClick={() => setPhones(phones.filter((_, j) => j !== i))} className="rounded-xl p-2 text-red-500 hover:bg-red-50"><Trash2 className="size-4" /></button>
              </div>
            ))}
            <button onClick={() => setPhones([...phones, { label: "", number: "" }])} className="flex items-center gap-1.5 text-xs font-medium text-purple-600"><Plus className="size-4" /> افزودن شماره</button>
          </Section>
          <Section title="📧 ایمیل‌ها">
            {emails.map((e, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input value={e.label} onChange={ev => { const n = [...emails]; n[i].label = ev.target.value; setEmails(n); }} placeholder="برچسب" className="w-28 rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none" />
                <input value={e.email} onChange={ev => { const n = [...emails]; n[i].email = ev.target.value; setEmails(n); }} placeholder="ایمیل" className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none" dir="ltr" />
                <button onClick={() => setEmails(emails.filter((_, j) => j !== i))} className="rounded-xl p-2 text-red-500 hover:bg-red-50"><Trash2 className="size-4" /></button>
              </div>
            ))}
            <button onClick={() => setEmails([...emails, { label: "", email: "" }])} className="flex items-center gap-1.5 text-xs font-medium text-purple-600"><Plus className="size-4" /> افزودن ایمیل</button>
          </Section>
          <Section title="📍 آدرس‌ها">
            {addresses.map((a, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input value={a.label} onChange={e => { const n = [...addresses]; n[i].label = e.target.value; setAddresses(n); }} placeholder="برچسب" className="w-24 rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none" />
                <input value={a.address} onChange={e => { const n = [...addresses]; n[i].address = e.target.value; setAddresses(n); }} placeholder="آدرس کامل" className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none" />
                <button onClick={() => setAddresses(addresses.filter((_, j) => j !== i))} className="rounded-xl p-2 text-red-500 hover:bg-red-50"><Trash2 className="size-4" /></button>
              </div>
            ))}
            <button onClick={() => setAddresses([...addresses, { label: "", address: "" }])} className="flex items-center gap-1.5 text-xs font-medium text-purple-600"><Plus className="size-4" /> افزودن آدرس</button>
          </Section>
          <Section title="🕐 ساعات کاری">
            {workingHours.map((w, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input value={w.day} onChange={e => { const n = [...workingHours]; n[i].day = e.target.value; setWorkingHours(n); }} placeholder="روز" className="w-28 rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none" />
                <input value={w.hours} onChange={e => { const n = [...workingHours]; n[i].hours = e.target.value; setWorkingHours(n); }} placeholder="ساعت کاری" className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none" />
                <button onClick={() => setWorkingHours(workingHours.filter((_, j) => j !== i))} className="rounded-xl p-2 text-red-500 hover:bg-red-50"><Trash2 className="size-4" /></button>
              </div>
            ))}
            <button onClick={() => setWorkingHours([...workingHours, { day: "", hours: "" }])} className="flex items-center gap-1.5 text-xs font-medium text-purple-600"><Plus className="size-4" /> افزودن روز</button>
          </Section>
          <Section title="🌐 شبکه‌های اجتماعی">
            {socials.map((s, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input value={s.label} onChange={e => { const n = [...socials]; n[i].label = e.target.value; setSocials(n); }} placeholder="برچسب" className="w-24 rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none" />
                <select value={s.icon} onChange={e => { const n = [...socials]; n[i].icon = e.target.value; setSocials(n); }} className="w-32 rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none">
                  <option value="instagram">📸 اینستاگرام</option>
                  <option value="telegram">✈️ تلگرام</option>
                  <option value="whatsapp">💬 واتساپ</option>
                  <option value="linkedin">💼 لینکدین</option>
                  <option value="twitter">🐦 توییتر / X</option>
                  <option value="facebook">📘 فیسبوک</option>
                  <option value="youtube">▶️ یوتیوب</option>
                  <option value="aparat">📺 آپارات</option>
                  <option value="tiktok">🎵 تیک تاک</option>
                  <option value="snapchat">👻 اسنپ‌چت</option>
                  <option value="pinterest">📌 پینترست</option>
                  <option value="github">🐙 گیت‌هاب</option>
                  <option value="gitlab">🦊 گیتلب</option>
                  <option value="discord">🎮 دیسکورد</option>
                  <option value="threads">🧵 تریدز</option>
                  <option value="bluesky">☀️ بلواسکای</option>
                  <option value="mastodon">🐘 ماستودون</option>
                  <option value="rss">📡 RSS</option>
                  <option value="website">🌐 وب‌سایت</option>
                  <option value="email">📧 ایمیل</option>
                  <option value="phone">📞 تلفن</option>
                  <option value="telegram_channel">📢 کانال تلگرام</option>
                  <option value="instagram_story">📸 استوری اینستاگرام</option>
                  <option value="bale">🟢 بله</option>
                  <option value="soroush">🟠 سروش</option>
                  <option value="eitaa">🟣 ایتا</option>
                  <option value="rubika">🔵 روبیکا</option>
                  <option value="igap">🟡 آی‌گپ</option>
                  <option value="virgool">✍️ ویرگول</option>
                </select>
                <input value={s.url} onChange={e => { const n = [...socials]; n[i].url = e.target.value; setSocials(n); }} placeholder="لینک" className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none" dir="ltr" />
                <button onClick={() => setSocials(socials.filter((_, j) => j !== i))} className="rounded-xl p-2 text-red-500 hover:bg-red-50"><Trash2 className="size-4" /></button>
              </div>
            ))}
            <button onClick={() => setSocials([...socials, { label: "", url: "", icon: "instagram" }])} className="flex items-center gap-1.5 text-xs font-medium text-purple-600"><Plus className="size-4" /> افزودن شبکه</button>
          </Section>
        </div>
      )}

      {/* Appearance */}
      {tab === "appearance" && (
        <div className="space-y-4">
          <Section title="🎨 برندینگ">
            <div className="grid gap-4 sm:grid-cols-2">
              <InputField id="site_logo" label="آدرس لوگو" def={getVal("site.logo", "/logo.png")} />
              <InputField id="site_favicon" label="آدرس فاوآیکون" def={getVal("site.favicon", "/favicon.ico")} />
            </div>
          </Section>
          <Section title="📱 ثبت‌نام کاربران">
            <div className="flex items-center gap-3">
              <label className="relative inline-flex cursor-pointer items-center">
                <input id="site_registration_enabled" type="checkbox" defaultChecked={getVal("site.registration_enabled") !== "false"} className="peer sr-only" />
                <div className="h-6 w-11 overflow-hidden rounded-full bg-slate-200 after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-green-500 ltr:peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full" />
              </label>
              <span className="text-xs font-medium text-slate-700">ثبت‌نام کاربران جدید</span>
            </div>
          </Section>
        </div>
      )}

      {/* Palettes */}
      {tab === "palettes" && (
        <PalettesPanel />
      )}

      {/* About */}
      {tab === "about" && (
        <div className="space-y-4">
          <Section title="🏢 هدر صفحه درباره ما">
            <InputField id="about_page_title" label="عنوان اصلی" def={getVal("about.page_title", "مرجع تخصصی تجهیزات صنعتی و تأسیسات")} />
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">توضیحات هدر</label>
              <textarea id="about_page_desc" defaultValue={getVal("about.page_desc", "درنیکا ساحل با هدف ساده‌سازی و هوشمندسازی خرید تجهیزات صنعتی و تأسیساتی راه‌اندازی شده است. ما با گردآوری گسترده‌ترین سبد محصولات از برندهای معتبر، ارائهٔ مشاورهٔ فنی و بهره‌گیری از فناوری هوش مصنوعی، تجربه‌ای متفاوت و مطمئن از خرید صنعتی را برای مشتریان، پیمانکاران و کسب‌وکارها فراهم می‌کنیم.")} rows={4} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none leading-6" />
            </div>
          </Section>
          <Section title="📋 مقادیر و ویژگی‌ها (JSON)">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">لیست ویژگی‌ها (آرایه JSON)</label>
              <textarea id="about_values" defaultValue={getVal("about.values", JSON.stringify([
                { title: "کیفیت تضمین‌شده", desc: "تمام محصولات دارای گارانتی اصالت و سلامت فیزیکی هستند." },
                { title: "تنوع بی‌نظیر", desc: "هزاران کد کالای صنعتی و تأسیساتی از برندهای معتبر داخلی و خارجی." },
                { title: "مشاوره هوشمند", desc: "راهنمای انتخاب محصول مبتنی بر هوش مصنوعی برای خرید دقیق‌تر." },
                { title: "پرتال پیمانکاران", desc: "قیمت‌گذاری اختصاصی، استعلام قیمت و پیگیری بصری سفارش‌ها." },
              ]))} rows={6} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none font-mono leading-6" />
            </div>
          </Section>
          <Section title="🎯 ماموریت و چشم‌انداز">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">عنوان ماموریت</label>
                <input id="about_mission_title" defaultValue={getVal("about.mission_title", "ماموریت ما")} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">عنوان چشم‌انداز</label>
                <input id="about_vision_title" defaultValue={getVal("about.vision_title", "چشم‌انداز ما")} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">متن ماموریت</label>
                <textarea id="about_mission_desc" defaultValue={getVal("about.mission_desc", "فراهم‌کردن دسترسی سریع، شفاف و مطمئن به تجهیزات صنعتی با بهترین قیمت و پشتیبانی تخصصی؛ به‌گونه‌ای که هر پروژه‌ای، در هر مقیاسی، بتواند با اطمینان کامل تأمین شود.")} rows={3} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none leading-6" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">متن چشم‌انداز</label>
                <textarea id="about_vision_desc" defaultValue={getVal("about.vision_desc", "تبدیل‌شدن به معتبرترین پلتفرم دیجیتال تأمین تجهیزات صنعتی و تأسیساتی در کشور، با تکیه بر نوآوری، فناوری هوش مصنوعی و تجربهٔ کاربری در تراز جهانی.")} rows={3} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none leading-6" />
              </div>
            </div>
          </Section>
          <Section title="💬 بخش CTA (دعوت به اقدام)">
            <div className="grid gap-4 sm:grid-cols-2">
              <InputField id="about_cta_title" label="عنوان CTA" def={getVal("about.cta_title", "آمادهٔ شروع همکاری هستید؟")} />
              <InputField id="about_cta_desc" label="توضیحات CTA" def={getVal("about.cta_desc", "محصولات ما را کاوش کنید یا برای دریافت مشاوره و استعلام قیمت با ما در تماس باشید.")} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <InputField id="about_cta_btn1" label="متن دکمه اول" def={getVal("about.cta_btn1", "ورود به فروشگاه")} />
              <InputField id="about_cta_btn1_link" label="لینک دکمه اول" def={getVal("about.cta_btn1_link", "/shop")} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <InputField id="about_cta_btn2" label="متن دکمه دوم" def={getVal("about.cta_btn2", "تماس با ما")} />
              <InputField id="about_cta_btn2_link" label="لینک دکمه دوم" def={getVal("about.cta_btn2_link", "/contact")} />
            </div>
          </Section>
        </div>
      )}

      {/* SEO */}
      {tab === "seo" && (
        <div className="space-y-4">
          <Section title="🔍 Google Analytics و Search Console">
            <div className="grid gap-4 sm:grid-cols-2">
              <InputField id="seo_ga_id" label="Google Analytics ID" def={getVal("seo.ga_id", "")} placeholder="G-XXXXXXXXXX" />
              <InputField id="seo_gtm_id" label="Google Tag Manager ID" def={getVal("seo.gtm_id", "")} placeholder="GTM-XXXXXXX" />
            </div>
          </Section>
          <Section title="📄 متا تگ‌های پیش‌فرض">
            <InputField id="seo_meta_keywords" label="کلمات کلیدی (با کاما جدا)" def={getVal("seo.meta_keywords", "تجهیزات صنعتی, تأسیسات, لوله, پمپ")} />
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">Robots.txt محتوای</label>
              <textarea id="seo_robots_txt" defaultValue={getVal("seo.robots_txt", "")} rows={4}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none font-mono leading-6" placeholder="User-agent: *&#10;Allow: /" />
            </div>
          </Section>
        </div>
      )}

      {/* Footer */}
      {tab === "footer" && (
        <div className="space-y-4">
          <Section title="📝 متن فوتر">
            <InputField id="footer_copyright" label="متن کپی‌رایت" def={getVal("footer.copyright", "تمامی حقوق محفوظ است.")} />
          </Section>
          <Section title="🛡 نماد اعتماد">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">کد HTML اناماد</label>
              <textarea id="footer_enamad_code" defaultValue={getVal("footer.enamad_code", "")} rows={4} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none font-mono leading-6" />
            </div>
            <InputField id="footer_enamad_note" label="توضیح زیر نماد" def={getVal("footer.enamad_note", "نماد اعتماد الکترونیکی")} />
          </Section>
        </div>
      )}

      {/* Landing Page */}
      {tab === "landing" && (
        <div className="space-y-4">
          <Section title="🎯 بخش قهرمان (Hero)">
            <div className="grid gap-4 sm:grid-cols-2">
              <InputField id="landing_hero_badge" label="برچسب" def={getVal("landing.hero.badge", "پلتفرم لوکس صنعتی نسل جدید")} />
              <InputField id="landing_hero_title" label="عنوان اصلی" def={getVal("landing.hero.title", "تجهیزات صنعتی، در تراز جهانی")} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">زیرعنوان</label>
              <textarea id="landing_hero_subtitle" rows={3} defaultValue={getVal("landing.hero.subtitle", "درنیکا ساحل تجربه‌ای متفاوت از خرید تجهیزات صنعتی و تأسیساتی می‌سازد؛ با انتخاب هوشمند، تنوع بی‌نظیر و مشاوره مبتنی بر هوش مصنوعی.")} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none leading-6" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <InputField id="landing_hero_ctaPrimary" label="دکمه اصلی" def={getVal("landing.hero.ctaPrimary", "ورود به فروشگاه")} />
              <InputField id="landing_hero_ctaSecondary" label="دکمه دوم" def={getVal("landing.hero.ctaSecondary", "راهنمای انتخاب محصول")} />
            </div>
          </Section>
          <Section title="📊 آمار">
            <div className="grid gap-4 sm:grid-cols-4">
              {[
                { key: "products", label: "کد کالا", fallback: "کد کالای فعال" },
                { key: "brands", label: "برند", fallback: "برند معتبر" },
                { key: "contractors", label: "پیمانکار", fallback: "پیمانکار همکار" },
                { key: "support", label: "پشتیبانی", fallback: "پشتیبانی تخصصی" },
              ].map(s => (
                <InputField key={s.key} id={`landing_stats_${s.key}`} label={s.label} def={getVal(`landing.stats.${s.key}`, s.fallback)} />
              ))}
            </div>
          </Section>
          <Section title="✅ باکس اعتماد (TrustBox)">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="mb-3 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                <p className="mb-2 text-xs font-bold text-slate-700">مورد {i}</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-[10px] font-medium text-slate-600">آیکون</label>
                    <div className="flex items-center gap-2">
                      <input id={`landing_trust_icon${i}`} defaultValue={getVal(`landing.trust.icon${i}`, "")}
                        className="flex-1 rounded-lg border border-slate-200 px-2.5 py-2 text-xs outline-none ltr" placeholder="نام آیکون یا آدرس تصویر" />
                      <IconUploadButtonForSettings
                        onUpload={(url) => { const el = document.getElementById(`landing_trust_icon${i}`) as HTMLInputElement; if (el) el.value = url; }}
                        currentIcon={getVal(`landing.trust.icon${i}`, "")}
                      />
                    </div>
                    <p className="mt-1 text-[10px] text-slate-400">📐 SVG یا PNG · ۴۸×۴۸px</p>
                  </div>
                  <InputField id={`landing_trust_title${i}`} label="عنوان" def={getVal(`landing.trust.title${i}`, "")} />
                  <InputField id={`landing_trust_desc${i}`} label="توضیح" def={getVal(`landing.trust.desc${i}`, "")} />
                </div>
              </div>
            ))}
          </Section>
          <Section title="💳 کارت‌های شناور">
            {floatingCards.map((card, i) => (
              <div key={i} className="mb-3 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-700">کارت {i + 1}</span>
                  <button onClick={() => { const u = floatingCards.filter((_, j) => j !== i); setFloatingCards(u); }}
                    className="text-red-500 hover:text-red-600"><Trash2 className="size-3.5" /></button>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-[10px] font-medium text-slate-600">آیکون</label>
                    <div className="flex items-center gap-2">
                      {card.icon && (card.icon.startsWith("/uploads/") || card.icon.startsWith("http")) ? (
                        <div className="relative size-10 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                          <img src={card.icon} alt={card.title || "آیکون"} className="size-full object-contain p-1" />
                        </div>
                      ) : card.icon ? (
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-xs font-bold text-slate-400">
                          {card.icon.slice(0, 2)}
                        </div>
                      ) : null}
                      <div className="flex flex-1 gap-1">
                        <input
                          type="text"
                          value={card.icon}
                          onChange={e => { const u = [...floatingCards]; u[i] = { ...u[i], icon: e.target.value }; setFloatingCards(u); }}
                          placeholder="آدرس تصویر یا نام آیکون"
                          className="flex-1 rounded-lg border border-slate-200 px-2.5 py-2 text-xs outline-none"
                        />
                        <IconUploadButtonForSettings
                          onUpload={(url) => {
                            const u = [...floatingCards];
                            u[i] = { ...u[i], icon: url };
                            setFloatingCards(u);
                          }}
                          currentIcon={card.icon}
                        />
                      </div>
                    </div>
                    <p className="mt-1 text-[10px] text-slate-400">📐 SVG یا PNG · ۴۸×۴۸px</p>
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-medium text-slate-600">عنوان</label>
                    <input value={card.title} onChange={e => { const u = [...floatingCards]; u[i] = { ...u[i], title: e.target.value }; setFloatingCards(u); }}
                      placeholder="سیستم تنوع محصول" className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs outline-none" />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-medium text-slate-600">مقدار</label>
                    <input value={card.value} onChange={e => { const u = [...floatingCards]; u[i] = { ...u[i], value: e.target.value }; setFloatingCards(u); }}
                      placeholder="نامحدود" className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs outline-none" />
                  </div>
                </div>
              </div>
            ))}
            <button onClick={() => setFloatingCards([...floatingCards, { icon: "Boxes", title: "", value: "" }])}
              className="flex items-center gap-1 text-xs font-medium text-purple-600"><Plus className="size-3.5" /> افزودن کارت</button>
          </Section>
          <Section title="✨ ویژگی‌ها">
            <div className="grid gap-4 sm:grid-cols-2 mb-4">
              <InputField id="landing_features_title" label="عنوان بخش" def={getVal("landing.features.title", "چرا درنیکا ساحل؟")} />
              <InputField id="landing_features_subtitle" label="زیرعنوان بخش" def={getVal("landing.features.subtitle", "زیرساختی که برای مقیاس صنعتی ساخته شده است")} />
            </div>
            {[
              { key: "variants", icon: "Layers", title: "سیستم تنوع پیشرفته", desc: "مدیریت واحد، قیمت، موجودی و مشخصات فنی برای هر تنوع محصول." },
              { key: "ai", icon: "Cpu", title: "هوش مصنوعی یکپارچه", desc: "به‌روزرسانی قیمت از اکسل، خواندن PDF و مشاور تصویری هوشمند." },
              { key: "b2b", icon: "Handshake", title: "پرتال پیمانکاران", desc: "استعلام قیمت، قیمت‌گذاری اختصاصی و پیگیری بصری سفارش‌ها." },
              { key: "secure", icon: "ShieldCheck", title: "امنیت در بالاترین سطح", desc: "معماری آماده تولید، رمزنگاری و کنترل دسترسی دقیق." },
            ].map((item, i) => (
              <div key={item.key} className="mb-3 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                <p className="mb-2 text-xs font-bold text-slate-700">ویژگی {i + 1}</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-[10px] font-medium text-slate-600">آیکون</label>
                    <div className="flex items-center gap-2">
                      <input id={`landing_features_items_${item.key}_icon`} defaultValue={getVal(`landing.features.items.${item.key}.icon`, item.icon)}
                        className="flex-1 rounded-lg border border-slate-200 px-2.5 py-2 text-xs outline-none ltr" placeholder="نام آیکون یا آدرس تصویر" />
                      <IconUploadButtonForSettings
                        onUpload={(url) => { const el = document.getElementById(`landing_features_items_${item.key}_icon`) as HTMLInputElement; if (el) el.value = url; }}
                        currentIcon={getVal(`landing.features.items.${item.key}.icon`, item.icon)}
                      />
                    </div>
                    <p className="mt-1 text-[10px] text-slate-400">📐 SVG یا PNG · ۴۸×۴۸px</p>
                  </div>
                  <InputField id={`landing_features_items_${item.key}_title`} label="عنوان" def={getVal(`landing.features.items.${item.key}.title`, item.title)} />
                  <InputField id={`landing_features_items_${item.key}_desc`} label="توضیح" def={getVal(`landing.features.items.${item.key}.desc`, item.desc)} />
                </div>
              </div>
            ))}
          </Section>
          <Section title="🏢 بخش درباره ما (ویژگی‌های پایین صفحه)">
            <p className="text-[11px] text-slate-500">عنوان و توضیحات هدر بخش درباره ما در صفحه اصلی</p>
            <InputField id="about_title" label="عنوان بخش درباره ما" def={getVal("about.title", "")} />
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">توضیحات بخش درباره ما</label>
              <textarea id="about_content" defaultValue={getVal("about.content", "")} rows={3} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none leading-6" />
            </div>
            <p className="text-[11px] text-slate-500">آیتم‌های بخش درباره ما (ویژگی‌های پایین صفحه)</p>
            {(() => {
              let items: { icon: string; title: string; text: string }[] = [];
              try { items = JSON.parse(getVal("landing.about.items", "[]")) || []; } catch {}
              if (!Array.isArray(items) || items.length === 0) items = [
                { icon: "Boxes", title: "تنوع بی‌نظیر محصولات", text: "هزاران قلم تجهیزات صنعتی" },
                { icon: "Sparkles", title: "مشاوره هوش مصنوعی", text: "انتخاب دقیق کالا با کمک دستیار هوشمند" },
                { icon: "Headset", title: "پشتیبانی تخصصی", text: "همراهی کامل پیش و پس از خرید" },
                { icon: "ShieldCheck", title: "ضمانت اصالت کالا", text: "تضمین کیفیت و اصالت تمام محصولات" },
              ];
              return items.map((item, i) => (
                <div key={i} className="mb-3 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700">آیتم {i + 1}</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-[10px] font-medium text-slate-600">آیکون</label>
                      <div className="flex items-center gap-2">
                        <input id={`landing_about_items_${i}_icon`} defaultValue={item.icon || ""}
                          className="flex-1 rounded-lg border border-slate-200 px-2.5 py-2 text-xs outline-none ltr" placeholder="نام آیکون یا آدرس تصویر" />
                        <IconUploadButtonForSettings
                          onUpload={(url) => { const el = document.getElementById(`landing_about_items_${i}_icon`) as HTMLInputElement; if (el) el.value = url; }}
                          currentIcon={item.icon || ""}
                        />
                      </div>
                      <p className="mt-1 text-[10px] text-slate-400">📐 SVG یا PNG · ۴۸×۴۸px</p>
                    </div>
                    <InputField id={`landing_about_items_${i}_title`} label="عنوان" def={item.title || ""} />
                    <InputField id={`landing_about_items_${i}_text`} label="متن" def={item.text || ""} />
                  </div>
                </div>
              ));
            })()}
          </Section>
        </div>
      )}

      {/* Security */}
      {tab === "security" && (
        <div className="space-y-4">
          <Section title="🔐 امنیت">
            <div className="grid gap-4 sm:grid-cols-2">
              <InputField id="security_min_password_length" label="حداقل طول رمز عبور" def={getVal("security.min_password_length", "6")} type="number" />
              <InputField id="security_max_login_attempts" label="حداکثر تلاش ورود" def={getVal("security.max_login_attempts", "5")} type="number" />
            </div>
            <div className="flex items-center gap-3 mt-3">
              <label className="relative inline-flex cursor-pointer items-center">
                <input id="security_force_https" type="checkbox" defaultChecked={getVal("security.force_https") === "true"} className="peer sr-only" />
                <div className="h-6 w-11 overflow-hidden rounded-full bg-slate-200 after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-green-500 ltr:peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full" />
              </label>
              <span className="text-xs font-medium text-slate-700">اجبار HTTPS</span>
            </div>
          </Section>
          <Section title="🛡 reCAPTCHA">
            <div className="flex items-center gap-3 mb-3">
              <label className="relative inline-flex cursor-pointer items-center">
                <input id="security_captcha_enabled" type="checkbox" defaultChecked={getVal("security.captcha_enabled") === "true"} className="peer sr-only" />
                <div className="h-6 w-11 overflow-hidden rounded-full bg-slate-200 after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-green-500 ltr:peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full" />
              </label>
              <span className="text-xs font-medium text-slate-700">فعال‌سازی reCAPTCHA</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <InputField id="security_recaptcha_key" label="Site Key" def={getVal("security.recaptcha_key", "")} />
              <InputField id="security_recaptcha_secret" label="Secret Key" def={getVal("security.recaptcha_secret", "")} />
            </div>
          </Section>
        </div>
      )}
    </div>
  );
}

// ─── Helper components ───
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
      <h2 className="text-sm font-bold text-slate-900">{title}</h2>
      {children}
    </div>
  );
}

// ─── پالت رنگی ───
function PalettesPanel() {
  const [active, setActive] = useState("navy-petrol");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/admin/palettes").then(r => r.json()).then(d => {
      if (d.ok) setActive(d.active || "navy-petrol");
    }).finally(() => setLoading(false));
  }, []);

  const filtered = PALETTES.filter(p => p.name.includes(search) || p.slug.includes(search));
  const cats = [
    { label: "کلاسیک", slugs: ["navy-petrol","deep-ocean","midnight-forest","slate-charcoal","sand-stone","warm-umber"] },
    { label: "مدرن", slugs: ["obsidian","ivory-onyx","platinum","silver-mist","pearl-white","cloud-gray"] },
    { label: "گرم", slugs: ["terracotta","desert-sand","cappuccino","caramel","cocoa","warm-stone"] },
    { label: "سرد", slugs: ["arctic","iceberg","denim","steel","cobalt","sapphire"] },
    { label: "طبیعی", slugs: ["driftwood","moss","olive","taupe","greige","warm-gray"] },
    { label: "تیره", slugs: ["dark-velvet","midnight-blue","charcoal","raven","shadow","dark-ember"] },
    { label: "لوکس", slugs: ["champagne","cream-silver","ivory-gold","alabaster","porcelain"] },
    { label: "خاص", slugs: ["burgundy","forest-deep","wine-cellar","graphite","storm","earth","smoke","twilight","copper","bronze","polar-night","ash","moonlight"] },
  ];

  async function selectPalette(slug: string) {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/palettes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug }) });
      const d = await res.json();
      if (d.ok) {
        setActive(slug);
        toast.success(`✅ پالت "${d.palette.name}" فعال شد`);
        // اطلاع‌رسانی به ThemeApplier برای اعمال آنی رنگ‌ها
        window.dispatchEvent(new CustomEvent("palette-changed", { detail: { slug } }));
      }
      else toast.error(d.error);
    } catch { toast.error("خطا"); }
    setSaving(false);
  }

  if (loading) return <div className="flex h-40 items-center justify-center"><div className="size-6 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">{PALETTES.length} پالت رنگی لوکس</p>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="جستجوی پالت..."
          className="rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none w-44 focus:border-purple-400" />
      </div>

      {search ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {filtered.map(p => <PaletteCard key={p.slug} palette={p} active={active === p.slug} onSelect={selectPalette} saving={saving} />)}
          {filtered.length === 0 && <p className="col-span-full text-center text-xs text-slate-400 py-8">پالتی یافت نشد</p>}
        </div>
      ) : (
        cats.map(cat => (
          <div key={cat.label}>
            <h3 className="text-xs font-bold text-slate-700 mb-2 px-1">{cat.label}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
              {cat.slugs.map(slug => {
                const p = PALETTES.find(pp => pp.slug === slug);
                return p ? <PaletteCard key={p.slug} palette={p} active={active === p.slug} onSelect={selectPalette} saving={saving} /> : null;
              })}
            </div>
          </div>
        ))
      )}

      <div className="flex items-center justify-between rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 leading-6">
        <div><strong>💡 نکته:</strong> کلیک روی هر پالت، بلافاصله ذخیره و اعمال می‌شود.</div>
      </div>
    </div>
  );
}

function PaletteCard({ palette, active, onSelect, saving }: { palette: ColorPalette; active: boolean; onSelect: (s: string) => void; saving: boolean }) {
  return (
    <button type="button" onClick={() => onSelect(palette.slug)} disabled={saving}
      className={cn(
        "rounded-xl border-2 p-2.5 text-center transition-all hover:shadow-md",
        active ? "border-purple-500 ring-2 ring-purple-200 shadow-lg" : "border-slate-200 hover:border-slate-300"
      )}
    >
      <div className="flex h-8 rounded-lg overflow-hidden mb-1.5 shadow-sm">
        {palette.colors.map((c, i) => (
          <div key={i} className="flex-1" style={{ backgroundColor: c }} />
        ))}
      </div>
      <p className={cn("text-[9px] font-medium truncate", active ? "text-purple-700" : "text-slate-600")}>{palette.name}</p>
      {active && <span className="text-[8px] text-purple-600 font-bold">✓ فعال</span>}
    </button>
  );
}

function InputField({ id, label, def, placeholder, area, type }: { id: string; label: string; def?: string; placeholder?: string; area?: boolean; type?: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-slate-700">{label}</label>
      {area ? (
        <textarea id={id} defaultValue={def || ""} rows={3} placeholder={placeholder}
          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-purple-400 leading-6" />
      ) : (
        <input id={id} type={type || "text"} defaultValue={def || ""} placeholder={placeholder}
          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-purple-400" />
      )}
    </div>
  );
}

function IconUploadButtonForSettings({ onUpload, currentIcon }: { onUpload: (url: string) => void; currentIcon: string }) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("category", "icon");
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.ok && data.file?.url) {
        onUpload(data.file.url);
        toast.success("✅ آیکون آپلود شد");
      } else {
        toast.error(data.error || "خطا در آپلود");
      }
    } catch {
      toast.error("خطا در آپلود تصویر");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const isImage = currentIcon.startsWith("/uploads/") || currentIcon.startsWith("http");

  return (
    <>
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={handleUpload} />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        title={uploading ? "در حال آپلود..." : "آپلود تصویر آیکون"}
        className={cn(
          "flex shrink-0 items-center gap-1 rounded-lg border px-2.5 py-2 text-[10px] font-medium transition-colors",
          uploading
            ? "border-purple-200 bg-purple-50 text-purple-500"
            : isImage
              ? "border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
              : "border-slate-200 bg-white text-slate-500 hover:border-purple-300 hover:text-purple-600"
        )}
      >
        {uploading ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <ImageIcon className="size-3.5" strokeWidth={1.6} />
        )}
        {uploading ? "..." : "آپلود"}
      </button>
      {isImage && (
        <button
          type="button"
          onClick={() => onUpload("")}
          title="حذف تصویر"
          className="flex shrink-0 items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 py-2 text-[10px] text-red-600 hover:bg-red-100"
        >
          <X className="size-3.5" />
        </button>
      )}
    </>
  );
}
