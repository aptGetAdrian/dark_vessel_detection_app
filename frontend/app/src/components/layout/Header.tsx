import { useState } from "react";
import { Menu, X } from "lucide-react";
import type { HealthStatus } from "@/types/dashboard";

type Page = "dashboard" | "statistics" | "zones";

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

const NAV_ITEMS: { key: Page; label: string }[] = [
  { key: "dashboard", label: "Dashboard" },
  { key: "statistics", label: "Statistics" },
  { key: "zones", label: "Zones" },
];

export function Header({ page, onNavigate, health, healthError }: HeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border-subtle bg-bg-panel">
      <div className="relative mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-5 lg:px-8">
        <div className="flex items-center gap-3">
          <span className="text-base font-semibold tracking-tight text-text-primary">
            Heimdal
          </span>
          <span className="hidden sm:block">
            <ConnectionIndicator health={health} healthError={healthError} />
          </span>
        </div>

        <nav
          aria-label="Primary navigation"
          className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 md:flex"
        >
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => onNavigate(item.key)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                page === item.key
                  ? "bg-bg-surface text-text-primary"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <span className="block sm:hidden">
            <ConnectionIndicator health={health} healthError={healthError} />
          </span>
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            className="rounded-md p-2 text-text-muted transition-colors hover:bg-bg-surface hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent md:hidden"
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav
          aria-label="Mobile navigation"
          className="border-t border-border-subtle bg-bg-panel px-5 pb-3 pt-2 md:hidden"
        >
          <div className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  onNavigate(item.key);
                  setMobileOpen(false);
                }}
                className={`rounded-md px-3 py-2 text-left text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                  page === item.key
                    ? "bg-bg-surface text-text-primary"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
