"use client";

import { Share2, Link2, Check, MessageCircle, Globe, Send } from "lucide-react";
import { useState } from "react";

type Props = {
  title: string;
  url: string;
};

export function BlogShareButtons({ title, url }: Props) {
  const [copied, setCopied] = useState(false);

  const shareData = [
    {
      label: "تلگرام",
      href: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
      icon: Send,
      color: "hover:bg-sky-100 hover:text-sky-600",
    },
    {
      label: "توییتر",
      href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
      icon: Globe,
      color: "hover:bg-blue-100 hover:text-blue-500",
    },
    {
      label: "واتساپ",
      href: `https://wa.me/?text=${encodeURIComponent(title + " " + url)}`,
      icon: MessageCircle,
      color: "hover:bg-emerald-100 hover:text-emerald-600",
    },
  ];

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* fallback */ }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-charcoal-400 ml-1 hidden sm:inline">اشتراک‌گذاری:</span>
      {shareData.map((item) => {
        const Icon = item.icon;
        return (
          <a
            key={item.label}
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            title={item.label}
            className={`flex items-center justify-center size-9 rounded-xl border border-navy-900/10 bg-white text-charcoal-500 transition-all ${item.color}`}
          >
            <Icon className="size-4" strokeWidth={1.6} />
          </a>
        );
      })}
      <button
        type="button"
        onClick={copyLink}
        title={copied ? "کپی شد!" : "کپی لینک"}
        className={`flex items-center justify-center size-9 rounded-xl border border-navy-900/10 bg-white text-charcoal-500 transition-all hover:bg-petrol-50 hover:text-petrol-600`}
      >
        {copied ? <Check className="size-4 text-emerald-500" strokeWidth={2} /> : <Link2 className="size-4" strokeWidth={1.6} />}
      </button>
    </div>
  );
}
