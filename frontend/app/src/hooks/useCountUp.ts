import { useState, useEffect, useRef } from "react";

function easeOutExpo(t: number): number {
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

export function useCountUp(target: number, duration = 600): number {
  const [display, setDisplay] = useState(0);
  const prevTarget = useRef(0);
  const rafRef = useRef(0);

  useEffect(() => {
    const from = prevTarget.current;
    prevTarget.current = target;

    if (from === target) {
      setDisplay(target);
      return;
    }

    const start = performance.now();
    const delta = target - from;

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutExpo(progress);
      setDisplay(Math.round(from + delta * eased));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return display;
}
