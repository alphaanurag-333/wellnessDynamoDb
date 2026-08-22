export function ConfirmDialog({
  open,
  tag,
  title,
  body,
  cancelLabel = "Cancel",
  confirmLabel,
  confirmTone = "primary",
  onCancel,
  onConfirm,
}) {
  if (!open) return null;

  return (
    <div className="ua-cp-modal-backdrop ua-confirm-backdrop" onClick={onCancel} role="presentation">
      <div
        className="ua-confirm-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="confirm-dialog-title"
      >
        {tag ? <div className="ua-confirm-dialog__tag">{tag}</div> : null}
        <div id="confirm-dialog-title" className="ua-confirm-dialog__title">{title}</div>
        {body ? <div className="ua-confirm-dialog__body">{body}</div> : null}
        <div className="ua-confirm-dialog__actions">
          <button type="button" className="ua-cfg-btn ua-cfg-btn--outline" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`ua-cfg-btn${confirmTone === "danger" ? " ua-cfg-btn--danger" : " ua-cfg-btn--primary"}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
