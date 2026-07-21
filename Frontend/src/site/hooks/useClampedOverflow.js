import { useLayoutEffect, useRef, useState } from "react";

/**
 * Detects whether clamped text overflows its box.
 * Pass `expanded` so measurement runs while collapsed (or after collapse).
 */
export function useClampedOverflow(text, expanded) {
  const ref = useRef(null);
  const [overflows, setOverflows] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    const measure = () => {
      // Keep last known overflow while expanded so "Read Less" stays visible.
      if (expanded) return;

      // Force layout with clamp applied, then compare full vs visible height.
      const next = el.scrollHeight > el.clientHeight + 1;
      setOverflows(next);
    };

    measure();

    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    window.addEventListener("resize", measure);

    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [text, expanded]);

  return { ref, overflows };
}
