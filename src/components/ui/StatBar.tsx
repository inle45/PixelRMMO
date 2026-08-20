interface StatBarProps {
  label: string;
  value: number;
  max: number;
  display: string;
  color: string;
}

export default function StatBar({ label, value, max, display, color }: StatBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className="font-medium text-white/60">{label}</span>
        <span className="font-semibold text-white/85">{display}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full ${color} transition-[width] duration-500 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
