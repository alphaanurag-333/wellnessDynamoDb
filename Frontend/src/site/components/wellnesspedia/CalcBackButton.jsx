import { ArrowLeft } from "lucide-react";

export default function CalcBackButton({ onClick, label = "Back" }) {
  return (
    <button type="button" className="wp-calc-back" onClick={onClick} aria-label={label}>
      <span className="wp-calc-back__icon" aria-hidden="true">
        <ArrowLeft size={16} strokeWidth={2.6} />
      </span>
      <span className="wp-calc-back__copy">
        <span className="wp-calc-back__label">{label}</span>
        <span className="wp-calc-back__hint">Edit your inputs</span>
      </span>
    </button>
  );
}
