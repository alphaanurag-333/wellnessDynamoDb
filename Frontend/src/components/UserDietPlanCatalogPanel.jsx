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

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3">
      <path d="M5 12l5 5L19 7" />
    </svg>
  );
}

function AssignmentCard({ assignment, onDelete, deleting, canDelete }) {
  const pdfUrl = assignment.pdfUrl;
  const plans = assignment.plans || [];
  const planCount = plans.length;

  return (
    <article className="assignment-card">
      <div className="assignment-card__header">
        <div className="assignment-card__header-main">
          <div className="diet-plan-card__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <div>
            <div className="diet-plan-card__title">Start date: {formatStartDate(assignment.startDate)}</div>
            <div className="diet-plan-card__date">
              {planCount} plan{planCount === 1 ? "" : "s"} assigned
            </div>
          </div>
        </div>
        <div className="assignment-card__header-actions">
          {pdfUrl ? (
            <>
              <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="btn btn--ghost btn--sm">
                View PDF
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
      <div className="assignment-card__body">
        {assignment.note ? (
          <div className="assignment-card__note">
            <span className="assignment-card__note-label">Coach note</span>
            {assignment.note}
          </div>
        ) : null}
        {planCount > 0 ? (
          <div className="plan-chip-list">
            {plans.map((plan) => (
              <div key={plan.planId || plan.name} className="plan-chip">
                <span className="plan-chip__name">{plan.name}</span>
                <span className="plan-chip__meta">
                  {typeLabel(plan.type)}
                  {plan.category ? ` · ${plan.category}` : ""}
                  {Array.isArray(plan.meals) && plan.meals.length ? ` · ${plan.meals.length} meals` : ""}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="table-placeholder">No plan details available.</p>
        )}
      </div>
    </article>
  );
}

function PlanPickerCard({ plan, selected, onToggle }) {
  const id = plan.id || plan._id;
  const mealCount = Array.isArray(plan.meals) ? plan.meals.length : 0;

  return (
    <button
      type="button"
      className={`catalog-picker__card${selected ? " catalog-picker__card--selected" : ""}`}
      onClick={() => onToggle(id)}
      aria-pressed={selected}
    >
      <div className="catalog-picker__card-head">
        <span className="catalog-picker__card-name">{plan.name}</span>
        <span className="catalog-picker__card-check" aria-hidden="true">
          {selected ? <CheckIcon /> : null}
        </span>
      </div>
      <div className="catalog-picker__card-meta">
        <span className="catalog-picker__badge catalog-picker__badge--type">{typeLabel(plan.type)}</span>
        {plan.category ? <span className="catalog-picker__badge">{plan.category}</span> : null}
        {mealCount > 0 ? <span className="catalog-picker__badge">{mealCount} meals</span> : null}
      </div>
      {plan.description ? <p className="catalog-picker__card-desc">{plan.description}</p> : null}
    </button>
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
  const [search, setSearch] = useState("");

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

  const filteredPlans = useMemo(() => {
    const q = search.trim().toLowerCase();
    let plans = typeFilter
      ? catalogGrouped[typeFilter] || catalogPlans.filter((p) => p.type === typeFilter)
      : catalogPlans;

    if (q) {
      plans = plans.filter((plan) => {
        const haystack = [plan.name, plan.category, plan.description, typeLabel(plan.type)]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      });
    }

    return [...plans].sort((a, b) => {
      const typeDiff = String(a.type || "").localeCompare(String(b.type || ""));
      if (typeDiff !== 0) return typeDiff;
      return String(a.name || "").localeCompare(String(b.name || ""));
    });
  }, [catalogGrouped, catalogPlans, search, typeFilter]);

  const togglePlan = (planId) => {
    setSelectedPlanIds((prev) =>
      prev.includes(planId) ? prev.filter((id) => id !== planId) : [...prev, planId]
    );
  };

  const clearSelection = () => setSelectedPlanIds([]);

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
      setSearch("");
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

            <div className="row g-3" style={{ marginTop: 16 }}>
              <label className="user-field col-12 col-md-4">
                <span className="user-field__label">
                  Start date <span className="required-dot">*</span>
                </span>
                <input
                  className="user-field__input"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </label>
              <label className="user-field col-12 col-md-8">
                <span className="user-field__label">Coach note (optional)</span>
                <input
                  className="user-field__input"
                  value={note}
                  maxLength={2000}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Instructions or context for this client"
                />
              </label>
            </div>

            <div className="form-section" style={{ marginTop: 20 }}>
              <div className="form-section__header">
                <span className="user-field__label" style={{ marginBottom: 0 }}>
                  Select plans from catalog <span className="required-dot">*</span>
                </span>
              </div>

              <div className="catalog-picker__toolbar">
                <label className="user-field">
                  <span className="user-field__label">Search</span>
                  <input
                    className="user-field__input"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Plan name, category, type…"
                  />
                </label>
                <label className="user-field">
                  <span className="user-field__label">Diet type</span>
                  <select className="user-field__input" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                    <option value="">All types</option>
                    {dietTypes.map((t) => (
                      <option key={t} value={t}>
                        {typeLabel(t)}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="catalog-picker__summary">
                  <span>
                    {selectedPlanIds.length} selected · {filteredPlans.length} shown
                  </span>
                  {selectedPlanIds.length > 0 ? (
                    <button type="button" className="btn btn--ghost btn--sm" onClick={clearSelection}>
                      Clear
                    </button>
                  ) : null}
                </div>
              </div>

              {filteredPlans.length === 0 ? (
                <p className="table-placeholder">No matching diet plans. Try another filter or ask admin to add plans.</p>
              ) : (
                <div className="catalog-picker">
                  <div className="catalog-picker__grid">
                    {filteredPlans.map((plan) => {
                      const id = plan.id || plan._id;
                      return (
                        <PlanPickerCard
                          key={id}
                          plan={plan}
                          selected={selectedPlanIds.includes(id)}
                          onToggle={togglePlan}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="diet-assign-form__actions">
              <span className="diet-assign-form__hint">
                {selectedPlanIds.length
                  ? `${selectedPlanIds.length} plan(s) will be included in the PDF assignment.`
                  : "Select one or more plans to assign."}
              </span>
              <button type="submit" className="btn btn--primary" disabled={creating || !selectedPlanIds.length || !startDate}>
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
