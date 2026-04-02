import type { DashboardCard } from "@/types/dashboard";

interface StatCardProps {
  card: DashboardCard;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function StatCard({ card }: StatCardProps) {
  const Icon = card.icon;

  return (
    <article className="flex flex-col gap-3 rounded-xl border border-border-subtle bg-bg-panel px-4 py-3 shadow-panel">
      <div className="flex items-center gap-3">
        <div
          className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${card.iconBgClass}`}
        >
          <Icon className={`size-5 ${card.iconClass}`} strokeWidth={2.2} />
        </div>

        <div className="min-w-0">
          <p className="text-xs text-text-muted">{card.title}</p>
          <p className="mt-0.5 text-2xl font-semibold tracking-tight text-text-primary">
            {card.value}
          </p>
        </div>
      </div>

      <div className="border-t border-border-subtle pt-2">
        <p className="text-xs text-text-muted">
          Updated {formatTime(card.updatedAt)}
        </p>
      </div>
    </article>
  );
}
