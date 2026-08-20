import type { MonsterFamily, MonsterRarity } from "../../data/bestiary";

export const FAMILY_THEME: Record<MonsterFamily, { border: string; accentText: string; accentBg: string; glow: string }> = {
  vermin: {
    border: "border-emerald-400/25",
    accentText: "text-emerald-300",
    accentBg: "bg-emerald-400/15",
    glow: "shadow-[0_0_25px_rgba(52,211,153,0.25)]",
  },
  skeleton: {
    border: "border-stone-300/25",
    accentText: "text-stone-200",
    accentBg: "bg-stone-300/15",
    glow: "shadow-[0_0_25px_rgba(214,211,209,0.2)]",
  },
  spectre: {
    border: "border-violet-400/25",
    accentText: "text-violet-300",
    accentBg: "bg-violet-400/15",
    glow: "shadow-[0_0_25px_rgba(167,139,250,0.25)]",
  },
  guardian: {
    border: "border-amber-400/25",
    accentText: "text-amber-300",
    accentBg: "bg-amber-400/15",
    glow: "shadow-[0_0_25px_rgba(251,191,36,0.25)]",
  },
  boss: {
    border: "border-red-500/30",
    accentText: "text-red-300",
    accentBg: "bg-red-500/15",
    glow: "shadow-[0_0_30px_rgba(239,68,68,0.3)]",
  },
};

export const RARITY_THEME: Record<MonsterRarity, { bg: string; text: string; ring: string; pulse: boolean }> = {
  normal: { bg: "bg-slate-400/15", text: "text-slate-300", ring: "ring-slate-400/30", pulse: false },
  rare: { bg: "bg-amber-400/20", text: "text-amber-300", ring: "ring-amber-400/50", pulse: true },
  miniboss: { bg: "bg-orange-500/20", text: "text-orange-300", ring: "ring-orange-400/50", pulse: true },
  boss: { bg: "bg-red-600/25", text: "text-red-300", ring: "ring-red-500/60", pulse: true },
};
