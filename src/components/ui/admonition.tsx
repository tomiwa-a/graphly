import { AlertTriangle, Info, Lightbulb, OctagonX } from "lucide-react";

const config = {
  note: {
    icon: Info,
    label: "Note",
    border: "border-sky-500",
    bg: "bg-sky-50",
    iconColor: "text-sky-600",
    labelColor: "text-sky-800",
  },
  tip: {
    icon: Lightbulb,
    label: "Tip",
    border: "border-emerald-500",
    bg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    labelColor: "text-emerald-800",
  },
  warning: {
    icon: AlertTriangle,
    label: "Warning",
    border: "border-amber-500",
    bg: "bg-amber-50",
    iconColor: "text-amber-600",
    labelColor: "text-amber-800",
  },
  caution: {
    icon: OctagonX,
    label: "Caution",
    border: "border-red-500",
    bg: "bg-red-50",
    iconColor: "text-red-600",
    labelColor: "text-red-800",
  },
} as const;

type AdmonitionType = keyof typeof config;

export function Admonition({
  type,
  children,
}: {
  type: string;
  children: React.ReactNode;
}) {
  const cfg = config[type as AdmonitionType] ?? config.note;
  const Icon = cfg.icon;

  return (
    <div
      className={`my-4 rounded-xl border-l-4 ${cfg.border} ${cfg.bg} p-4`}
    >
      <div className={`flex items-center gap-2 text-sm font-bold font-heading ${cfg.labelColor}`}>
        <Icon className={`h-4 w-4 ${cfg.iconColor}`} />
        {cfg.label}
      </div>
      <div className={`mt-1 text-sm leading-relaxed text-foreground-secondary [&_p:first-child]:mt-0 [&_p]:my-1`}>
        {children}
      </div>
    </div>
  );
}
