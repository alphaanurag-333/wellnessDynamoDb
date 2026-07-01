import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import { fetchActiveDietPlanCatalog } from "../wellnessCoach/api/coachDietPlanCatalog.js";
import { typeLabel } from "../admin/pages/dietPlanCatalog/DietPlanCatalogShared.js";

function formatStartDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function AssignmentCard({ assignment, onDelete, deleting, canDelete }) {
  const assignmentId = assignment.id || assignment._id;
  const pdfUrl = assignment.pdfUrl;
  const planNames = (assignment.plans || []).map((p) => p.name).join(", ");

  return (
    <div className="diet-plan-card">
      <div className="diet-plan-card__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      </div>
      <div className="diet-plan-card__body">
        <div className="diet-plan-card__title">Start date: {formatStartDate(assignment.startDate)}</div>
        <div className="diet-plan-card__date">{planNames || "Assigned diet plan"}</div>
        <div className="diet-plan-card__note">
          {(assignment.plans || []).map((p) => typeLabel(p.type)).filter(Boolean).join(" · ") || "—"}
        </div>
        {assignment.note ? <div className="diet-plan-card__note">{assignment.note}</div> : null}
      </div>
      <div className="diet-plan-card__actions">
        {pdfUrl ? (
          <>
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="btn btn--ghost btn--sm">
              View
            </a>
            <a href={pdfUrl} download className="btn btn--primary btn--sm">
              Download
            </a>
          </>
        ) : null}
        {canDelete ? (
          <button
            type="button"
            className="btn btn--ghost btn--sm text-danger"
            onClick={() => onDelete(assignment)}
            disabled={deleting}
          >
            Delete
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function UserDietPlanCatalogPanel({
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
  const [catalogPlans, setCatalogPlans] = useState([]);
  const [recommended, setRecommended] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [note, setNote] = useState("");
  const [selectedPlanIds, setSelectedPlanIds] = useState([]);
  const [typeFilter, setTypeFilter] = useState("");

  const loadData = useCallback(async () => {
    if (!token || !userId) return;
    setError("");
    setNotFound(false);
    setLoading(true);
    try {
      const [catalog, assignments] = await Promise.all([
        fetchActiveDietPlanCatalog(),
        api.list(token, userId),
      ]);
      setCatalogGrouped(catalog.groupedByType ?? {});
      setCatalogPlans(catalog.plans ?? []);
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
      setError(e.message || "Failed to load diet plan assignments.");
    } finally {
      setLoading(false);
    }
  }, [api, onUnauthorized, token, userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const dietTypes = useMemo(() => {
    const keys = Object.keys(catalogGrouped);
    if (keys.length) return keys.sort();
    return [...new Set(catalogPlans.map((p) => p.type).filter(Boolean))].sort();
  }, [catalogGrouped, catalogPlans]);

  const visibleTypes = useMemo(() => {
    if (!typeFilter) return dietTypes;
    return dietTypes.filter((t) => t === typeFilter);
  }, [dietTypes, typeFilter]);

  const togglePlan = (planId) => {
    setSelectedPlanIds((prev) =>
      prev.includes(planId) ? prev.filter((id) => id !== planId) : [...prev, planId]
    );
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!token || !userId) return;
    if (!startDate) {
      await Swal.fire({ icon: "warning", title: "Select a start date." });
      return;
    }
    if (!selectedPlanIds.length) {
      await Swal.fire({ icon: "warning", title: "Select at least one diet plan." });
      return;
    }

    setCreating(true);
    try {
      await api.create(token, userId, {
        startDate,
        planIds: selectedPlanIds,
        note: note.trim() || undefined,
      });
      await Swal.fire({ icon: "success", title: "Diet plan assigned", timer: 1500, showConfirmButton: false });
      setStartDate("");
      setNote("");
      setSelectedPlanIds([]);
      await loadData();
    } catch (err) {
      if (err?.status === 401) onUnauthorized?.();
      else await Swal.fire({ icon: "error", title: "Assign failed", text: err.message || "Could not assign diet plan." });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (assignment) => {
    const assignmentId = assignment.id || assignment._id;
    const confirm = await Swal.fire({
      icon: "warning",
      title: "Delete assignment?",
      text: "This will permanently remove the assigned diet plan PDF.",
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
  if (loading && PageLoader) return <PageLoader label="Loading diet plans…" />;

  return (
    <div className="user-page">
      <div className="user-page__toolbar">
        <Link to={backTo} className="user-back-btn" aria-label="Back to clients">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18 9 12l6-6" />
          </svg>
        </Link>
        <div className="user-page__toolbar-text">
          <h2 className="user-page__title">Diet Plan</h2>
          <p className="user-page__subtitle">Assign diet plans from the catalog by client type (Heal users only).</p>
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
            <h3 className="form-card__title">Assign diet plan from catalog</h3>
            <div className="form-grid">
              <label className="user-field">
                <span className="user-field__label">Start date</span>
                <input
                  className="user-field__input"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </label>
              <label className="user-field">
                <span className="user-field__label">Filter by diet type</span>
                <select className="user-field__input" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                  <option value="">All types</option>
                  {dietTypes.map((t) => (
                    <option key={t} value={t}>
                      {typeLabel(t)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="user-field user-field--full">
                <span className="user-field__label">Coach note (optional)</span>
                <textarea
                  className="user-field__input"
                  rows={2}
                  value={note}
                  maxLength={2000}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Instructions for this client"
                />
              </label>
            </div>

            <div className="form-section" style={{ marginTop: 16 }}>
              <span className="user-field__label">Select plans from catalog</span>
              {visibleTypes.length === 0 ? (
                <p className="table-placeholder">No active diet plans in catalog. Ask admin to add plans.</p>
              ) : (
                visibleTypes.map((dietType) => {
                  const plans =
                    catalogGrouped[dietType] || catalogPlans.filter((p) => p.type === dietType);
                  return (
                    <div key={dietType} style={{ marginTop: 12 }}>
                      <div className="form-card__title" style={{ fontSize: "0.95rem" }}>
                        {typeLabel(dietType)}
                      </div>
                      <div className="checkbox-list">
                        {plans.map((plan) => {
                          const id = plan.id || plan._id;
                          return (
                            <label key={id} className="checkbox-list__item">
                              <input
                                type="checkbox"
                                checked={selectedPlanIds.includes(id)}
                                onChange={() => togglePlan(id)}
                              />
                              <span>
                                {plan.name}
                                <small className="data-table__muted"> ({plan.category})</small>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="form-card__actions">
              <button type="submit" className="btn btn--primary" disabled={creating || !selectedPlanIds.length}>
                {creating ? "Assigning…" : "Assign diet plan"}
              </button>
            </div>
          </form>
        ) : null}

        <section className="diet-plan-section">
          <h3 className="form-card__title">Current diet plan</h3>
          {recommended ? (
            <AssignmentCard
              assignment={recommended}
              onDelete={handleDelete}
              deleting={Boolean(deletingId)}
              canDelete={!readOnly}
            />
          ) : (
            <p className="table-placeholder">No diet plan assigned yet.</p>
          )}
        </section>

        <section className="diet-plan-section">
          <h3 className="form-card__title">History</h3>
          {history.length === 0 ? (
            <p className="table-placeholder">No previous diet plan assignments.</p>
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
    </div>
  );
}
