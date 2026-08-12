export function ConfirmDialog({
  open,
  tag,
  title,
  body,
  cancelLabel = "Cancel",
  confirmLabel,
  onCancel,
  onConfirm,
}) {
  if (!open) return null;

  return (
    <div className="ua-team-modal-backdrop ua-team-modal-backdrop--stack" onClick={onCancel} role="presentation">
      <div
        className="ua-confirm-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="confirm-dialog-title"
      >
        {tag ? <div className="ua-confirm-dialog__tag">{tag}</div> : null}
        <div id="confirm-dialog-title" className="ua-confirm-dialog__title">{title}</div>
        {body ? <p className="ua-confirm-dialog__body">{body}</p> : null}
        <div className="ua-confirm-dialog__actions">
          <button type="button" className="ua-confirm-dialog__cancel" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className="ua-confirm-dialog__confirm" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
