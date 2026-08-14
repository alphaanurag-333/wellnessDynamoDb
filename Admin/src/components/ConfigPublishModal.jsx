import { useEffect } from "react";

function publishBody(item) {
  if (item.app && item.web) {
    return "Every change on this page goes live to the app and web immediately.";
  }
  if (item.web) {
    return "Every change on this page goes live to the website immediately.";
  }
  return "Every change on this page goes live to the app immediately.";
}

export function ConfigPublishModal({ open, onClose, onConfirm, item }) {
  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || !item) return null;

  return (
    <div className="ua-cp-modal-backdrop ua-cp-modal-backdrop--drawer" onClick={onClose} role="presentation">
      <div
        className="ua-cp-ex-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-labelledby="cfg-publish-title"
      >
        <p className="ua-cp-ex-modal__eyebrow">Confirm this action</p>
        <h3 id="cfg-publish-title" className="ua-cp-ex-modal__title">
          Publish {item.name}?
        </h3>
        <p className="ua-cp-ex-modal__body">{publishBody(item)}</p>
        <div className="ua-cp-ex-modal__foot">
          <button type="button" className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="ua-cp-btn ua-cp-btn--primary ua-cp-btn--sm"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            Yes, publish
          </button>
        </div>
      </div>
    </div>
  );
}
