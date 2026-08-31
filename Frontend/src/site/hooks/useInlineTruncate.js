import { useLayoutEffect, useRef, useState } from "react";

function lineHeightPx(style) {
  const fontSize = parseFloat(style.fontSize) || 16;
  const raw = String(style.lineHeight || "").trim();
  if (!raw || raw === "normal") return fontSize * 1.5;
  const value = parseFloat(raw);
  if (!Number.isFinite(value) || value <= 0) return fontSize * 1.5;
  if (raw.endsWith("px")) return value;
  if (raw.endsWith("%")) return (fontSize * value) / 100;
  if (raw.endsWith("em") || raw.endsWith("rem")) return fontSize * value;
  // Unitless multiplier such as 1.45 — never treat it as pixels.
  if (value <= 4) return fontSize * value;
  return value;
}

function snapToWord(source, index) {
  if (index >= source.length) return source.length;
  const snapped = source.lastIndexOf(" ", index);
  if (snapped < 8) return index;
  return snapped;
}

/**
 * Truncates `text` so `preview + "... Read More"` fits in `lines` lines.
 */
export function useInlineTruncate(text, expanded, lines = 3) {
  const ref = useRef(null);
  const [overflows, setOverflows] = useState(false);
  const [preview, setPreview] = useState(() => String(text || ""));

  useLayoutEffect(() => {
    const el = ref.current;
    const source = String(text || "");
    if (!el) return undefined;

    const measure = () => {
      const width = el.clientWidth;
      if (!width || !source) {
        setOverflows(false);
        setPreview(source);
        return;
      }

      const cs = getComputedStyle(el);
      const lh = lineHeightPx(cs);
      const maxH = lh * lines + Math.max(3, lh * 0.3);
      const probe = document.createElement("p");
      probe.style.cssText = [
        "position:fixed",
        "left:-9999px",
        "top:0",
        "visibility:hidden",
        "pointer-events:none",
        `width:${width}px`,
        `font-size:${cs.fontSize}`,
        `font-family:${cs.fontFamily}`,
        `font-weight:${cs.fontWeight}`,
        `font-style:${cs.fontStyle}`,
        `line-height:${cs.lineHeight}`,
        `letter-spacing:${cs.letterSpacing}`,
        "text-align:left",
        "white-space:normal",
        "overflow-wrap:break-word",
        "word-break:normal",
        "margin:0",
        "padding:0",
      ].join(";");

      const small =
        getComputedStyle(document.documentElement).getPropertyValue("--font-size-small").trim() ||
        cs.fontSize;
      const textSpan = document.createElement("span");
      const btn = document.createElement("span");
      btn.textContent = "... Read More";
      btn.style.cssText = [
        "display:inline",
        "white-space:nowrap",
        "font-weight:600",
        `font-size:${small}`,
        "padding-right:1.15em",
      ].join(";");

      probe.append(textSpan, btn);
      document.body.appendChild(probe);

      textSpan.textContent = source;
      const fits = probe.scrollHeight <= maxH;
      if (fits) {
        setOverflows((prev) => (prev ? false : prev));
        setPreview((prev) => (prev === source ? prev : source));
        probe.remove();
        return;
      }

      setOverflows((prev) => (prev ? prev : true));
      if (expanded) {
        probe.remove();
        return;
      }

      let lo = 0;
      let hi = source.length;
      let best = 0;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        textSpan.textContent = source.slice(0, mid);
        if (probe.scrollHeight <= maxH) {
          best = mid;
          lo = mid + 1;
        } else {
          hi = mid - 1;
        }
      }

      const next = source.slice(0, snapToWord(source, best)).trimEnd();
      setPreview((prev) => (prev === next ? prev : next));
      probe.remove();
    };

    measure();
    const frame = window.requestAnimationFrame(measure);
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    window.addEventListener("resize", measure);

    return () => {
      window.cancelAnimationFrame(frame);
      ro?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [text, expanded, lines]);

  return { ref, overflows, preview };
}
