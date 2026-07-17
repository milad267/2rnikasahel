import {
  Boxes, Cpu, Handshake, ShieldCheck, Layers, Wrench, Gauge,
  Truck, BadgeCheck, Headset, Zap, Factory, type LucideIcon,
} from "lucide-react";

const map: Record<string, LucideIcon> = {
  Boxes, Cpu, Handshake, ShieldCheck, Layers, Wrench, Gauge,
  Truck, BadgeCheck, Headset, Zap, Factory,
};

export function getFeatureIcon(name: string): LucideIcon | string {
  return map[name] ?? ShieldCheck;
}

export function renderFeatureIcon(name: string, className = "size-7"): React.ReactNode {
  if (!name) return <ShieldCheck className={className} strokeWidth={1.5} />;
  if (name.startsWith("/") || name.startsWith("http")) {
    return <img src={name} alt="" className={className} />;
  }
  const Icon = map[name];
  return Icon ? <Icon className={className} strokeWidth={1.5} /> : <ShieldCheck className={className} strokeWidth={1.5} />;
}
