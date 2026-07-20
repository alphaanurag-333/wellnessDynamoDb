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
      if (expanded) return;
      setOverflows(el.scrollHeight > el.clientHeight + 1);
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
