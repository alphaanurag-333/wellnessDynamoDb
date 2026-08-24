function ClientTableHead() {
  return (
    <div className="ua-prog-cat-modal__table-head">
      <div>Client</div>
      <div>Wellness coach</div>
      <div>Assistant WC</div>
    </div>
  );
}

function ClientRow({ row, onOpen }) {
  return (
    <button type="button" className="ua-prog-cat-modal__row" onClick={() => onOpen(row)}>
      <span className="ua-prog-cat-modal__client">{row.name}</span>
      <span className="ua-prog-cat-modal__staff">{row.coach}</span>
      <span className="ua-prog-cat-modal__staff">{row.awc}</span>
    </button>
  );
}

function isImageIcon(icon) {
  const value = String(icon || "").trim();
  return /^(https?:|blob:|data:|\/)/i.test(value);
}

function HeadIcon({ icon }) {
  const value = String(icon || "").trim();
  if (isImageIcon(value)) {
    return <img src={value} alt="" />;
  }
  if (!value || value.length > 24) return "👥";
  return value;
}

export function ProgramCategoryModal({ open, program, onClose, onOpenClient }) {
  if (!open || !program) return null;

  const rows = program.rows ?? [];
  const total = rows.length;
  const registeredToday = Boolean(program.registeredToday || program.enrolledToday);
  const subtitle = registeredToday
    ? `${total} client${total === 1 ? "" : "s"} registered today · tap a row to open their profile`
    : `${total} client${total === 1 ? "" : "s"} registered · tap a row to open their profile`;
  const hasGroups = Array.isArray(program.groups) && program.groups.length > 0;

  return (
    <div className="ua-team-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="ua-team-modal ua-prog-cat-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="prog-cat-modal-title"
      >
        <div className="ua-team-modal__head">
          <span className="ua-team-modal__head-icon" aria-hidden="true">
            <HeadIcon icon={program.icon} />
          </span>
          <div className="ua-team-modal__head-copy">
            <div id="prog-cat-modal-title" className="ua-team-modal__title">{program.label}</div>
            <div className="ua-team-modal__sub">{subtitle}</div>
          </div>
          <button type="button" className="ua-team-modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="ua-prog-cat-modal__body">
          {hasGroups ? (
            program.groups.map((group) => (
              <div key={group.title} className="ua-prog-cat-modal__group">
                <div className="ua-prog-cat-modal__group-bar">
                  <div className="ua-prog-cat-modal__group-copy">
                    <span className="ua-prog-cat-modal__group-title">{group.title}</span>
                    <span className="ua-prog-cat-modal__group-price">
                      {group.price} · {group.note}
                    </span>
                  </div>
                  <span className="ua-prog-cat-modal__group-count">
                    {group.rows.length} client{group.rows.length === 1 ? "" : "s"}
                  </span>
                </div>
                <ClientTableHead />
                {group.rows.map((row) => (
                  <ClientRow key={row.userId || row.name} row={row} onOpen={onOpenClient} />
                ))}
              </div>
            ))
          ) : total === 0 ? (
            <div className="ua-prog-cat-modal__empty">
              {registeredToday
                ? "No users registered today yet."
                : "No clients registered for this health concern yet."}
            </div>
          ) : (
            <>
              <ClientTableHead />
              {rows.map((row) => (
                <ClientRow key={row.userId || row.name} row={row} onOpen={onOpenClient} />
              ))}
            </>
          )}
        </div>

        <div className="ua-team-modal__foot">
          <button type="button" className="ua-team-modal__close-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
