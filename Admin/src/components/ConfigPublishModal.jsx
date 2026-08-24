import { useEffect, useState } from "react";
import { CONFIG_LEGAL_PUBLISH_SLUGS } from "../api/legalPageApi.js";

const DEFERRED_PUBLISH_CONFIGS = new Set([
  ...Object.keys(CONFIG_LEGAL_PUBLISH_SLUGS),
  "web-fs-social",
]);

function publishBody(item) {
  if (DEFERRED_PUBLISH_CONFIGS.has(item.id)) {
    return "Your local edits will be saved and go live on the website and app. Refreshing the page before publish will discard unsaved changes.";
  }
  if (item.app && item.web) {
    return "Every change on this page goes live to the app and web immediately.";
  }
  if (item.web) {
    return "Every change on this page goes live to the website immediately.";
  }
  return "Every change on this page goes live to the app immediately.";
}

export function ConfigPublishModal({ open, onClose, onConfirm, item }) {
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "Escape" && !publishing) onClose();
    }
    if (open) document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, publishing]);

  useEffect(() => {
    if (!open) setPublishing(false);
  }, [open]);

  if (!open || !item) return null;

  async function handleConfirm() {
    if (publishing) return;
    setPublishing(true);
    try {
      await onConfirm?.();
      onClose();
    } catch {
      /* parent shows toast */
    } finally {
      setPublishing(false);
    }
  }

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
          <button
            type="button"
            className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm"
            onClick={onClose}
            disabled={publishing}
          >
            Cancel
          </button>
          <button
            type="button"
            className="ua-cp-btn ua-cp-btn--primary ua-cp-btn--sm"
            onClick={handleConfirm}
            disabled={publishing}
          >
            {publishing ? "Publishing…" : "Yes, publish"}
          </button>
        </div>
      </div>
    </div>
  );
}
