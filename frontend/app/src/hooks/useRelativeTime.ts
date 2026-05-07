import { useState, useEffect } from "react";

function formatSeconds(diffMs: number): string {
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 3) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export function useRelativeTime(timestamp: Date | null): string {
  const [label, setLabel] = useState(() =>
    timestamp ? formatSeconds(Date.now() - timestamp.getTime()) : "---",
  );

  useEffect(() => {
    if (!timestamp) {
      setLabel("---");
      return;
    }

    function update() {
      setLabel(formatSeconds(Date.now() - timestamp!.getTime()));
    }

    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [timestamp]);

  return label;
}
