import WellnesspediaModal from "./WellnesspediaModal.jsx";

export default function DisorderDetailModal({ open, onClose, item }) {
  if (!open || !item) return null;

  const typeLabel = item.type
    ? String(item.type).charAt(0).toUpperCase() + String(item.type).slice(1)
    : "";

  return (
    <WellnesspediaModal
      open={open}
      onClose={onClose}
      className="wp-disorder-modal"
    >
      <div
        className="wp-disorder-modal__shell"
        style={{ "--disorder-accent": item.accent || "#F97316" }}
      >
        {/* <div className="wp-disorder-modal__accent" aria-hidden /> */}

        <div className="wp-disorder-modal__content">
          <header className="wp-disorder-modal__header">
            {typeLabel ? (
              <span className="wp-disorder-modal__badge">{typeLabel}</span>
            ) : null}
            <h3 id="wp-disorder-modal-title" className="wp-disorder-modal__title">
              {item.title}
            </h3>
          </header>

          {item.description ? (
            <section className="wp-disorder-modal__section" aria-label="Overview">
              <p className="wp-disorder-modal__label">Overview</p>
              <p className="wp-disorder-modal__desc" style={{textAlign: "justify"}}>{item.description}</p>
            </section>
          ) : null}

          {item.symptoms?.length ? (
            <section
              className="wp-disorder-modal__section"
              aria-label="Clinical symptoms"
            >
              <p className="wp-disorder-modal__label">Clinical Symptoms</p>
              <ul className="wp-disorder-modal__list">
                {item.symptoms.map((symptom, index) => (
                  <li key={`${item.id}-full-${index}`}>
                    <span className="wp-disorder-modal__bullet" aria-hidden />
                    <span>{symptom}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : !item.description ? (
            <p className="wp-disorder-modal__empty">Details coming soon.</p>
          ) : null}
        </div>
      </div>
    </WellnesspediaModal>
  );
}
