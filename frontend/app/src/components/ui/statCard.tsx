import { useEffect, useRef, useState } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";
import type { DashboardCard } from "@/types/dashboard";
import { useRelativeTime } from "@/hooks/useRelativeTime";

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

function RollingDigit({ digit, delay }: { digit: number; delay: number }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <span className="relative inline-block h-[1.2em] w-[0.62em] overflow-hidden">
      <span
        className="absolute left-0 top-0 flex flex-col transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{
          transform: `translateY(-${mounted ? digit * 10 : 0}%)`,
          transitionDelay: `${delay}ms`,
        }}
      >
        {DIGITS.map((d) => (
          <span key={d} className="flex h-[1.2em] items-center justify-center">
            {d}
          </span>
        ))}
      </span>
    </span>
  );
}

function AnimatedValue({ value }: { value: number }) {
  const digits = String(value).split("");
  const totalDigits = digits.length;

  return (
    <span className="inline-flex">
      {digits.map((char, i) => {
        const d = parseInt(char, 10);
        const stagger = (totalDigits - 1 - i) * 60;
        return <RollingDigit key={`${totalDigits}-${i}`} digit={d} delay={stagger} />;
      })}
    </span>
  );
}

function DeltaBadge({ delta, id }: { delta: number | null; id: string }) {
  if (delta == null) return null;
  if (delta === 0) {
    return (
      <span className="ml-1.5 inline-flex items-center text-[10px] font-medium tracking-wide text-text-muted">
        --
      </span>
    );
  }

  const isIncrease = delta > 0;
  const isAlertMetric = id === "active-vessels" || id === "high-severity";
  const color = isIncrease
    ? isAlertMetric
      ? "text-status-alert"
      : "text-status-safe"
    : isAlertMetric
      ? "text-status-safe"
      : "text-status-alert";

  const Icon = isIncrease ? ArrowUp : ArrowDown;

  return (
    <span
      className={`ml-1.5 inline-flex items-center gap-0.5 text-[10px] font-semibold ${color}`}
    >
      <Icon className="size-2.5" strokeWidth={2.5} />
      {Math.abs(delta)}
    </span>
  );
}

function CardCell({ card }: { card: DashboardCard }) {
  const Icon = card.icon;
  const isNumeric = typeof card.value === "number";
  const [flash, setFlash] = useState(false);
  const prevValueRef = useRef(card.value);

  useEffect(() => {
    if (prevValueRef.current !== card.value && card.delta != null && card.delta !== 0) {
      setFlash(true);
      const timeout = setTimeout(() => setFlash(false), 400);
      prevValueRef.current = card.value;
      return () => clearTimeout(timeout);
    }
    prevValueRef.current = card.value;
  }, [card.value, card.delta]);

  return (
    <div
      className={`flex min-w-0 flex-1 items-center gap-3 px-4 py-3 transition-colors duration-300 ${
        flash ? "bg-bg-surface" : "bg-bg-panel"
      }`}
    >
      <Icon
        className={`size-4 shrink-0 ${card.iconClass}`}
        strokeWidth={2}
      />
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-text-muted">
          {card.title}
        </p>
        <p className="flex items-baseline font-mono text-xl font-semibold tracking-tight text-text-primary">
          {isNumeric ? (
            <AnimatedValue value={card.value as number} />
          ) : (
            card.value
          )}
          {isNumeric && <DeltaBadge delta={card.delta} id={card.id} />}
        </p>
      </div>
    </div>
  );
}

interface StatusStripProps {
  cards: DashboardCard[];
  lastUpdated: Date | null;
  error: Error | null;
}

export function StatusStrip({ cards, lastUpdated, error }: StatusStripProps) {
  const timeLabel = useRelativeTime(lastUpdated);

  const dotColor = error
    ? "bg-status-alert"
    : !lastUpdated
      ? "bg-text-muted"
      : Date.now() - lastUpdated.getTime() > 60_000
        ? "bg-status-warning"
        : "bg-status-safe";

  const statusText = error ? "Connection lost" : `Updated ${timeLabel}`;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-stretch gap-px rounded-xl border border-border-subtle bg-border-subtle overflow-hidden">
        {cards.map((card) => (
          <CardCell key={card.id} card={card} />
        ))}
      </div>
      <div className="flex items-center gap-2 px-1">
        <span className="relative flex size-2">
          <span
            className={`absolute inline-flex size-full rounded-full opacity-60 ${dotColor} ${!error && lastUpdated ? "animate-ping" : ""}`}
            style={{ animationDuration: "2.4s" }}
          />
          <span
            className={`relative inline-flex size-2 rounded-full ${dotColor}`}
          />
        </span>
        <span className="text-[11px] text-text-muted">{statusText}</span>
      </div>
    </div>
  );
}
