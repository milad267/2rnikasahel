import { Construction } from "lucide-react";

export function PlaceholderPage({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {children || (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white py-20">
          <Construction className="size-10 text-slate-300" strokeWidth={1.3} />
          <p className="mt-4 text-sm font-medium text-slate-400">این بخش در فاز بعدی پیاده‌سازی می‌شود</p>
        </div>
      )}
    </div>
  );
}
