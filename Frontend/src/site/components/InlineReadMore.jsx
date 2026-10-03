import { ArrowRight, ArrowUpRight } from "lucide-react";
import { useInlineTruncate } from "../hooks/useInlineTruncate.js";

export default function InlineReadMore({
  text,
  expanded,
  onToggle,
  lines = 3,
  className = "",
  forceToggle = false,
  as: Tag = "p",
}) {
  const source = String(text || "");
  const { ref, overflows, preview } = useInlineTruncate(source, expanded, lines);
  const showToggle = overflows || expanded || forceToggle;
  const visible = expanded || !overflows ? source : preview;

  if (!source) return null;

  const clamped = showToggle && !expanded;

  return (
    <Tag
      ref={ref}
      className={`jsty rm-flow${clamped ? " rm-flow--clamp" : ""}${expanded ? " is-expanded" : ""} ${className}`.trim()}
      style={{ "--rm-lines": lines }}
    >
      {clamped ? (
        <button
          type="button"
          className="rm-flow__btn"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onToggle?.();
          }}
          aria-expanded={false}
        >
          <span className="rm-flow__label">Read More</span>
          <ArrowRight size={14} aria-hidden />
        </button>
      ) : null}
      <span className="rm-flow__text">
        {visible}
        {clamped ? "\u2026" : ""}
        {showToggle && expanded ? " " : ""}
      </span>
      {showToggle && expanded ? (
        <button
          type="button"
          className="rm-flow__btn"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onToggle?.();
          }}
          aria-expanded
        >
          <span className="rm-flow__label">Read Less</span>
          <ArrowUpRight size={14} aria-hidden />
        </button>
      ) : null}
    </Tag>
  );
}
