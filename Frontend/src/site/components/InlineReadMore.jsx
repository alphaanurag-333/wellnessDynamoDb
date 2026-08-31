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

  return (
    <Tag ref={ref} className={`rm-flow ${className}`.trim()}>
      <span className="rm-flow__text">{visible}{showToggle && expanded ? " " : ""}</span>{showToggle ? (
        <button
          type="button"
          className="rm-flow__btn"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onToggle?.();
          }}
          aria-expanded={expanded}
        >
          {expanded ? "Read Less" : "... Read More"}
          {expanded ? <ArrowUpRight size={14} aria-hidden /> : <ArrowRight size={14} aria-hidden />}
        </button>
      ) : null}
    </Tag>
  );
}
