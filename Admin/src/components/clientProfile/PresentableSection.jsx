import { useEffect, useState } from "react";
import {
  COMMITMENT_LETTER,
  PHOTO_REQUEST_TYPES,
  SUBMITTED_PHOTOS,
} from "../../data/presentableData.js";

function ConfirmModal({ open, eyebrow, title, body, confirmLabel, confirmTone = "primary", onClose, onConfirm }) {
  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="ua-cp-modal-backdrop ua-cp-modal-backdrop--drawer" onClick={onClose} role="presentation">
      <div className="ua-cp-present-modal ua-cp-present-modal--confirm" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="present-confirm-title">
        <p className={`ua-cp-present-modal__eyebrow ua-cp-present-modal__eyebrow--${confirmTone}`}>{eyebrow}</p>
        <h3 id="present-confirm-title" className="ua-cp-present-modal__title">{title}</h3>
        {body ? <p className="ua-cp-present-modal__body">{body}</p> : null}
        <div className="ua-cp-present-modal__foot">
          <button type="button" className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className={`ua-cp-btn ua-cp-btn--sm${confirmTone === "danger" ? " ua-cp-present-modal__confirm--danger" : " ua-cp-btn--primary"}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function CommitmentLetterModal({ open, user, onClose, onToast }) {
  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const name = user?.name || "Client";
  const paragraphs = COMMITMENT_LETTER.paragraphs.map((p) => p.replace("{name}", name));

  return (
    <div className="ua-cp-modal-backdrop ua-cp-modal-backdrop--drawer" onClick={onClose} role="presentation">
      <div className="ua-cp-present-modal ua-cp-present-modal--letter" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="commitment-letter-title">
        <div className="ua-cp-present-letter__head">
          <div className="ua-cp-present-letter__head-copy">
            <h3 id="commitment-letter-title" className="ua-cp-present-letter__title">Commitment letter</h3>
            <p className="ua-cp-present-letter__meta">
              Signed by {name} on {COMMITMENT_LETTER.signedDate} · {COMMITMENT_LETTER.sizeLabel}
            </p>
          </div>
          <div className="ua-cp-present-letter__head-actions">
            <button type="button" className="ua-cp-btn ua-cp-btn--primary ua-cp-btn--sm" onClick={() => onToast?.("PDF download started")}>
              Download PDF
            </button>
            <button type="button" className="ua-cp-present-letter__close" onClick={onClose} aria-label="Close">×</button>
          </div>
        </div>
        <div className="ua-cp-present-letter__doc">
          <div className="ua-cp-present-letter__brand">
            <span className="ua-cp-present-letter__logo">IR</span>
            <div>
              <strong>INDIA</strong>
              <span>REDEFINING WELLNESS</span>
            </div>
          </div>
          <hr className="ua-cp-present-letter__rule" />
          <h4 className="ua-cp-present-letter__heading">My commitment</h4>
          {paragraphs.map((paragraph) => (
            <p key={paragraph.slice(0, 24)} className="ua-cp-present-letter__para">{paragraph}</p>
          ))}
          <div className="ua-cp-present-letter__signatures">
            <div className="ua-cp-present-letter__sign-block">
              <span className="ua-cp-present-letter__sign-name">{name}</span>
              <span className="ua-cp-present-letter__sign-line" aria-hidden="true" />
              <span className="ua-cp-present-letter__sign-label">Client signature</span>
            </div>
            <div className="ua-cp-present-letter__sign-block ua-cp-present-letter__sign-block--date">
              <span className="ua-cp-present-letter__sign-date">{COMMITMENT_LETTER.signedDate}</span>
              <span className="ua-cp-present-letter__sign-line" aria-hidden="true" />
              <span className="ua-cp-present-letter__sign-label">Signed on</span>
            </div>
          </div>
          <p className="ua-cp-present-letter__footnote">
            Signed in app · IP {COMMITMENT_LETTER.ip} · Document {COMMITMENT_LETTER.documentId}
          </p>
        </div>
      </div>
    </div>
  );
}

function RequestPhotoModal({ open, onClose, onConfirm }) {
  const [selected, setSelected] = useState(PHOTO_REQUEST_TYPES[0]);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="ua-cp-modal-backdrop ua-cp-modal-backdrop--drawer" onClick={onClose} role="presentation">
      <div className="ua-cp-present-modal ua-cp-present-modal--request" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="request-photo-title">
        <h3 id="request-photo-title" className="ua-cp-present-modal__title">Request a photo</h3>
        <p className="ua-cp-present-modal__body">Choose the pose or photo type to request from the client&apos;s app.</p>
        <label className="ua-cp-present-request__field">
          Photo type
          <select value={selected} onChange={(e) => setSelected(e.target.value)}>
            {PHOTO_REQUEST_TYPES.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </label>
        <div className="ua-cp-present-modal__foot">
          <button type="button" className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm" onClick={onClose}>Cancel</button>
          <button type="button" className="ua-cp-btn ua-cp-btn--primary ua-cp-btn--sm" onClick={() => onConfirm(selected)}>Send request</button>
        </div>
      </div>
    </div>
  );
}

function PhotoCard({ photo, onApprove, onReject, onToast }) {
  const pending = photo.status === "pending";

  return (
    <article className="ua-cp-present-photo">
      <div className="ua-cp-present-photo__preview" aria-hidden="true">
        <span>🖼</span>
        <span>Photo preview</span>
      </div>
      <div className="ua-cp-present-photo__body">
        <div className="ua-cp-present-photo__meta">
          <strong>{photo.label}</strong>
          <span className={`ua-cp-present-status ua-cp-present-status--${photo.status}`}>
            {pending ? "PENDING REVIEW" : "APPROVED"}
          </span>
          <span className="ua-cp-present-photo__date">Uploaded {photo.uploaded}</span>
        </div>
        <div className="ua-cp-present-photo__foot">
          <button type="button" className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm" onClick={() => onToast?.("Download started")}>
            Download
          </button>
          <div className="ua-cp-present-photo__actions">
            {pending ? (
              <>
                <button type="button" className="ua-cp-btn ua-cp-btn--green ua-cp-btn--sm" onClick={onApprove}>Approve</button>
                <button type="button" className="ua-cp-btn ua-cp-present-btn--reject ua-cp-btn--sm" onClick={onReject}>Reject</button>
              </>
            ) : (
              <span className="ua-cp-present-photo__locked">Decision locked</span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export function PresentableSection({ user, onToast }) {
  const [featureEnabled, setFeatureEnabled] = useState(true);
  const [photos, setPhotos] = useState(SUBMITTED_PHOTOS);
  const [letterOpen, setLetterOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);

  const pendingCount = photos.filter((photo) => photo.status === "pending").length;
  const clientName = user?.name?.split(" ")[0] || "Client";

  function approvePhoto(id) {
    setPhotos((list) => list.map((photo) => (photo.id === id ? { ...photo, status: "approved" } : photo)));
    onToast?.("Photo approved");
    setConfirmTarget(null);
  }

  function rejectPhoto(id) {
    setPhotos((list) => list.filter((photo) => photo.id !== id));
    onToast?.("Photo rejected");
    setConfirmTarget(null);
  }

  return (
    <div className="ua-cp-section ua-cp-present">
      <div className="ua-cp-present__head">
        <div>
          <h2 className="ua-cp-present__title">Presentable pics</h2>
          <p className="ua-cp-present__sub">Approve client photos for testimonials and marketing. Rejections are final.</p>
        </div>
        <button type="button" className="ua-cp-btn ua-cp-btn--primary ua-cp-present__request" onClick={() => setRequestOpen(true)}>
          🔔 Request a photo
        </button>
      </div>

      <div className="ua-cp-present-stack">
        <div className="ua-cp-present-panel">
          <div className="ua-cp-present-panel__row">
            <div className="ua-cp-present-panel__copy">
              <strong>Presentable pics feature</strong>
              <p>
                {featureEnabled
                  ? "Enabled in app — client can upload photos for your review."
                  : "Disabled in app — client cannot upload new presentable photos."}
              </p>
            </div>
            <button
              type="button"
              className={`ua-toggle${featureEnabled ? " ua-toggle--on" : ""}`}
              onClick={() => setFeatureEnabled((enabled) => !enabled)}
              aria-pressed={featureEnabled}
              aria-label="Toggle presentable pics feature"
            >
              <span className="ua-toggle__knob" />
            </button>
          </div>
        </div>

        {!featureEnabled ? (
          <div className="ua-cp-present-panel ua-cp-present-panel--empty">
            <strong>Feature disabled</strong>
            <p>Turn on the toggle above to let this client upload presentable photos in the app.</p>
          </div>
        ) : null}

        <div className="ua-cp-present-panel ua-cp-present-panel--letter">
          <div className="ua-cp-present-letter-card">
            <div className="ua-cp-present-letter-card__main">
              <span className="ua-cp-present-letter-card__icon" aria-hidden="true">✓</span>
              <div>
                <div className="ua-cp-present-letter-card__title-row">
                  <strong>Commitment letter</strong>
                  <span className="ua-cp-present-letter-card__badge">SIGNED</span>
                </div>
                <p>Signed by {user?.name || "Client"} on {COMMITMENT_LETTER.signedDate}</p>
              </div>
            </div>
            <div className="ua-cp-present-letter-card__actions">
              <button type="button" className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm" onClick={() => setLetterOpen(true)}>View letter</button>
              <button type="button" className="ua-cp-btn ua-cp-btn--primary ua-cp-btn--sm" onClick={() => onToast?.("PDF download started")}>Download PDF</button>
            </div>
          </div>
        </div>

        {featureEnabled ? (
          <div className="ua-cp-present-photos">
            <div className="ua-cp-present-photos__head">
              <span className="ua-cp-present-photos__label">Submitted photos</span>
              {pendingCount > 0 ? (
                <span className="ua-cp-present-photos__pending">{pendingCount} pending</span>
              ) : null}
            </div>
            <div className="ua-cp-present-photos__grid">
              {photos.map((photo) => (
                <PhotoCard
                  key={photo.id}
                  photo={photo}
                  onToast={onToast}
                  onApprove={() => setConfirmTarget({ type: "approve", photo })}
                  onReject={() => setConfirmTarget({ type: "reject", photo })}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <ConfirmModal
        open={confirmTarget?.type === "approve"}
        eyebrow="This decision is final"
        title="Approve this photo for use?"
        body={`Once approved, “${confirmTarget?.photo?.label}” can be used in testimonials and marketing. This decision is permanent.`}
        confirmLabel="Yes, approve it"
        onClose={() => setConfirmTarget(null)}
        onConfirm={() => approvePhoto(confirmTarget.photo.id)}
      />

      <ConfirmModal
        open={confirmTarget?.type === "reject"}
        eyebrow="This decision is final"
        title="Reject this photo?"
        body={`“${confirmTarget?.photo?.label}” will be removed from review. The client will need to upload again if requested.`}
        confirmLabel="Yes, reject it"
        confirmTone="danger"
        onClose={() => setConfirmTarget(null)}
        onConfirm={() => rejectPhoto(confirmTarget.photo.id)}
      />

      <CommitmentLetterModal
        open={letterOpen}
        user={user}
        onClose={() => setLetterOpen(false)}
        onToast={onToast}
      />

      <RequestPhotoModal
        open={requestOpen}
        onClose={() => setRequestOpen(false)}
        onConfirm={(type) => {
          setRequestOpen(false);
          onToast?.(`Photo request sent to ${clientName}: ${type}`);
        }}
      />
    </div>
  );
}
