import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  downloadUserProgressPhoto,
  fetchUser,
  fetchUserBodyAnalytics,
  mapApiUserToRow,
  patchUserBodyMeasurementSettings,
  patchUserProgressPhotosInAppSettings,
  resolveBodyMeasurementClientEnabled,
  resolveProgressPhotosInAppEnabled,
  reviewUserProgressPhoto,
} from "../../api/usersApi.js";
import {
  BODY_ANALYTICS,
  PHOTO_ANGLES,
  buildPhotosByAngle,
  buildMeasurementRows,
  buildMetabolicRows,
  formatHistoryColumns,
  formatPeriodOption,
  formatPhotoDate,
  getHistoryWindow,
  getPeriodOptions,
  latestAnglePhoto,
  latestPhotoStamp,
  photoReviewMeta,
  photoReviewSummary,
} from "../../data/bodyAnalyticsData.js";
import { ConfirmDialog } from "../ConfirmDialog.jsx";
import { useClientSectionPermissions } from "./ClientProfileSectionGate.jsx";

function getModalRoot() {
  return document.querySelector(".updated-admin .ua-cp-drawer") || document.querySelector(".updated-admin");
}

function isLiveUserId(userId) {
  const id = String(userId || "").trim();
  return id.length > 8 && !id.startsWith("demo-");
}

function SegToggle({ options, value, onChange, size = "sm" }) {
  return (
    <div className={`ua-cp-seg ua-cp-seg--${size}`} role="tablist">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          role="tab"
          aria-selected={value === opt.id}
          className={`ua-cp-seg__btn${value === opt.id ? " ua-cp-seg__btn--active" : ""}`}
          onClick={() => onChange(opt.id)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

const DOB_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function parseDobParts(user) {
  const iso = String(user?.dobIso || "").trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    return { year: Number(iso[1]), month: Number(iso[2]), day: Number(iso[3]) };
  }
  const display = String(user?.dob || "").trim().match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/);
  if (!display) return null;
  const month = DOB_MONTHS.findIndex((name) => name.toLowerCase() === display[2].toLowerCase());
  if (month < 0) return null;
  return { year: Number(display[3]), month: month + 1, day: Number(display[1]) };
}

function clientAgeYears(user) {
  const parts = parseDobParts(user);
  if (!parts) return null;
  const today = new Date();
  let age = today.getFullYear() - parts.year;
  const monthDelta = today.getMonth() + 1 - parts.month;
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < parts.day)) age -= 1;
  if (!Number.isFinite(age) || age < 0 || age > 120) return null;
  return age;
}

function ClientAgeGender({ user }) {
  const age = clientAgeYears(user);
  const gender = String(user?.gender || "").trim();
  return (
    <div className="ua-cp-ba-client-facts" aria-label="Client age and gender">
      <span className="ua-cp-ba-client-facts__item">
        <span className="ua-cp-ba-client-facts__label">Age</span>
        <span className="ua-cp-ba-client-facts__value">{age == null ? "—" : `${age} yrs`}</span>
      </span>
      <span className="ua-cp-ba-client-facts__item">
        <span className="ua-cp-ba-client-facts__label">Gender</span>
        <span className="ua-cp-ba-client-facts__value">{gender || "—"}</span>
      </span>
    </div>
  );
}

function HistoryTable({ title, labelCol, columns, rows, unitToggle, clientFacts, sectionTools }) {
  return (
    <section className="ua-cp-ba-block">
      <div className="ua-cp-ba-block__head">
        <h3 className="ua-cp-ba-block__title">{title}</h3>
        <div className="ua-cp-ba-block__tools">
          {sectionTools}
          {clientFacts}
          {unitToggle}
        </div>
      </div>
      <div className="ua-cp-ba-table-wrap">
        <table className="ua-cp-ba-table">
          <thead>
            <tr>
              <th className="ua-cp-ba-table__label-col">{labelCol}</th>
              {columns.map((col) => (
                <th key={col}>{col}</th>
              ))}
              <th className="ua-cp-ba-table__delta-col">Δ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <td className="ua-cp-ba-table__label">{row.label}</td>
                {row.values.map((val, i) => (
                  <td key={`${row.label}-${i}`}>{val}</td>
                ))}
                <td className={`ua-cp-ba-table__delta ua-cp-ba-table__delta--${row.tone}`}>
                  {row.delta}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function photoCardHint(angle, photos) {
  if (!photos?.length) return "No photo uploaded";
  const summary = photoReviewSummary(photos);
  const status = summary?.label?.toLowerCase() || "pending";
  if (angle.single) {
    return summary?.tone === "pending" ? "Onboarding · pending review" : `Onboarding · ${status}`;
  }
  const count = `${photos.length} photo${photos.length === 1 ? "" : "s"}`;
  if (summary?.tone === "pending" && summary.label === "Pending") return `${count} · pending review`;
  if (summary?.tone === "pending") return `${count} · ${summary.label}`;
  return `${count} · ${status}`;
}

function PhotoCameraIcon({ compact }) {
  const size = compact ? 18 : 26;
  return (
    <span className="ua-cp-ba-photo__icon" aria-hidden="true">
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
        <path d="M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8"></path>
      </svg>
    </span>
  );
}

function PhotoAngleCard({ angle, photos, onOpen }) {
  const latest = latestAnglePhoto(photos);
  const [imageFailed, setImageFailed] = useState(false);
  const summary = photoReviewSummary(photos);
  const showImage = Boolean(latest?.url) && !imageFailed;

  useEffect(() => {
    setImageFailed(false);
  }, [latest?.url]);

  return (
    <button
      type="button"
      className={`ua-cp-ba-photo${angle.single ? " ua-cp-ba-photo--weight" : ""}${showImage ? " ua-cp-ba-photo--has-image" : ""}`}
      onClick={() => onOpen(angle.label)}
      disabled={!photos.length}
    >
      {showImage ? (
        <img
          className="ua-cp-ba-photo__img"
          src={latest.url}
          alt=""
          onError={() => setImageFailed(true)}
        />
      ) : null}
      <span className="ua-cp-ba-photo__overlay">
        <PhotoCameraIcon compact />
        <span className="ua-cp-ba-photo__label">{angle.label}</span>
        <span className="ua-cp-ba-photo__hint">{photoCardHint(angle, photos)}</span>
        {summary ? (
          <span className={`ua-cp-ba-photo__status ua-cp-ba-photo__status--${summary.tone}`}>{summary.label}</span>
        ) : null}
      </span>
    </button>
  );
}

function PhotoCards({ photosByAngle, latestPhotoDate, onOpen, headTools = null }) {
  const pendingCount = PHOTO_ANGLES.reduce(
    (sum, angle) => sum + (photosByAngle[angle.label] || []).filter((photo) => photo.reviewStatus === "pending").length,
    0,
  );

  return (
    <section className="ua-cp-ba-block ua-cp-ba-block--photos">
      <div className="ua-cp-ba-block__head">
        <h3 className="ua-cp-ba-block__title">Progress photos · 3 angles</h3>
        <div className="ua-cp-ba-block__meta">
          <span>Latest: {latestPhotoDate}</span>
          {pendingCount ? (
            <span className="ua-cp-ba-photo__status ua-cp-ba-photo__status--pending">
              {pendingCount} pending review
            </span>
          ) : null}
        </div>
        {headTools ? <div className="ua-cp-ba-block__tools">{headTools}</div> : null}
      </div>
      <div className="ua-cp-ba-photos">
        {PHOTO_ANGLES.map((angle) => (
          <PhotoAngleCard
            key={angle.label}
            angle={angle}
            photos={photosByAngle[angle.label] || []}
            onOpen={onOpen}
          />
        ))}
      </div>
    </section>
  );
}

function photoFileName(photo, angle) {
  const ext = String(photo.url || "").match(/\.(jpe?g|png|webp|gif|heic)(?:\?|$)/i)?.[1]?.toLowerCase() || "jpg";
  const datePart = String(photo.date || "photo").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "");
  return `${angle}-${datePart}.${ext}`;
}

function triggerBlobDownload(blob, filename) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
}

async function downloadPhotoFile(userId, photo, angleLabel) {
  const filename = photoFileName(photo, angleLabel);
  if (!userId || !photo?.photoId || !photo?.angle) {
    throw new Error("Could not download photo");
  }
  const blob = await downloadUserProgressPhoto(userId, photo.photoId, photo.angle, filename);
  triggerBlobDownload(blob, filename);
}

function PhotoReviewActions({ photo, canReview, busy, onSave, onAccept, onReject }) {
  const status = photoReviewMeta(photo?.reviewStatus);
  const pending = status.tone === "pending";
  const saving = busy === photo?.id;

  return (
    <div className="ua-cp-ba-photo-card__actions">
      <button
        type="button"
        className="ua-cp-ba-photo-card__save"
        onClick={() => onSave(photo)}
        disabled={saving || Boolean(busy)}
      >
        ↓ {saving ? "Saving…" : "Save"}
      </button>
      {canReview && pending ? (
        <>
          <button
            type="button"
            className="ua-cp-ba-photo-card__review ua-cp-ba-photo-card__review--accept"
            onClick={() => onAccept(photo)}
            disabled={Boolean(busy)}
          >
            Accept
          </button>
          <button
            type="button"
            className="ua-cp-ba-photo-card__review ua-cp-ba-photo-card__review--reject"
            onClick={() => onReject(photo)}
            disabled={Boolean(busy)}
          >
            Reject
          </button>
        </>
      ) : null}
    </div>
  );
}

function PhotoReviewDialog({ photo, angle, action, reason, onReasonChange, busy, onClose, onConfirm, rejectDayAngles }) {
  if (!photo || !action) return null;
  const rejecting = action === "rejected";

  return (
    <div className="ua-cp-modal-backdrop ua-cp-ba-review-backdrop" onClick={busy ? undefined : onClose} role="presentation">
      <div
        className="ua-cp-present-modal ua-cp-present-modal--confirm"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-labelledby="photo-review-title"
      >
        <p className={`ua-cp-present-modal__eyebrow ua-cp-present-modal__eyebrow--${rejecting ? "danger" : "primary"}`}>
          Review this photo
        </p>
        <h3 id="photo-review-title" className="ua-cp-present-modal__title">
          {rejecting
            ? (rejectDayAngles ? "Reject this day's 180° photos?" : `Reject this ${angle} photo?`)
            : `Accept this ${angle} photo?`}
        </h3>
        <p className="ua-cp-present-modal__body">
          {rejecting
            ? (rejectDayAngles
              ? "Front, Right, and Left from this day are rejected together. The weight photo stays as-is. The client is sent back to the 180° page to submit the three angles again."
              : `The client is notified that this ${angle.toLowerCase()} photo was rejected and can upload a new one.`)
            : `The client is notified that this ${angle.toLowerCase()} photo was accepted.`}
        </p>
        {rejecting ? (
          <label className="ua-cp-present-request__field">
            Rejection reason
            <textarea
              rows={3}
              value={reason}
              onChange={(event) => onReasonChange(event.target.value)}
              maxLength={500}
              placeholder="e.g. Face is cropped out, or the lighting is too dark"
            />
          </label>
        ) : null}
        <div className="ua-cp-present-modal__foot">
          <button type="button" className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className={`ua-cp-btn ua-cp-btn--sm${rejecting ? " ua-cp-present-modal__confirm--danger" : " ua-cp-btn--primary"}`}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy
              ? (rejecting ? "Rejecting…" : "Accepting…")
              : rejecting
                ? (rejectDayAngles ? "Yes, reject 180° photos" : "Yes, reject it")
                : "Yes, accept it"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PhotoModal({ userId, angle, photos, canReview, onReviewed, onClose, onToast }) {
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState("");
  const [reviewTarget, setReviewTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const angleMeta = PHOTO_ANGLES.find((item) => item.label === angle);
  const isSingle = Boolean(angleMeta?.single);
  const singlePhoto = isSingle ? photos[0] || null : null;
  const activePreview = isSingle ? singlePhoto : preview;

  useEffect(() => {
    setPreview((current) => {
      if (!current) return null;
      return photos.find((photo) => photo.id === current.id) || current;
    });
  }, [photos]);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key !== "Escape") return;
      if (reviewTarget) {
        if (!busy) {
          setReviewTarget(null);
          setRejectReason("");
        }
        return;
      }
      if (preview && !isSingle) setPreview(null);
      else onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [busy, isSingle, onClose, preview, reviewTarget]);

  const root = getModalRoot();
  if (!root) return null;

  async function handleSave(photo) {
    if (!photo?.url || busy) return;
    setBusy(photo.id);
    try {
      await downloadPhotoFile(userId, photo, angle);
      onToast?.(`Saved ${angle} photo (${photo.date})`);
    } catch (error) {
      onToast?.(error?.message || "Could not download photo");
    } finally {
      setBusy("");
    }
  }

  function openReview(photo, action) {
    if (!canReview || !photo || busy) return;
    setRejectReason("");
    setReviewTarget({ photo, action });
  }

  async function confirmReview() {
    const photo = reviewTarget?.photo;
    const action = reviewTarget?.action;
    if (!photo?.photoId || !photo?.angle || !action || busy) return;
    setBusy(photo.id);
    try {
      const result = await reviewUserProgressPhoto(userId, photo.photoId, photo.angle, {
        action,
        rejectionReason: action === "rejected" ? rejectReason.trim() : "",
      });
      onReviewed?.(result?.photo, photo.angle, result);
      const glance = String(result?.paidOnboardingStepStatus?.bodyAnalytics || "").toLowerCase();
      const glanceNote = glance === "pending"
        ? " Body Analytics is open again."
        : glance === "done"
          ? " Body Analytics marked done."
          : "";
      onToast?.(
        action === "approved"
          ? `Accepted ${angle} photo (${photo.date}).${glanceNote}`
          : isSingle
            ? `Rejected ${angle} photo (${photo.date}).`
            : `Rejected Front, Right, and Left from ${photo.date}. Weight was not changed. The client can submit 180° photos again.${glanceNote}`,
      );
      setReviewTarget(null);
      setRejectReason("");
    } catch (error) {
      onToast?.(error?.message || "Could not update photo review");
    } finally {
      setBusy("");
    }
  }

  async function handleDownloadAll() {
    if (!photos.length || busy) return;
    setBusy("all");
    try {
      for (const photo of photos) {
        if (!photo.url) continue;
        await downloadPhotoFile(userId, photo, angle);
      }
      onToast?.(`Downloaded ${photos.length} ${angle} photo${photos.length === 1 ? "" : "s"}`);
    } catch (error) {
      onToast?.(error?.message || "Could not download photos");
    } finally {
      setBusy("");
    }
  }

  return createPortal(
    <>
      {isSingle ? null : (
        <div className="ua-cp-modal-backdrop ua-cp-modal-backdrop--drawer" onClick={onClose} role="presentation">
          <div className="ua-cp-modal ua-cp-modal--photos" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="photo-modal-title">
            <div className="ua-cp-modal__head ua-cp-modal__head--photos">
              <div>
                <div id="photo-modal-title" className="ua-cp-modal__title">{angle} Photos</div>
                <div className="ua-cp-modal__sub">
                  {canReview
                    ? `Review each ${angle.toLowerCase()} photo, then accept or reject it`
                    : `All ${angle.toLowerCase()} photos uploaded by the client`}
                </div>
              </div>
              <div className="ua-cp-modal__actions">
                <button
                  type="button"
                  className="ua-cp-btn ua-cp-btn--green ua-cp-btn--sm"
                  onClick={handleDownloadAll}
                  disabled={Boolean(busy) || !photos.length}
                >
                  ↓ {busy === "all" ? "Downloading…" : "Download all"}
                </button>
                <button type="button" className="ua-cp-modal__close" onClick={onClose} aria-label="Close">×</button>
              </div>
            </div>
            <div className="ua-cp-ba-photo-grid">
              {photos.map((p) => {
                const review = photoReviewMeta(p.reviewStatus);
                return (
                <div key={p.id} className="ua-cp-ba-photo-card">
                  <button
                    type="button"
                    className="ua-cp-ba-photo-card__img"
                    onClick={() => setPreview(p)}
                    aria-label={`Preview ${angle} photo from ${p.date}, ${review.label}`}
                  >
                    <img src={p.url} alt={`${angle} progress from ${p.date}`} />
                    <span className={`ua-cp-ba-photo-card__badge ua-cp-ba-photo__status ua-cp-ba-photo__status--${review.tone}`}>
                      {review.label}
                    </span>
                  </button>
                  <div className="ua-cp-ba-photo-card__foot">
                    <div className="ua-cp-ba-photo-card__meta">
                      <span>{p.date}</span>
                      <span className={`ua-cp-ba-photo__status ua-cp-ba-photo__status--${review.tone}`}>
                        {review.label}
                      </span>
                    </div>
                    {p.rejectionReason ? (
                      <p className="ua-cp-ba-photo-card__reason">{p.rejectionReason}</p>
                    ) : null}
                    <PhotoReviewActions
                      photo={p}
                      canReview={canReview}
                      busy={busy}
                      onSave={handleSave}
                      onAccept={(photo) => openReview(photo, "approved")}
                      onReject={(photo) => openReview(photo, "rejected")}
                    />
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      {activePreview ? (
        <div
          className={`ua-cp-ba-photo-preview${isSingle ? " ua-cp-ba-photo-preview--weight" : ""}`}
          onClick={isSingle ? onClose : () => setPreview(null)}
          role="presentation"
        >
          <div
            className="ua-cp-ba-photo-preview__dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="photo-preview-title"
          >
            <div className="ua-cp-ba-photo-preview__head">
              <div>
                <div id="photo-preview-title" className="ua-cp-ba-photo-preview__title">{angle} photo</div>
                <div className="ua-cp-ba-photo-preview__sub">
                  {isSingle ? `Onboarding · ${activePreview.date}` : activePreview.date}
                  {` · ${photoReviewMeta(activePreview.reviewStatus).label}`}
                </div>
              </div>
              <div className="ua-cp-modal__actions">
                <PhotoReviewActions
                  photo={activePreview}
                  canReview={canReview}
                  busy={busy}
                  onSave={handleSave}
                  onAccept={(photo) => openReview(photo, "approved")}
                  onReject={(photo) => openReview(photo, "rejected")}
                />
                <button
                  type="button"
                  className="ua-cp-modal__close"
                  onClick={isSingle ? onClose : () => setPreview(null)}
                  aria-label="Close preview"
                >
                  ×
                </button>
              </div>
            </div>
            <img src={activePreview.url} alt={`${angle} from ${activePreview.date}`} />
          </div>
        </div>
      ) : null}
      <PhotoReviewDialog
        photo={reviewTarget?.photo}
        angle={angle}
        action={reviewTarget?.action}
        reason={rejectReason}
        onReasonChange={setRejectReason}
        busy={Boolean(busy && reviewTarget)}
        onClose={() => {
          if (busy) return;
          setReviewTarget(null);
          setRejectReason("");
        }}
        onConfirm={confirmReview}
        rejectDayAngles={!isSingle}
      />
    </>,
    root,
  );
}

function applyReviewedPhoto(current, record, angle) {
  if (!current || !record) return current;
  const id = String(record.id || record._id || "");
  if (angle === "weight") {
    return {
      ...current,
      measurements: (current.measurements || []).map((row) => (
        String(row.id || row._id) === id ? { ...row, ...record } : row
      )),
    };
  }
  return {
    ...current,
    photos: (current.photos || []).map((row) => (
      String(row.id || row._id) === id ? { ...row, ...record } : row
    )),
  };
}

function applyReviewResult(current, result, angle) {
  if (!current || !result) return current;
  let next = applyReviewedPhoto(current, result.photo, angle);
  for (const record of result.rejectedPhotos || []) {
    next = applyReviewedPhoto(next, record, "front");
  }
  for (const record of result.rejectedMeasurements || []) {
    next = applyReviewedPhoto(next, record, "weight");
  }
  return next;
}

export function BodyAnalyticsSection({ user, onToast, onUserUpdated }) {
  const { canEdit } = useClientSectionPermissions("body");
  const live = isLiveUserId(user?.id);
  const [historyMode, setHistoryMode] = useState("monthly");
  const [period, setPeriod] = useState("");
  const [unit, setUnit] = useState("cm");
  const [photoAngle, setPhotoAngle] = useState(null);
  const [bodyAnalytics, setBodyAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [featureEnabled, setFeatureEnabled] = useState(() => resolveBodyMeasurementClientEnabled(user));
  const [progressPhotosInApp, setProgressPhotosInApp] = useState(() => resolveProgressPhotosInAppEnabled(user));
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [progressPhotosBusy, setProgressPhotosBusy] = useState(false);
  const [clientFillConfirm, setClientFillConfirm] = useState(null);
  const [progressPhotosConfirm, setProgressPhotosConfirm] = useState(null);

  const clientFirstName = user?.name?.split(/\s+/)[0] || "Client";

  const isWeekly = historyMode === "weekly";
  const periodOptions = useMemo(
    () => getPeriodOptions(bodyAnalytics, historyMode),
    [bodyAnalytics, historyMode],
  );

  useEffect(() => {
    setFeatureEnabled(resolveBodyMeasurementClientEnabled(user));
  }, [user?.bodyMeasurementEnabled, user?.paidOnboardingStepStatus]);

  useEffect(() => {
    setProgressPhotosInApp(resolveProgressPhotosInAppEnabled(user));
  }, [user?.progressPhotosInAppEnabled, user?.paidOnboardingStepStatus?.progressPhotos180]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    fetchUserBodyAnalytics(user?.id)
      .then((data) => {
        if (!cancelled) {
          const { bodyMeasurementEnabled, ...analytics } = data || {};
          setBodyAnalytics(analytics);
          if (bodyMeasurementEnabled !== undefined) {
            setFeatureEnabled(Boolean(bodyMeasurementEnabled));
          }
          if (data?.progressPhotosInAppEnabled !== undefined) {
            setProgressPhotosInApp(Boolean(data.progressPhotosInAppEnabled));
          }
        }
      })
      .catch((error) => {
        if (cancelled) return;
        const message = error?.message || "Failed to load body analytics";
        setLoadError(message);
        onToast?.(message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [onToast, user?.id]);

  useEffect(() => {
    setPeriod((current) => {
      if (current && periodOptions.includes(current)) return current;
      return periodOptions[0] || "";
    });
  }, [historyMode, periodOptions]);

  const historyWindow = useMemo(
    () => getHistoryWindow(historyMode, period),
    [historyMode, period],
  );

  const historyColumns = useMemo(
    () => formatHistoryColumns(historyMode, historyWindow),
    [historyMode, historyWindow],
  );

  const measureRows = useMemo(
    () => buildMeasurementRows(
      bodyAnalytics?.measurements,
      historyMode,
      unit,
      historyWindow,
    ),
    [bodyAnalytics?.measurements, historyMode, historyWindow, unit],
  );

  const metabolicRows = useMemo(
    () => buildMetabolicRows(
      bodyAnalytics?.measurements,
      historyMode,
      historyWindow,
      { gender: user?.gender, dob: user?.dobIso || user?.dob },
      bodyAnalytics?.metabolicMetrics,
    ),
    [
      bodyAnalytics?.measurements,
      bodyAnalytics?.metabolicMetrics,
      historyMode,
      historyWindow,
      user?.dob,
      user?.dobIso,
      user?.gender,
    ],
  );

  function onHistoryChange(mode) {
    setHistoryMode(mode);
  }

  function requestToggleBodyMeasurementClientFill() {
    if (settingsBusy) return;
    setClientFillConfirm({ next: !featureEnabled });
  }

  function requestToggleProgressPhotosInApp() {
    if (progressPhotosBusy || !canEdit) return;
    setProgressPhotosConfirm({ next: !progressPhotosInApp });
  }

  async function applyProgressPhotosInApp(next) {
    if (!live) {
      setProgressPhotosInApp(next);
      onToast?.(
        next
          ? "Progress photos enabled in the client app"
          : "Progress photos hidden from the client app",
      );
      return;
    }
    setProgressPhotosBusy(true);
    try {
      const result = await patchUserProgressPhotosInAppSettings(user.id, { enabled: next });
      setProgressPhotosInApp(result?.enabled ?? next);
      if (result?.user) {
        onUserUpdated?.(mapApiUserToRow(result.user));
      } else {
        onUserUpdated?.({
          ...user,
          progressPhotosInAppEnabled: next,
          progressPhotosInAppEnabledRaw: next,
        });
      }
      try {
        const row = await fetchUser(user.id);
        if (row) onUserUpdated?.(row);
      } catch {
        // best-effort refresh
      }
      onToast?.(
        result?.message
          || (next
            ? "Progress photos enabled in the client app"
            : "Progress photos hidden from the client app"),
      );
    } catch (error) {
      onToast?.(error?.message || "Failed to update progress photo setting");
    } finally {
      setProgressPhotosBusy(false);
    }
  }

  async function applyBodyMeasurementClientFill(next) {
    if (!live) {
      setFeatureEnabled(next);
      onToast?.(
        next
          ? "Body measurements enabled in the client app"
          : "Body measurements hidden from the client app",
      );
      return;
    }
    setSettingsBusy(true);
    try {
      const result = await patchUserBodyMeasurementSettings(user.id, { enabled: next });
      setFeatureEnabled(result?.enabled ?? next);
      if (result?.user) {
        onUserUpdated?.(mapApiUserToRow(result.user));
      } else {
        onUserUpdated?.({
          ...user,
          bodyMeasurementEnabled: next,
          bodyMeasurementEnabledRaw: next,
        });
      }
      try {
        const row = await fetchUser(user.id);
        if (row) onUserUpdated?.(row);
      } catch {
        // Toggle already saved; profile refresh is best-effort.
      }
      onToast?.(
        result?.message
          || (next
            ? "Body measurements enabled in the client app"
            : "Body measurements hidden from the client app"),
      );
    } catch (error) {
      onToast?.(error?.message || "Failed to update body measurement setting");
    } finally {
      setSettingsBusy(false);
    }
  }

  const photosByAngle = useMemo(
    () => buildPhotosByAngle(bodyAnalytics?.photos, bodyAnalytics?.measurements),
    [bodyAnalytics?.measurements, bodyAnalytics?.photos],
  );
  const latestPhotoDate = formatPhotoDate(
    latestPhotoStamp(bodyAnalytics?.photos, bodyAnalytics?.measurements),
  );

  const unitToggle = (
    <SegToggle
      size="xs"
      value={unit}
      onChange={setUnit}
      options={[{ id: "cm", label: "cm" }, { id: "inch", label: "inch" }]}
    />
  );

  const bodyMeasurementDisabledInApp = !featureEnabled;
  const bodyMeasurementClientToggle = canEdit ? (
    <div
      className="ua-cp-ba-client-entry"
      title={
        bodyMeasurementDisabledInApp
          ? "Body measurements are hidden from the client app"
          : "Client can fill body measurements (height, weight, neck, etc.)"
      }
    >
      <span className="ua-cp-ba-client-entry__label">Disabled in the app</span>
      <button
        type="button"
        className={`ua-toggle ua-toggle--sm${bodyMeasurementDisabledInApp ? " ua-toggle--on" : ""}`}
        onClick={requestToggleBodyMeasurementClientFill}
        disabled={settingsBusy}
        aria-pressed={bodyMeasurementDisabledInApp}
        aria-label="Disable body measurements in client app"
      >
        <span className="ua-toggle__knob" />
      </button>
    </div>
  ) : null;

  const progressPhotosDisabledInApp = !progressPhotosInApp;
  const progressPhotosInAppToggle = canEdit ? (
    <div
      className="ua-cp-ba-client-entry"
      title={
        progressPhotosDisabledInApp
          ? "Progress photo uploads are hidden from the client app"
          : "Client can upload front, right, and left progress photos in the app"
      }
    >
      <span className="ua-cp-ba-client-entry__label">Disabled in the app</span>
      <button
        type="button"
        className={`ua-toggle ua-toggle--sm${progressPhotosDisabledInApp ? " ua-toggle--on" : ""}`}
        onClick={requestToggleProgressPhotosInApp}
        disabled={progressPhotosBusy}
        aria-pressed={progressPhotosDisabledInApp}
        aria-label="Disable progress photos in client app"
      >
        <span className="ua-toggle__knob" />
      </button>
    </div>
  ) : null;

  if (loading) {
    return <div className="ua-cp-section ua-cp-body-analytics"><p className="ua-page-head__sub">Loading body analytics…</p></div>;
  }

  if (loadError) {
    return <div className="ua-cp-section ua-cp-body-analytics"><p className="ua-page-head__sub" style={{ color: "#b42318" }}>{loadError}</p></div>;
  }

  return (
    <div className="ua-cp-section ua-cp-body-analytics">
      <div className="ua-cp-ba-head">
        <div>
          <h2 className="ua-cp-ba-head__title">Body analytics</h2>
          <p className="ua-cp-ba-head__hint">
            {isWeekly ? BODY_ANALYTICS.weeklyHint : BODY_ANALYTICS.monthlyHint}
          </p>
        </div>
        <div className="ua-cp-ba-head__controls">
          <span className="ua-cp-ba-head__history-label">History</span>
          <SegToggle
            value={historyMode}
            onChange={onHistoryChange}
            options={[{ id: "weekly", label: "Weekly" }, { id: "monthly", label: "Monthly" }]}
          />
          <select
            className="ua-cp-ba-period"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            aria-label="History period"
            disabled={!periodOptions.length}
          >
            {!periodOptions.length ? <option value="">No records</option> : null}
            {periodOptions.map((opt) => (
              <option key={opt} value={opt}>{formatPeriodOption(historyMode, opt)}</option>
            ))}
          </select>
        </div>
      </div>

      <PhotoCards
        photosByAngle={photosByAngle}
        latestPhotoDate={latestPhotoDate}
        onOpen={setPhotoAngle}
        headTools={progressPhotosInAppToggle}
      />

      <HistoryTable
        title="Body measurements · history"
        labelCol="Measure"
        columns={historyColumns}
        rows={measureRows}
        sectionTools={bodyMeasurementClientToggle}
        unitToggle={unitToggle}
        clientFacts={<ClientAgeGender user={user} />}
      />

      <HistoryTable
        title="Metabolic health metrics · history"
        labelCol="Metric"
        columns={historyColumns}
        rows={metabolicRows}
      />

      <ConfirmDialog
        open={Boolean(progressPhotosConfirm)}
        tag="Progress photos"
        title={
          progressPhotosConfirm?.next
            ? `Allow ${clientFirstName} to upload progress photos in the app?`
            : `Disable progress photos in the client app for ${clientFirstName}?`
        }
        body={
          progressPhotosConfirm?.next
            ? "The client can submit front, right, and left photos during onboarding or later updates. Body measurements are controlled separately under Client fill."
            : "The client will not be able to upload new progress photos in the app. Pending 180° onboarding will be skipped. You can still review existing uploads here."
        }
        confirmLabel={progressPhotosConfirm?.next ? "Enable in app" : "Disable in app"}
        confirmTone={progressPhotosConfirm?.next ? "primary" : "danger"}
        onCancel={() => {
          if (!progressPhotosBusy) setProgressPhotosConfirm(null);
        }}
        onConfirm={() => {
          const next = progressPhotosConfirm?.next;
          setProgressPhotosConfirm(null);
          if (next === undefined) return;
          applyProgressPhotosInApp(next);
        }}
      />

      <ConfirmDialog
        open={Boolean(clientFillConfirm)}
        tag={clientFillConfirm?.next ? "Body measurements" : "Body measurements"}
        title={
          clientFillConfirm?.next
            ? `Allow ${clientFirstName} to fill body measurements?`
            : `Stop ${clientFirstName} from filling body measurements?`
        }
        body={
          clientFillConfirm?.next
            ? "This applies only to the Body measurements · history section. The client can enter height, weight, neck, and other measures in the app. Progress photos and metabolic metrics are not affected."
            : "The client will not be able to submit new body measurement data until you turn Client fill back on. Existing history in this section stays visible to you."
        }
        confirmLabel={clientFillConfirm?.next ? "Enable client fill" : "Disable client fill"}
        confirmTone={clientFillConfirm?.next ? "primary" : "danger"}
        onCancel={() => {
          if (!settingsBusy) setClientFillConfirm(null);
        }}
        onConfirm={() => {
          const next = clientFillConfirm?.next;
          setClientFillConfirm(null);
          if (next === undefined) return;
          applyBodyMeasurementClientFill(next);
        }}
      />

      {photoAngle ? (
        <PhotoModal
          userId={user?.id}
          angle={photoAngle}
          photos={photosByAngle[photoAngle] || []}
          canReview={canEdit}
          onReviewed={(record, angle, result) => {
            setBodyAnalytics((current) => applyReviewResult(current, { ...result, photo: record }, angle));
            const status = result?.paidOnboardingStepStatus;
            if (!status || !onUserUpdated) return;
            const done = Number(result.completedStepsCount);
            onUserUpdated({
              ...user,
              paidOnboardingStepStatus: status,
              paidOnboardingCompleted: Boolean(result.paidOnboardingCompleted),
              ...(result.paidOnboardingStep ? { paidOnboardingStep: result.paidOnboardingStep } : {}),
              ...(Number.isFinite(done) ? {
                onboardingDone: done,
                onboardingPct: Math.round((done / 10) * 100),
              } : {}),
            });
          }}
          onClose={() => setPhotoAngle(null)}
          onToast={onToast}
        />
      ) : null}
    </div>
  );
}
