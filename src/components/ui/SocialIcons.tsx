import type { ComponentType, SVGProps } from "react";

/**
 * آیکون‌های واقعی شبکه‌های اجتماعی (برندگرید رسمی)
 * هر آیکون viewBox 24x24 با stroke-linecap round برای هماهنگی بصری.
 */

export const Instagram: ComponentType<SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
  </svg>
);

export const Telegram: ComponentType<SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M21.5 2.5L1.5 11l7 3 3 7 10-18.5z" />
    <path d="M11.5 14.5l4-4" />
  </svg>
);

export const LinkedIn: ComponentType<SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="2" y="2" width="20" height="20" rx="3" ry="3" />
    <path d="M7 10v7" />
    <path d="M7 7v.01" />
    <path d="M12 17v-5" />
    <path d="M12 12a3 3 0 0 1 6 0v5" />
  </svg>
);

export const Phone: ComponentType<SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);
