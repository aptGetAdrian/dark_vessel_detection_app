import { Bell, Search } from "lucide-react";
import type { HealthStatus } from "@/types/dashboard";

type Page = "dashboard" | "statistics";

interface HeaderProps {
  page: Page;
  onNavigate: (page: Page) => void;
  health: HealthStatus | null;
  healthError: Error | null;
}

function ConnectionIndicator({
  health,
  healthError,
}: {
  health: HealthStatus | null;
  healthError: Error | null;
}) {
  if (healthError || !health) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-border-subtle px-2.5 py-1.5">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full rounded-full bg-status-alert opacity-60" />
          <span className="relative inline-flex size-2 rounded-full bg-status-alert" />
        </span>
        <span className="text-[11px] font-medium text-text-muted">
          Backend offline
        </span>
      </div>
    );
  }

  const { database, ais_stream, sentinel } = health.sources;
  const isLive = database && ais_stream;

  const dotColor = isLive ? "bg-status-safe" : "bg-status-warning";
  const label = isLive
    ? "Live AIS stream"
    : !database
      ? "Simulated data"
      : "AIS stream inactive";

  const details: string[] = [];
  if (database) details.push("DB");
  if (ais_stream) details.push("AIS");
  if (sentinel) details.push("SAR");

  return (
    <div
      className="flex items-center gap-2 rounded-md border border-border-subtle px-2.5 py-1.5"
      title={`Active sources: ${details.length ? details.join(", ") : "none (mock mode)"}`}
    >
      <span className="relative flex size-2">
        {isLive && (
          <span
            className={`absolute inline-flex size-full rounded-full opacity-60 ${dotColor} animate-ping`}
            style={{ animationDuration: "2.4s" }}
          />
        )}
        <span
          className={`relative inline-flex size-2 rounded-full ${dotColor}`}
        />
      </span>
      <span className="text-[11px] font-medium text-text-muted">{label}</span>
    </div>
  );
}

export function Header({ page, onNavigate, health, healthError }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border-subtle bg-bg-panel">
      <div className="relative mx-auto flex h-15 w-full max-w-7xl items-center justify-between px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <a
            href="#"
            className="text-base font-semibold tracking-tight text-text-primary"
          >
            Heimdal
          </a>
          <ConnectionIndicator health={health} healthError={healthError} />
        </div>

        <nav
          aria-label="Primary navigation"
          className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 md:flex"
        >
          {(["dashboard", "statistics"] as Page[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onNavigate(p)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                page === p
                  ? "bg-bg-surface text-text-primary"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              {p}
            </button>
          ))}
        </nav>

        <nav aria-label="Header actions" className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Search"
            className="rounded-md p-2.5 text-text-muted transition-colors hover:bg-bg-surface hover:text-text-primary"
          >
            <Search className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Notifications"
            className="rounded-md p-2.5 text-text-muted transition-colors hover:bg-bg-surface hover:text-text-primary"
          >
            <Bell className="size-4" />
          </button>
          <button
            type="button"
            className="hidden items-center gap-2 rounded-md p-1 transition-colors hover:bg-bg-surface md:inline-flex"
          >
            <span className="flex size-8 items-center justify-center rounded-full bg-bg-surface text-xs font-semibold text-text-primary">
              TM
            </span>
            <span className="pr-1 text-sm font-medium text-text-muted">Account</span>
          </button>
        </nav>
      </div>
    </header>
  );
}
