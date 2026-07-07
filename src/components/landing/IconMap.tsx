import {
  Boxes,
  Cpu,
  Handshake,
  ShieldCheck,
  Layers,
  Wrench,
  Gauge,
  Truck,
  BadgeCheck,
  Headset,
  Zap,
  Factory,
  type LucideIcon,
} from "lucide-react";

const map: Record<string, LucideIcon> = {
  Boxes,
  Cpu,
  Handshake,
  ShieldCheck,
  Layers,
  Wrench,
  Gauge,
  Truck,
  BadgeCheck,
  Headset,
  Zap,
  Factory,
};

export function getFeatureIcon(name: string): LucideIcon {
  return map[name] ?? ShieldCheck;
}
