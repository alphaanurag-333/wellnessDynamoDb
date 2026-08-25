import { useEffect, useState } from "react";
import { X } from "lucide-react";

export default function WellnesspediaModal({
  open,
  onClose,
  title,
  description,
  children,
  className = "",
  wide = false,
  showInfo = false,
  infoContent = null,
  infoLabel = "Calculator reference",
}) {
  const [infoOpen, setInfoOpen] = useState(false);
  const canShowInfo = Boolean(showInfo && infoContent);

  useEffect(() => {
    if (!open) setInfoOpen(false);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (infoOpen) {
        e.stopPropagation();
        setInfoOpen(false);
        return;
      }
      onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, infoOpen]);

  if (!open) return null;

  return (
    <div
      className="wp-modal-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        className={`wp-modal ${wide ? "wp-modal--wide" : ""} ${infoOpen ? "is-info-open" : ""} ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "wp-modal-title" : undefined}
      >
        <button
          type="button"
          className="wp-modal__close"
          aria-label="Close"
          onClick={onClose}
        >
          <X size={18} strokeWidth={2.5} />
        </button>

        {(title || description) && (
          <header className="wp-modal__header">
            {title ? (
              <h2 id="wp-modal-title" className="wp-modal__title">
                {title}
                {canShowInfo ? (
                  <button
                    type="button"
                    className={`wp-modal__info${infoOpen ? " is-open" : ""}`}
                    aria-label={infoOpen ? `Hide ${infoLabel}` : `Show ${infoLabel}`}
                    aria-expanded={infoOpen}
                    aria-controls="wp-calc-info-panel"
                    onClick={() => setInfoOpen((prev) => !prev)}
                  >
                    i
                  </button>
                ) : null}
              </h2>
            ) : null}
            {description ? <p className="wp-modal__desc">{description}</p> : null}
          </header>
        )}

        <div className="wp-modal__body">
          {children}
          {canShowInfo && infoOpen ? (
            <div className="wp-calc-info" id="wp-calc-info-panel">
              <button
                type="button"
                className="wp-calc-info__backdrop"
                aria-label="Close reference"
                onClick={() => setInfoOpen(false)}
              />
              <div className="wp-calc-info__card" role="dialog" aria-label={infoLabel}>
                <button
                  type="button"
                  className="wp-calc-info__close"
                  aria-label="Close reference"
                  onClick={() => setInfoOpen(false)}
                >
                  <X size={14} strokeWidth={2.5} />
                </button>
                {infoContent}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
