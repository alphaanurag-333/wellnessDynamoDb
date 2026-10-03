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

const MAX_EXTRA_TRIM_WORDS = 20;

/**
 * Counts the line boxes actually occupied by the element's content.
 * Uses client rects instead of the element height, which may include a CSS `min-height`.
 */
function renderedLineCount(el, lineHeight) {
  const range = document.createRange();
  range.selectNodeContents(el);
  const rects = Array.from(range.getClientRects()).filter((rect) => rect.width > 0 && rect.height > 0);
  range.detach?.();
  if (rects.length === 0) return 0;

  const box = el.getBoundingClientRect();
  const scale = el.offsetHeight > 0 && box.height > 0 ? box.height / el.offsetHeight : 1;
  const tolerance = (lineHeight * scale) / 2;
  const centers = rects.map((rect) => (rect.top + rect.bottom) / 2).sort((a, b) => a - b);

  let count = 1;
  let lineStart = centers[0];
  for (let i = 1; i < centers.length; i += 1) {
    if (centers[i] - lineStart > tolerance) {
      count += 1;
      lineStart = centers[i];
    }
  }
  return count;
}

function snapToWord(source, index) {
  if (index >= source.length) return source.length;
  const snapped = source.lastIndexOf(" ", index);
  if (snapped < 8) return index;
  return snapped;
}

/**
 * Truncates `text` so the preview, its ellipsis and an inline "Read More"
 * fit within `lines` lines.
 */
export function useInlineTruncate(text, expanded, lines = 3) {
  const ref = useRef(null);
  const [overflows, setOverflows] = useState(false);
  const [preview, setPreview] = useState(() => String(text || ""));
  const measureRef = useRef(null);
  // Words dropped beyond the probe result when the real element still wraps past `lines`.
  const extraTrimRef = useRef({ width: 0, words: 0 });

  useLayoutEffect(() => {
    const el = ref.current;
    const source = String(text || "");
    if (!el) return undefined;
    extraTrimRef.current = { width: 0, words: 0 };

    const measure = () => {
      const width = el.clientWidth;
      if (extraTrimRef.current.width !== width) {
        extraTrimRef.current = { width, words: 0 };
      }
      if (!width || !source) {
        setOverflows(false);
        setPreview(source);
        return;
      }

      const cs = getComputedStyle(el);
      const lh = lineHeightPx(cs);
      const maxH = lh * lines + 2;
      const probe = document.createElement("p");
      probe.style.cssText = [
        "position:fixed",
        "left:-9999px",
        "top:0",
        "visibility:hidden",
        "pointer-events:none",
        `width:${Math.max(0, width - 1)}px`,
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
      const btn = document.createElement("span");
      btn.textContent = "Read More";
      // Mirrors .rm-flow__btn: inline after the text, 14px icon + 4px gap + 4px icon margin.
      btn.style.cssText = [
        "display:inline-block",
        "white-space:nowrap",
        "font-weight:600",
        `font-size:${small}`,
        "margin-left:6px",
        "padding-right:22px",
      ].join(";");
      const textSpan = document.createElement("span");
      probe.append(textSpan);
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

      probe.append(btn);

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

      let end = snapToWord(source, best);
      const paint = (index) => {
        const slice = index > 0 ? source.slice(0, index).trimEnd() : "";
        textSpan.textContent = slice ? `${slice}\u2026` : "\u2026";
      };
      paint(end);
      let guard = 0;
      while (probe.scrollHeight > maxH && end > 0 && guard < 12) {
        const prevSpace = source.lastIndexOf(" ", Math.max(0, end - 1));
        end = prevSpace > 0 ? prevSpace : 0;
        paint(end);
        guard += 1;
      }

      for (let i = 0; i < extraTrimRef.current.words && end > 0; i += 1) {
        const prevSpace = source.lastIndexOf(" ", Math.max(0, end - 1));
        end = prevSpace > 0 ? prevSpace : 0;
      }

      const next = end > 0 ? source.slice(0, end).trimEnd() : "";
      setPreview((prev) => (prev === next ? prev : next));
      probe.remove();
    };

    measureRef.current = measure;
    measure();
    const frame = window.requestAnimationFrame(measure);
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    window.addEventListener("resize", measure);
    const fonts = typeof document !== "undefined" ? document.fonts : null;
    fonts?.addEventListener?.("loadingdone", measure);
    let active = true;
    fonts?.ready?.then(() => {
      if (active) measure();
    });

    return () => {
      active = false;
      window.cancelAnimationFrame(frame);
      ro?.disconnect();
      window.removeEventListener("resize", measure);
      fonts?.removeEventListener?.("loadingdone", measure);
      if (measureRef.current === measure) measureRef.current = null;
    };
  }, [text, expanded, lines]);

  // The off-screen probe can disagree with the live element by a few pixels
  // (font swap, sub-pixel rounding), letting the preview spill onto an extra line.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || expanded || !overflows || !preview) return;
    if (renderedLineCount(el, lineHeightPx(getComputedStyle(el))) <= lines) return;
    const trim = extraTrimRef.current;
    if (trim.words >= MAX_EXTRA_TRIM_WORDS) return;
    trim.words += 1;
    measureRef.current?.();
  }, [preview, overflows, expanded, lines]);

  return { ref, overflows, preview };
}
