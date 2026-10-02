import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { downloadUserProgressPhoto, fetchUserBodyAnalytics, reviewUserProgressPhoto } from "../../api/usersApi.js";
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
  latestPhotoStamp,
  photoReviewMeta,
  photoReviewSummary,
} from "../../data/bodyAnalyticsData.js";
import { useClientSectionPermissions } from "./ClientProfileSectionGate.jsx";

function getModalRoot() {
  return document.querySelector(".updated-admin .ua-cp-drawer") || document.querySelector(".updated-admin");
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

function HistoryTable({ title, labelCol, columns, rows, unitToggle }) {
  return (
    <section className="ua-cp-ba-block">
      <div className="ua-cp-ba-block__head">
        <h3 className="ua-cp-ba-block__title">{title}</h3>
        {unitToggle}
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

function PhotoCards({ photosByAngle, latestPhotoDate, onOpen }) {
  const pendingCount = PHOTO_ANGLES.reduce(
    (sum, angle) => sum + (photosByAngle[angle.label] || []).filter((photo) => photo.reviewStatus === "pending").length,
    0,
  );

  return (
    <section className="ua-cp-ba-block ua-cp-ba-block--photos">
      <div className="ua-cp-ba-block__head">
        <h3 className="ua-cp-ba-block__title">Progress photos · 4 angles</h3>
        <div className="ua-cp-ba-block__meta">
          <span>Latest: {latestPhotoDate}</span>
          {pendingCount ? (
            <span className="ua-cp-ba-photo__status ua-cp-ba-photo__status--pending">
              {pendingCount} pending review
            </span>
          ) : null}
        </div>
      </div>
      <div className="ua-cp-ba-photos">
        {PHOTO_ANGLES.map((angle) => {
          const photos = photosByAngle[angle.label] || [];
          const summary = photoReviewSummary(photos);
          return (
            <button
              key={angle.label}
              type="button"
              className={`ua-cp-ba-photo${angle.single ? " ua-cp-ba-photo--weight" : ""}`}
              onClick={() => onOpen(angle.label)}
              disabled={!photos.length}
            >
              <span className="ua-cp-ba-photo__icon" aria-hidden="true"><svg width={angle.single ? "18" : "26"} height={angle.single ? "18" : "26"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><path d="M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8"></path></svg></span>
              <span className="ua-cp-ba-photo__label">{angle.label}</span>
              <span className="ua-cp-ba-photo__hint">{photoCardHint(angle, photos)}</span>
              {summary ? (
                <span className={`ua-cp-ba-photo__status ua-cp-ba-photo__status--${summary.tone}`}>{summary.label}</span>
              ) : null}
            </button>
          );
        })}
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

function PhotoReviewDialog({ photo, angle, action, reason, onReasonChange, busy, onClose, onConfirm }) {
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
          {rejecting ? `Reject this ${angle} photo?` : `Accept this ${angle} photo?`}
        </h3>
        <p className="ua-cp-present-modal__body">
          {rejecting
            ? "The client is notified and can upload a clearer photo. Add a reason if you want them to see why."
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
            {busy ? (rejecting ? "Rejecting…" : "Accepting…") : rejecting ? "Yes, reject it" : "Yes, accept it"}
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
      onReviewed?.(result?.photo, photo.angle);
      onToast?.(action === "approved" ? `Accepted ${angle} photo (${photo.date})` : `Rejected ${angle} photo (${photo.date})`);
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
              {photos.map((p) => (
                <div key={p.id} className="ua-cp-ba-photo-card">
                  <button
                    type="button"
                    className="ua-cp-ba-photo-card__img"
                    onClick={() => setPreview(p)}
                    aria-label={`Preview ${angle} photo from ${p.date}`}
                  >
                    <img src={p.url} alt={`${angle} progress from ${p.date}`} />
                  </button>
                  <div className="ua-cp-ba-photo-card__foot">
                    <div className="ua-cp-ba-photo-card__meta">
                      <span>{p.date}</span>
                      <span className={`ua-cp-ba-photo__status ua-cp-ba-photo__status--${photoReviewMeta(p.reviewStatus).tone}`}>
                        {photoReviewMeta(p.reviewStatus).label}
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
              ))}
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

export function BodyAnalyticsSection({ user, onToast }) {
  const { canEdit } = useClientSectionPermissions("body");
  const [historyMode, setHistoryMode] = useState("monthly");
  const [period, setPeriod] = useState("");
  const [unit, setUnit] = useState("cm");
  const [photoAngle, setPhotoAngle] = useState(null);
  const [bodyAnalytics, setBodyAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const isWeekly = historyMode === "weekly";
  const periodOptions = useMemo(
    () => getPeriodOptions(bodyAnalytics, historyMode),
    [bodyAnalytics, historyMode],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    fetchUserBodyAnalytics(user?.id)
      .then((data) => {
        if (!cancelled) setBodyAnalytics(data);
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
      [...(bodyAnalytics?.measurements || []), ...(bodyAnalytics?.metabolicMetrics || [])],
      historyMode,
      unit,
      historyWindow,
    ),
    [bodyAnalytics?.measurements, bodyAnalytics?.metabolicMetrics, historyMode, historyWindow, unit],
  );

  const metabolicRows = useMemo(
    () => buildMetabolicRows(
      bodyAnalytics?.metabolicMetrics,
      historyMode,
      historyWindow,
      bodyAnalytics?.measurements,
    ),
    [bodyAnalytics?.measurements, bodyAnalytics?.metabolicMetrics, historyMode, historyWindow],
  );

  function onHistoryChange(mode) {
    setHistoryMode(mode);
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
      />

      <HistoryTable
        title="Body measurements · history"
        labelCol="Measure"
        columns={historyColumns}
        rows={measureRows}
        unitToggle={unitToggle}
      />

      <HistoryTable
        title="Metabolic health metrics · history"
        labelCol="Metric"
        columns={historyColumns}
        rows={metabolicRows}
      />

      {photoAngle ? (
        <PhotoModal
          userId={user?.id}
          angle={photoAngle}
          photos={photosByAngle[photoAngle] || []}
          canReview={canEdit}
          onReviewed={(record, angle) => {
            setBodyAnalytics((current) => applyReviewedPhoto(current, record, angle));
          }}
          onClose={() => setPhotoAngle(null)}
          onToast={onToast}
        />
      ) : null}
    </div>
  );
}
