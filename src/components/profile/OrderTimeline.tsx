"use client";

import { Check, CreditCard, Package, Truck, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: 0, label: "پرداخت", icon: CreditCard },
  { id: 1, label: "تأیید", icon: Check },
  { id: 2, label: "آماده‌سازی", icon: Package },
  { id: 3, label: "ارسال", icon: Truck },
  { id: 4, label: "تحویل", icon: CheckCircle2 },
] as const;

export function OrderTimeline({ currentStage }: { currentStage: number }) {
  return (
    <div className="relative">
      <div className="grid grid-cols-5 gap-1">
        {STEPS.map((step) => {
          const isActive = step.id <= currentStage;
          const isCurrent = step.id === currentStage;
          const Icon = step.icon;
          return (
            <div key={step.id} className="flex flex-col items-center">
              <div
                className={cn(
                  "flex size-9 items-center justify-center rounded-full transition-all duration-500 sm:size-10",
                  isActive
                    ? "bg-petrol-600 text-pearl-50 shadow-md"
                    : "bg-navy-900/5 text-charcoal-400",
                  isCurrent && "ring-2 ring-petrol-300 ring-offset-2 ring-offset-pearl-100",
                )}
              >
                <Icon className="size-4 sm:size-5" strokeWidth={1.6} />
              </div>
              <span
                className={cn(
                  "mt-2 text-center text-[10px] font-medium sm:text-xs",
                  isActive ? "text-navy-900" : "text-charcoal-400",
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* نوار پیشرفت زیر آیکون‌ها */}
      <div className="mt-[-2.6rem] hidden grid-cols-5 gap-1 sm:mt-[-2.6rem] sm:flex">
        {STEPS.map((step) => (
          <div key={step.id} className="h-0.5">
            <div
              className={cn(
                "h-full rounded-full",
                step.id < currentStage ? "bg-petrol-600" : "bg-navy-900/5",
              )}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
