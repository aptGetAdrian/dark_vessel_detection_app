interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  sub?: string;
  color: string;
}

export function KpiCard({ icon, label, value, sub, color }: KpiCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border-subtle bg-bg-panel px-5 py-4 shadow-panel">
      <div
        className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${color}`}
      >
        {icon}
      </div>
      <div>
        <p className="text-xs text-text-muted">{label}</p>
        <p className="text-2xl font-bold text-text-primary">{value}</p>
        {sub && <p className="text-xs text-text-muted">{sub}</p>}
      </div>
    </div>
  );
}
