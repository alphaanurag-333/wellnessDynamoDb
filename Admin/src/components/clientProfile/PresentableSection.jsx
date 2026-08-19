import { useEffect, useState } from "react";
import { PHOTO_REQUEST_TYPES } from "../../data/presentableData.js";
import {
  fetchUserCommitmentLetter,
  reviewUserCommitmentLetter,
  reviewUserPresentablePic,
  requestUserPresentablePic,
  patchUserPresentablePicsSettings,
} from "../../api/onboardingApi.js";
import { fetchUser } from "../../api/usersApi.js";

function isLiveUserId(userId) {
  const raw = String(userId || "").trim();
  return Boolean(raw) && !/^\d+$/.test(raw);
}

function formatLetterDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function letterStatusMeta(letter) {
  const status = String(letter?.approvalStatus || "").toLowerCase();
  if (status === "approved") {
    return { label: "APPROVED", tone: "approved", icon: "✓" };
  }
  if (status === "rejected") {
    return { label: "REJECTED", tone: "rejected", icon: "✕" };
  }
  if (letter) {
    return { label: "PENDING APPROVAL", tone: "pending", icon: "…" };
  }
  return { label: "NOT SUBMITTED", tone: "empty", icon: "—" };
}

function openPdf(url, onToast) {
  if (!url) {
    onToast?.("No PDF file is attached");
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

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

function RejectLetterModal({ open, reason, onReasonChange, onClose, onConfirm, busy }) {
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
      <div className="ua-cp-present-modal ua-cp-present-modal--confirm" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="reject-letter-title">
        <p className="ua-cp-present-modal__eyebrow ua-cp-present-modal__eyebrow--danger">This decision is final</p>
        <h3 id="reject-letter-title" className="ua-cp-present-modal__title">Reject this commitment letter?</h3>
        <p className="ua-cp-present-modal__body">The client will be asked to upload a new signed copy. Add a reason they can see in the app.</p>
        <label className="ua-cp-present-request__field">
          Rejection reason
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder="e.g. Signature is missing or the scan is unreadable"
          />
        </label>
        <div className="ua-cp-present-modal__foot">
          <button type="button" className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm" onClick={onClose} disabled={busy}>Cancel</button>
          <button
            type="button"
            className="ua-cp-btn ua-cp-btn--sm ua-cp-present-modal__confirm--danger"
            onClick={onConfirm}
            disabled={busy || !reason.trim()}
          >
            {busy ? "Rejecting…" : "Yes, reject it"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CommitmentLetterModal({ open, user, letter, onClose, onToast }) {
  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const name = user?.name || "Client";
  const pdfUrl = letter?.pdfUrl || "";
  const status = letterStatusMeta(letter);
  const submitted = formatLetterDate(letter?.updatedAt || letter?.createdAt);

  return (
    <div className="ua-cp-modal-backdrop ua-cp-modal-backdrop--drawer" onClick={onClose} role="presentation">
      <div className="ua-cp-present-modal ua-cp-present-modal--letter" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="commitment-letter-title">
        <div className="ua-cp-present-letter__head">
          <div className="ua-cp-present-letter__head-copy">
            <h3 id="commitment-letter-title" className="ua-cp-present-letter__title">Commitment letter</h3>
            <p className="ua-cp-present-letter__meta">
              {letter
                ? `${status.label} · uploaded by ${name}${submitted ? ` on ${submitted}` : ""}`
                : "No signed letter has been uploaded yet"}
            </p>
          </div>
          <div className="ua-cp-present-letter__head-actions">
            {pdfUrl ? (
              <button type="button" className="ua-cp-btn ua-cp-btn--primary ua-cp-btn--sm" onClick={() => openPdf(pdfUrl, onToast)}>
                Open PDF
              </button>
            ) : null}
            <button type="button" className="ua-cp-present-letter__close" onClick={onClose} aria-label="Close">×</button>
          </div>
        </div>
        {pdfUrl ? (
          <iframe
            className="ua-cp-present-letter__frame"
            title="Commitment letter PDF"
            src={pdfUrl}
          />
        ) : (
          <div className="ua-cp-present-letter__empty">
            <strong>No PDF available</strong>
            <p>The client has not uploaded a signed commitment letter yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function PresentablePicViewModal({ open, url, label, onClose }) {
  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="ua-cp-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="ua-cp-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="presentable-view-title"
      >
        <div className="ua-cp-modal__head">
          <div className="ua-cp-modal__title" id="presentable-view-title">
            {label || "Presentable pic"}
          </div>
          <button
            type="button"
            className="ua-cp-modal__close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="ua-cp-modal__body" style={{ padding: 0 }}>
          <div style={{ padding: 14, display: "flex", justifyContent: "center" }}>
            <img
              src={url}
              alt={label || "Presentable pic"}
              style={{
                maxWidth: "100%",
                maxHeight: "70vh",
                objectFit: "contain",
                borderRadius: 12,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function RequestPhotoModal({ open, onClose, onConfirm, busy }) {
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
          <button type="button" className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" className="ua-cp-btn ua-cp-btn--primary ua-cp-btn--sm" onClick={() => onConfirm(selected)} disabled={busy}>
            {busy ? "Sending…" : "Send request"}
          </button>
        </div>
      </div>
    </div>
  );
}

function photoStatusMeta(status) {
  const value = String(status || "").toLowerCase();
  if (value === "approved") {
    return { label: "APPROVED", tone: "approved" };
  }
  if (value === "rejected") {
    return { label: "REJECTED", tone: "rejected" };
  }
  return { label: "PENDING APPROVAL", tone: "pending" };
}

function PhotoCard({ photo, onToast, onApprove, onReject, reviewBusy, onView }) {
  const status = photoStatusMeta(photo.status);
  const pending = photo?.reviewable !== false && status.tone === "pending";

  return (
    <article className="ua-cp-present-photo">
      <div className="ua-cp-present-photo__preview" aria-hidden="true">
        {photo.url ? (
          <img src={photo.url} alt="" className="ua-cp-present-photo__img" />
        ) : (
          <>
            <span>🖼</span>
            <span>Photo preview</span>
          </>
        )}
      </div>
      <div className="ua-cp-present-photo__body">
        <div className="ua-cp-present-photo__meta">
          <strong>{photo.label}</strong>
          <span className={`ua-cp-present-status ua-cp-present-status--${status.tone}`}>
            {status.label}
          </span>
          {photo.uploaded ? (
            <span className="ua-cp-present-photo__date">Uploaded {photo.uploaded}</span>
          ) : null}
        </div>
        <div className="ua-cp-present-photo__foot">
          {photo.url ? (
            <button
              type="button"
              className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm"
              onClick={() => onView?.(photo.url)}
            >
              View
            </button>
          ) : (
            <button
              type="button"
              className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm"
              onClick={() => onToast?.("No photo file attached")}
            >
              View
            </button>
          )}
          {pending ? (
            <div className="ua-cp-present-photo__actions">
              <button
                type="button"
                className="ua-cp-btn ua-cp-btn--green ua-cp-btn--sm"
                onClick={onApprove}
                disabled={reviewBusy}
              >
                Approve
              </button>
              <button
                type="button"
                className="ua-cp-btn ua-cp-present-btn--reject ua-cp-btn--sm"
                onClick={onReject}
                disabled={reviewBusy}
              >
                Reject
              </button>
            </div>
          ) : (
            <span className="ua-cp-present-photo__locked">Review complete</span>
          )}
        </div>
      </div>
    </article>
  );
}

export function PresentableSection({ user, onToast, onUserUpdated }) {
  const [featureEnabled, setFeatureEnabled] = useState(() => user?.presentablePicsEnabled !== false);
  const [letter, setLetter] = useState(null);
  const [letterLoading, setLetterLoading] = useState(() => isLiveUserId(user?.id));
  const [reviewBusy, setReviewBusy] = useState(false);
  const [letterOpen, setLetterOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [photoReviewBusy, setPhotoReviewBusy] = useState(false);
  const [requestBusy, setRequestBusy] = useState(false);
  const [settingsBusy, setSettingsBusy] = useState(false);

  const live = isLiveUserId(user?.id);
  const clientName = user?.name?.split(" ")[0] || "Client";
  const presentablePicStatus = user?.presentablePic
    ? String(user?.presentablePicStatus || "pending").toLowerCase()
    : "";
  const history = Array.isArray(user?.presentablePicHistory) ? user.presentablePicHistory : [];

  const historyPhotos = history.map((item, idx) => ({
    id: `presentable-history-${idx}`,
    label: "Presentable pic",
    url: item?.url,
    status: String(item?.status || "").toLowerCase(),
    uploaded: formatLetterDate(item?.uploadedAt || item?.reviewedAt || ""),
    // History items cannot be reviewed via the current review endpoint.
    reviewable: false,
  }));

  const currentPhoto = user?.presentablePic
    ? {
        id: "presentable-pic",
        label: "Presentable pic",
        url: user.presentablePic,
        status: presentablePicStatus,
        uploaded: formatLetterDate(
          user?.presentablePicUploadedAt || user.updatedAt || user.lastUpdated
        ),
        reviewable: true,
      }
    : null;

  const photos = currentPhoto ? [currentPhoto, ...historyPhotos] : historyPhotos;
  const status = letterStatusMeta(letter);
  const submittedLabel = formatLetterDate(letter?.updatedAt || letter?.createdAt);

  useEffect(() => {
    if (!live) {
      setLetter(null);
      setLetterLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLetterLoading(true);
    fetchUserCommitmentLetter(user.id)
      .then((row) => {
        if (!cancelled) setLetter(row || null);
      })
      .catch((err) => {
        if (cancelled) return;
        setLetter(null);
        onToast?.(err?.message || "Failed to load commitment letter");
      })
      .finally(() => {
        if (!cancelled) setLetterLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [live, onToast, user?.id]);

  useEffect(() => {
    setFeatureEnabled(user?.presentablePicsEnabled !== false);
  }, [user?.presentablePicsEnabled]);

  async function togglePresentablePicsFeature() {
    const next = !featureEnabled;
    if (!live) {
      setFeatureEnabled(next);
      return;
    }
    setSettingsBusy(true);
    try {
      await patchUserPresentablePicsSettings(user.id, { enabled: next });
      setFeatureEnabled(next);
      await refreshUser();
      onToast?.(
        next
          ? "Presentable pics enabled in the app"
          : "Presentable pics hidden in the app"
      );
    } catch (err) {
      onToast?.(err?.message || "Failed to update presentable pics setting");
    } finally {
      setSettingsBusy(false);
    }
  }

  async function refreshUser() {
    if (!live) return;
    try {
      const row = await fetchUser(user.id);
      if (row) onUserUpdated?.(row);
    } catch {
      // Letter review already succeeded; profile refresh is best-effort.
    }
  }

  async function approveLetter() {
    if (!letter?.id) return;
    setReviewBusy(true);
    try {
      const updated = await reviewUserCommitmentLetter(user.id, letter.id, { action: "approved" });
      setLetter(updated || { ...letter, approvalStatus: "approved" });
      await refreshUser();
      onToast?.("Commitment letter approved");
      setConfirmTarget(null);
    } catch (err) {
      onToast?.(err?.message || "Failed to approve commitment letter");
    } finally {
      setReviewBusy(false);
    }
  }

  async function rejectLetter() {
    const reason = rejectReason.trim();
    if (!letter?.id || !reason) return;
    setReviewBusy(true);
    try {
      const updated = await reviewUserCommitmentLetter(user.id, letter.id, {
        action: "rejected",
        rejectionReason: reason,
      });
      setLetter(updated || { ...letter, approvalStatus: "rejected", rejectionReason: reason });
      await refreshUser();
      onToast?.("Commitment letter rejected");
      setRejectOpen(false);
      setRejectReason("");
    } catch (err) {
      onToast?.(err?.message || "Failed to reject commitment letter");
    } finally {
      setReviewBusy(false);
    }
  }

  async function approvePresentablePic() {
    if (!live || !user?.presentablePic) return;
    setPhotoReviewBusy(true);
    try {
      await reviewUserPresentablePic(user.id, { action: "approved" });
      await refreshUser();
      onToast?.("Presentable pic approved");
      setConfirmTarget(null);
    } catch (err) {
      onToast?.(err?.message || "Failed to approve presentable pic");
    } finally {
      setPhotoReviewBusy(false);
    }
  }

  async function sendPhotoRequest(photoType) {
    if (!live) {
      setRequestOpen(false);
      onToast?.(`Photo request sent to ${clientName}: ${photoType}`);
      return;
    }
    setRequestBusy(true);
    try {
      await requestUserPresentablePic(user.id, { photoType });
      setRequestOpen(false);
      onToast?.(`Photo request sent to ${clientName}: ${photoType}`);
    } catch (err) {
      onToast?.(err?.message || "Failed to send photo request");
    } finally {
      setRequestBusy(false);
    }
  }

  async function rejectPresentablePic() {
    if (!live || !user?.presentablePic) return;
    setPhotoReviewBusy(true);
    try {
      await reviewUserPresentablePic(user.id, { action: "rejected" });
      await refreshUser();
      onToast?.("Presentable pic rejected");
      setConfirmTarget(null);
    } catch (err) {
      onToast?.(err?.message || "Failed to reject presentable pic");
    } finally {
      setPhotoReviewBusy(false);
    }
  }

  const pendingReview = String(letter?.approvalStatus || "").toLowerCase() === "pending";
  const [viewOpen, setViewOpen] = useState(false);
  const [viewUrl, setViewUrl] = useState("");
  const [viewLabel, setViewLabel] = useState("Presentable pic");

  function openView(url, label) {
    setViewUrl(url);
    setViewLabel(label || "Presentable pic");
    setViewOpen(true);
  }

  return (
    <div className="ua-cp-section ua-cp-present">
      <div className="ua-cp-present__head">
        <div>
          <h2 className="ua-cp-present__title">Presentable pics</h2>
          <p className="ua-cp-present__sub">Approve client photos for testimonials and marketing. Rejections are final.</p>
        </div>
        <button
          type="button"
          className="ua-cp-btn ua-cp-btn--primary ua-cp-present__request"
          onClick={() => setRequestOpen(true)}
          disabled={!featureEnabled}
        >
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
              onClick={togglePresentablePicsFeature}
              disabled={settingsBusy}
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
              <span
                className={`ua-cp-present-letter-card__icon ua-cp-present-letter-card__icon--${status.tone}`}
                aria-hidden="true"
              >
                {status.icon}
              </span>
              <div>
                <div className="ua-cp-present-letter-card__title-row">
                  <strong>Commitment letter</strong>
                  <span className={`ua-cp-present-letter-card__badge ua-cp-present-letter-card__badge--${status.tone}`}>
                    {letterLoading ? "LOADING" : status.label}
                  </span>
                </div>
                <p>
                  {letterLoading
                    ? "Loading uploaded letter…"
                    : letter
                      ? `${letter.approvalStatus === "rejected" && letter.rejectionReason
                        ? letter.rejectionReason
                        : `Uploaded by ${user?.name || "client"}`}${submittedLabel ? ` · ${submittedLabel}` : ""}`
                      : "No signed commitment letter uploaded yet"}
                </p>
              </div>
            </div>
            <div className="ua-cp-present-letter-card__actions">
              <button
                type="button"
                className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm"
                onClick={() => setLetterOpen(true)}
                disabled={letterLoading || !letter?.pdfUrl}
              >
                View letter
              </button>
              <button
                type="button"
                className="ua-cp-btn ua-cp-btn--primary ua-cp-btn--sm"
                onClick={() => openPdf(letter?.pdfUrl, onToast)}
                disabled={letterLoading || !letter?.pdfUrl}
              >
                Download PDF
              </button>
              {pendingReview ? (
                <>
                  <button
                    type="button"
                    className="ua-cp-btn ua-cp-btn--green ua-cp-btn--sm"
                    onClick={() => setConfirmTarget({ type: "approve-letter" })}
                    disabled={reviewBusy}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="ua-cp-btn ua-cp-present-btn--reject ua-cp-btn--sm"
                    onClick={() => setRejectOpen(true)}
                    disabled={reviewBusy}
                  >
                    Reject
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>

        {featureEnabled ? (
          <div className="ua-cp-present-photos">
            <div className="ua-cp-present-photos__head">
              <span className="ua-cp-present-photos__label">Submitted photos</span>
              {photos.length ? (
                <span className="ua-cp-present-photos__pending">{photos.length} uploaded</span>
              ) : null}
            </div>
            {photos.length ? (
              <div className="ua-cp-present-photos__grid">
                {photos.map((photo) => (
                  <PhotoCard
                    key={photo.id}
                    photo={photo}
                    onToast={onToast}
                    reviewBusy={photoReviewBusy}
                    onApprove={() => setConfirmTarget({ type: "approve-photo" })}
                    onReject={() => setConfirmTarget({ type: "reject-photo" })}
                    onView={() => openView(photo.url, photo.label)}
                  />
                ))}
              </div>
            ) : (
              <div className="ua-cp-present-panel ua-cp-present-panel--empty">
                <strong>No photos uploaded</strong>
                <p>When this client uploads a presentable photo in the app, it will appear here.</p>
              </div>
            )}
          </div>
        ) : null}
      </div>

      <ConfirmModal
        open={confirmTarget?.type === "approve-letter"}
        eyebrow="This decision is final"
        title="Approve this commitment letter?"
        body="Once approved, this onboarding step is marked complete for the client."
        confirmLabel={reviewBusy ? "Approving…" : "Yes, approve it"}
        onClose={() => !reviewBusy && setConfirmTarget(null)}
        onConfirm={approveLetter}
      />

      <ConfirmModal
        open={confirmTarget?.type === "approve-photo"}
        eyebrow="This decision is final"
        title="Approve this presentable pic?"
        body="Once approved, this photo is marked ready for testimonials and marketing."
        confirmLabel={photoReviewBusy ? "Approving…" : "Yes, approve it"}
        onClose={() => !photoReviewBusy && setConfirmTarget(null)}
        onConfirm={approvePresentablePic}
      />

      <ConfirmModal
        open={confirmTarget?.type === "reject-photo"}
        eyebrow="This decision is final"
        title="Reject this presentable pic?"
        body="The client will be asked to upload another presentable photo in the app."
        confirmLabel={photoReviewBusy ? "Rejecting…" : "Yes, reject it"}
        confirmTone="danger"
        onClose={() => !photoReviewBusy && setConfirmTarget(null)}
        onConfirm={rejectPresentablePic}
      />

      <RejectLetterModal
        open={rejectOpen}
        reason={rejectReason}
        onReasonChange={setRejectReason}
        onClose={() => {
          if (reviewBusy) return;
          setRejectOpen(false);
          setRejectReason("");
        }}
        onConfirm={rejectLetter}
        busy={reviewBusy}
      />

      <CommitmentLetterModal
        open={letterOpen}
        user={user}
        letter={letter}
        onClose={() => setLetterOpen(false)}
        onToast={onToast}
      />

      <RequestPhotoModal
        open={requestOpen}
        busy={requestBusy}
        onClose={() => !requestBusy && setRequestOpen(false)}
        onConfirm={sendPhotoRequest}
      />

      <PresentablePicViewModal
        open={viewOpen}
        url={viewUrl}
        label={viewLabel}
        onClose={() => setViewOpen(false)}
      />
    </div>
  );
}
