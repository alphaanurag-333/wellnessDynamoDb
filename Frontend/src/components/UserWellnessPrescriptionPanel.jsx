import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import { AiOutlineEye } from "react-icons/ai";
import { fetchActiveWellnessPrescriptionCatalog } from "../wellnessCoach/api/coachWellnessPrescriptionCatalog.js";

function formatAssignmentDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3">
      <path d="M5 12l5 5L19 7" />
    </svg>
  );
}

function AssignmentCard({ assignment, onDelete, deleting, canDelete }) {
  const items = assignment.items || [];
  const catalogCount = items.filter((item) => item.prescriptionId).length;
  const manualCount = items.filter((item) => !item.prescriptionId).length;

  return (
    <article className="assignment-card">
      <div className="assignment-card__header">
        <div className="assignment-card__header-main">
          <div className="diet-plan-card__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="1" />
              <path d="M9 12h6M9 16h6" />
            </svg>
          </div>
          <div>
            <div className="diet-plan-card__title">Date: {formatAssignmentDate(assignment.date)}</div>
            <div className="diet-plan-card__date">
              {items.length} point{items.length === 1 ? "" : "s"}
              {catalogCount > 0 ? ` · ${catalogCount} from catalog` : ""}
              {manualCount > 0 ? ` · ${manualCount} custom` : ""}
            </div>
          </div>
        </div>
        {canDelete ? (
          <div className="assignment-card__header-actions">
            <button
              type="button"
              className="btn btn--ghost btn--sm text-danger"
              onClick={() => onDelete(assignment)}
              disabled={deleting}
            >
              Delete
            </button>
          </div>
        ) : null}
      </div>
      <div className="assignment-card__body">
        {items.length > 0 ? (
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {items.map((item, index) => (
              <li key={`${assignment.id || assignment._id}-${index}`} style={{ marginBottom: 8 }}>
                {item.text}
                {item.prescriptionId ? (
                  <span className="catalog-picker__badge" style={{ marginLeft: 8 }}>
                    catalog
                  </span>
                ) : (
                  <span className="catalog-picker__badge catalog-picker__badge--type" style={{ marginLeft: 8 }}>
                    custom
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="table-placeholder">No recommendation points.</p>
        )}
      </div>
    </article>
  );
}

function PrescriptionPointsModal({ prescription, onClose }) {
  useEffect(() => {
    if (!prescription) return undefined;
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, prescription]);

  if (!prescription) return null;

  const points = Array.isArray(prescription.points) ? prescription.points : [];

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="prescription-points-title" onClick={onClose}>
      <div className="modal-card modal-card--wide" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-card__title" id="prescription-points-title">
          {prescription.title}
        </h3>
        {prescription.category ? <p className="modal-card__subtitle">{prescription.category}</p> : null}
        <p className="data-table__muted" style={{ margin: "0 0 12px" }}>
          {points.length} recommendation point{points.length === 1 ? "" : "s"}
        </p>
        <ul className="wellness-prescription-points-list">
          {points.length === 0 ? (
            <li className="data-table__muted">No points.</li>
          ) : (
            points.map((point, index) => <li key={index}>{point}</li>)
          )}
        </ul>
        <div className="modal-card__actions">
          <button type="button" className="btn btn--primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function PrescriptionPickerCard({ prescription, selected, onToggle, onViewPoints }) {
  const id = prescription.id || prescription._id;
  const points = Array.isArray(prescription.points) ? prescription.points : [];
  const pointCount = points.length;

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onToggle(id);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      className={`catalog-picker__card catalog-picker__card--prescription${selected ? " catalog-picker__card--selected" : ""}`}
      onClick={() => onToggle(id)}
      onKeyDown={handleKeyDown}
      aria-pressed={selected}
    >
      <div className="catalog-picker__card-head">
        <span className="catalog-picker__card-name">{prescription.title}</span>
        <span className="catalog-picker__card-check" aria-hidden="true">
          {selected ? <CheckIcon /> : null}
        </span>
      </div>
      <div className="catalog-picker__card-meta">
        {prescription.category ? <span className="catalog-picker__badge">{prescription.category}</span> : null}
        {pointCount > 0 ? (
          <span className="catalog-picker__badge catalog-picker__badge--with-action">
            {pointCount} point{pointCount === 1 ? "" : "s"}
            <button
              type="button"
              className="catalog-picker__view-points"
              title="View recommendation points"
              aria-label={`View ${pointCount} recommendation points for ${prescription.title}`}
              onClick={(e) => {
                e.stopPropagation();
                onViewPoints(prescription);
              }}
            >
              <AiOutlineEye size={15} aria-hidden="true" />
            </button>
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function UserWellnessPrescriptionPanel({
  token,
  userId,
  api,
  backTo,
  PageLoader,
  NotFoundPage,
  onUnauthorized,
  readOnly = false,
}) {
  const [catalogGrouped, setCatalogGrouped] = useState({});
  const [catalogPrescriptions, setCatalogPrescriptions] = useState([]);
  const [recommended, setRecommended] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [date, setDate] = useState("");
  const [selectedPrescriptionIds, setSelectedPrescriptionIds] = useState([]);
  const [customPoints, setCustomPoints] = useState([""]);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [search, setSearch] = useState("");
  const [previewPrescription, setPreviewPrescription] = useState(null);

  const loadData = useCallback(async () => {
    if (!token || !userId) return;
    setError("");
    setNotFound(false);
    setLoading(true);
    try {
      const [catalog, assignments] = await Promise.all([
        fetchActiveWellnessPrescriptionCatalog(),
        api.list(token, userId),
      ]);
      setCatalogGrouped(catalog.groupedByCategory ?? {});
      setCatalogPrescriptions(catalog.prescriptions ?? []);
      setRecommended(assignments.recommended ?? null);
      setHistory(assignments.history ?? []);
    } catch (e) {
      if (e?.status === 401) {
        onUnauthorized?.();
        return;
      }
      if (e?.status === 404) {
        setNotFound(true);
        return;
      }
      setError(e.message || "Failed to load wellness prescriptions.");
    } finally {
      setLoading(false);
    }
  }, [api, onUnauthorized, token, userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const categories = useMemo(() => {
    const keys = Object.keys(catalogGrouped);
    if (keys.length) return keys.sort();
    return [...new Set(catalogPrescriptions.map((p) => p.category).filter(Boolean))].sort();
  }, [catalogGrouped, catalogPrescriptions]);

  const filteredPrescriptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    let prescriptions = categoryFilter
      ? catalogGrouped[categoryFilter] || catalogPrescriptions.filter((p) => p.category === categoryFilter)
      : catalogPrescriptions;

    if (q) {
      prescriptions = prescriptions.filter((prescription) => {
        const haystack = [prescription.title, prescription.category, prescription.prescriptionId]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      });
    }

    return [...prescriptions].sort((a, b) => String(a.title || "").localeCompare(String(b.title || "")));
  }, [catalogGrouped, catalogPrescriptions, categoryFilter, search]);

  const togglePrescription = (prescriptionId) => {
    setSelectedPrescriptionIds((prev) =>
      prev.includes(prescriptionId) ? prev.filter((id) => id !== prescriptionId) : [...prev, prescriptionId]
    );
  };

  const clearSelection = () => setSelectedPrescriptionIds([]);

  const updateCustomPoint = (index, value) => {
    setCustomPoints((prev) => prev.map((row, i) => (i === index ? value : row)));
  };

  const addCustomPoint = () => setCustomPoints((prev) => [...prev, ""]);

  const removeCustomPoint = (index) => {
    setCustomPoints((prev) => (prev.length <= 1 ? [""] : prev.filter((_, i) => i !== index)));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!token || !userId) return;
    if (!date) {
      await Swal.fire({ icon: "warning", title: "Select a date." });
      return;
    }

    const trimmedCustomPoints = customPoints.map((p) => String(p || "").trim()).filter(Boolean);
    if (!selectedPrescriptionIds.length && !trimmedCustomPoints.length) {
      await Swal.fire({
        icon: "warning",
        title: "Select at least one catalog prescription or add a custom point.",
      });
      return;
    }

    setCreating(true);
    try {
      await api.create(token, userId, {
        date,
        prescriptionIds: selectedPrescriptionIds,
        customPoints: trimmedCustomPoints,
      });
      await Swal.fire({ icon: "success", title: "Wellness prescription assigned", timer: 1500, showConfirmButton: false });
      setDate("");
      setSelectedPrescriptionIds([]);
      setCustomPoints([""]);
      setSearch("");
      await loadData();
    } catch (err) {
      if (err?.status === 401) onUnauthorized?.();
      else await Swal.fire({ icon: "error", title: "Assign failed", text: err.message || "Could not assign prescription." });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (assignment) => {
    const assignmentId = assignment.id || assignment._id;
    const confirm = await Swal.fire({
      icon: "warning",
      title: "Delete assignment?",
      text: "This will permanently remove this wellness prescription assignment.",
      showCancelButton: true,
      confirmButtonText: "Delete",
    });
    if (!confirm.isConfirmed) return;

    setDeletingId(assignmentId);
    try {
      await api.remove(token, userId, assignmentId);
      await Swal.fire({ icon: "success", title: "Deleted", timer: 1200, showConfirmButton: false });
      await loadData();
    } catch (err) {
      if (err?.status === 401) onUnauthorized?.();
      else await Swal.fire({ icon: "error", title: "Delete failed", text: err.message || "Could not delete." });
    } finally {
      setDeletingId("");
    }
  };

  if (notFound && NotFoundPage) return <NotFoundPage />;
  if (loading && PageLoader) return <PageLoader label="Loading wellness prescriptions…" />;

  return (
    <div className="user-page">
      <div className="user-page__toolbar">
        {backTo ? (
          <Link to={backTo} className="user-back-btn" aria-label="Back to clients">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18 9 12l6-6" />
            </svg>
          </Link>
        ) : null}
        <div className="user-page__toolbar-text">
          <h2 className="user-page__title">Wellness Prescriptions</h2>
          <p className="user-page__subtitle">Assign prescriptions from the catalog and/or add custom points (Heal users only).</p>
        </div>
      </div>

      {error ? (
        <p className="user-list-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="page-card diet-plan-page">
        {!readOnly ? (
          <form className="form-card diet-plan-upload" onSubmit={handleCreate}>
            <h3 className="form-card__title">Assign wellness prescription</h3>

            <div className="row g-3" style={{ marginTop: 16 }}>
              <label className="user-field col-12 col-md-4">
                <span className="user-field__label">
                  Date <span className="required-dot">*</span>
                </span>
                <input
                  className="user-field__input"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </label>
            </div>

            <div className="form-section" style={{ marginTop: 20 }}>
              <div className="form-section__header">
                <span className="user-field__label" style={{ marginBottom: 0 }}>
                  Select from catalog
                </span>
              </div>

              <div className="catalog-picker__toolbar">
                <label className="user-field">
                  <span className="user-field__label">Search</span>
                  <input
                    className="user-field__input"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Title, category…"
                  />
                </label>
                <label className="user-field">
                  <span className="user-field__label">Category</span>
                  <select className="user-field__input" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                    <option value="">All categories</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="catalog-picker__summary">
                  <span>
                    {selectedPrescriptionIds.length} selected · {filteredPrescriptions.length} shown
                  </span>
                  {selectedPrescriptionIds.length > 0 ? (
                    <button type="button" className="btn btn--ghost btn--sm" onClick={clearSelection}>
                      Clear
                    </button>
                  ) : null}
                </div>
              </div>

              {filteredPrescriptions.length === 0 ? (
                <p className="table-placeholder">No matching prescriptions. Try another filter or ask admin to add templates.</p>
              ) : (
                <div className="catalog-picker">
                  <div className="catalog-picker__grid">
                    {filteredPrescriptions.map((prescription) => {
                      const id = prescription.id || prescription._id;
                      return (
                        <PrescriptionPickerCard
                          key={id}
                          prescription={prescription}
                          selected={selectedPrescriptionIds.includes(id)}
                          onToggle={togglePrescription}
                          onViewPoints={setPreviewPrescription}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="form-section" style={{ marginTop: 20 }}>
              <div className="form-section__header">
                <span className="user-field__label" style={{ marginBottom: 0 }}>
                  Custom points (optional)
                </span>
                <button type="button" className="btn btn--ghost btn--sm" onClick={addCustomPoint}>
                  + Add custom point
                </button>
              </div>
              {customPoints.map((point, index) => (
                <div key={index} className="row g-3" style={{ marginBottom: 12 }}>
                  <label className="user-field col-12 col-md-10">
                    <span className="user-field__label">Custom point {index + 1}</span>
                    <textarea
                      className="user-field__input"
                      rows={2}
                      value={point}
                      maxLength={2000}
                      onChange={(e) => updateCustomPoint(index, e.target.value)}
                      placeholder="Type a custom recommendation for this client"
                    />
                  </label>
                  <div className="col-12 col-md-2 d-flex align-items-end">
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => removeCustomPoint(index)}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="diet-assign-form__actions">
              <span className="diet-assign-form__hint">
                {selectedPrescriptionIds.length || customPoints.some((p) => p.trim())
                  ? "Catalog selections and custom points will be combined into one assignment."
                  : "Select catalog items and/or add custom points."}
              </span>
              <button type="submit" className="btn btn--primary" disabled={creating || !date}>
                {creating ? "Assigning…" : "Assign prescription"}
              </button>
            </div>
          </form>
        ) : null}

        <section className="diet-plan-section">
          <h3 className="form-card__title">Current prescription</h3>
          {recommended ? (
            <AssignmentCard
              assignment={recommended}
              onDelete={handleDelete}
              deleting={Boolean(deletingId)}
              canDelete={!readOnly}
            />
          ) : (
            <p className="table-placeholder">No wellness prescription assigned yet.</p>
          )}
        </section>

        <section className="diet-plan-section">
          <h3 className="form-card__title">History</h3>
          {history.length === 0 ? (
            <p className="table-placeholder">No previous wellness prescription assignments.</p>
          ) : (
            <div className="diet-plan-list">
              {history.map((row) => (
                <AssignmentCard
                  key={row.id || row._id}
                  assignment={row}
                  onDelete={handleDelete}
                  deleting={deletingId === (row.id || row._id)}
                  canDelete={!readOnly}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <PrescriptionPointsModal prescription={previewPrescription} onClose={() => setPreviewPrescription(null)} />
    </div>
  );
}
