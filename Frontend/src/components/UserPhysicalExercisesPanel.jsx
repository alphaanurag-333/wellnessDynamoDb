import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import { CatalogPickerPagination } from "./CatalogPickerPagination.jsx";
import { CATALOG_PAGE_SIZE, emptyCatalogPagination } from "./catalogPickerConstants.js";
import { fetchActivePhysicalExerciseCatalog } from "../wellnessCoach/api/coachPhysicalExerciseCatalog.js";

function formatAssignedDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function exerciseTypeLabel(type) {
  return type === "video" ? "Video" : "YouTube";
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3">
      <path d="M5 12l5 5L19 7" />
    </svg>
  );
}

function ExercisePickerCard({ exercise, selected, onToggle }) {
  const id = exercise.id || exercise._id;

  return (
    <button
      type="button"
      className={`catalog-picker__card${selected ? " catalog-picker__card--selected" : ""}`}
      onClick={() => onToggle(id)}
      aria-pressed={selected}
    >
      <div className="catalog-picker__card-head">
        <span className="catalog-picker__card-name">{exercise.title}</span>
        <span className="catalog-picker__card-check" aria-hidden="true">
          {selected ? <CheckIcon /> : null}
        </span>
      </div>
      <div className="catalog-picker__card-meta">
        <span className="catalog-picker__badge catalog-picker__badge--type">
          {exerciseTypeLabel(exercise.type)}
        </span>
      </div>
      {exercise.description ? <p className="catalog-picker__card-desc">{exercise.description}</p> : null}
    </button>
  );
}

function AssignmentCard({ assignment, onRemove, removing, canRemove }) {
  const assignmentId = assignment.id || assignment._id;
  const exercise = assignment.exercise || {};
  const link = exercise.link;

  return (
    <article className="assignment-card">
      <div className="assignment-card__header">
        <div className="assignment-card__header-main">
          <div className="diet-plan-card__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6.5 6.5h11v11h-11z" />
              <path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4" />
            </svg>
          </div>
          <div>
            <div className="diet-plan-card__title">{exercise.title || "Exercise"}</div>
            <div className="diet-plan-card__date">
              {exerciseTypeLabel(exercise.type)}
              {assignment.createdAt ? ` · Assigned ${formatAssignedDate(assignment.createdAt)}` : ""}
            </div>
          </div>
        </div>
        <div className="assignment-card__header-actions">
          {link ? (
            <a href={link} target="_blank" rel="noopener noreferrer" className="btn btn--ghost btn--sm">
              Open
            </a>
          ) : null}
          {canRemove ? (
            <button
              type="button"
              className="btn btn--ghost btn--sm text-danger"
              onClick={() => onRemove(assignment)}
              disabled={removing}
            >
              Remove
            </button>
          ) : null}
        </div>
      </div>
      {exercise.description ? (
        <div className="assignment-card__body">
          <div className="assignment-card__note">{exercise.description}</div>
        </div>
      ) : null}
    </article>
  );
}

export function UserPhysicalExercisesPanel({
  token,
  userId,
  api,
  backTo,
  PageLoader,
  NotFoundPage,
  onUnauthorized,
  readOnly = false,
}) {
  const [catalogExercises, setCatalogExercises] = useState([]);
  const [catalogPage, setCatalogPage] = useState(1);
  const [catalogPagination, setCatalogPagination] = useState(() => emptyCatalogPagination());
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [removingId, setRemovingId] = useState("");
  const [selectedExercisesById, setSelectedExercisesById] = useState(() => new Map());
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const assignedExerciseIds = useMemo(
    () => new Set(assignments.map((row) => row.exerciseId || row.exercise?.id || row.exercise?._id).filter(Boolean)),
    [assignments]
  );

  const filteredExercises = useMemo(() => {
    return catalogExercises.filter((ex) => !assignedExerciseIds.has(ex.id || ex._id));
  }, [assignedExerciseIds, catalogExercises]);

  const selectedExerciseIds = useMemo(() => [...selectedExercisesById.keys()], [selectedExercisesById]);

  const selectedExercises = useMemo(() => [...selectedExercisesById.values()], [selectedExercisesById]);

  const loadAssignments = useCallback(async () => {
    if (!token || !userId) return;
    setError("");
    setNotFound(false);
    setLoading(true);
    try {
      const assigned = await api.list(token, userId);
      setAssignments(assigned.assignments ?? []);
    } catch (e) {
      if (e?.status === 401) {
        onUnauthorized?.();
        return;
      }
      if (e?.status === 404) {
        setNotFound(true);
        return;
      }
      setError(e.message || "Failed to load physical exercises.");
    } finally {
      setLoading(false);
    }
  }, [api, onUnauthorized, token, userId]);

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    try {
      const catalog = await fetchActivePhysicalExerciseCatalog({
        page: catalogPage,
        limit: CATALOG_PAGE_SIZE,
        search,
        type: typeFilter,
      });
      setCatalogExercises(catalog.physicalExercises ?? []);
      setCatalogPagination(catalog.pagination ?? emptyCatalogPagination(catalogPage));
    } catch (e) {
      setCatalogExercises([]);
      setCatalogPagination(emptyCatalogPagination(catalogPage));
      setError((prev) => prev || e.message || "Failed to load exercise catalog.");
    } finally {
      setCatalogLoading(false);
    }
  }, [catalogPage, search, typeFilter]);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    setCatalogPage(1);
  }, [search, typeFilter]);

  const toggleExercise = (exercise) => {
    const exerciseId = exercise.id || exercise._id;
    setSelectedExercisesById((prev) => {
      const next = new Map(prev);
      if (next.has(exerciseId)) next.delete(exerciseId);
      else next.set(exerciseId, exercise);
      return next;
    });
  };

  const clearSelection = () => setSelectedExercisesById(new Map());

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!token || !userId) return;
    if (!selectedExerciseIds.length) {
      await Swal.fire({ icon: "warning", title: "Select at least one exercise." });
      return;
    }

    setAssigning(true);
    try {
      const result = await api.assign(token, userId, { exerciseIds: selectedExerciseIds });
      const createdCount = result?.assignments?.length ?? 0;
      const skippedDuplicate = result?.skippedDuplicate?.length ?? 0;

      if (createdCount === 0) {
        await Swal.fire({
          icon: "info",
          title: "Nothing new assigned",
          text:
            skippedDuplicate > 0
              ? "Selected exercises are already assigned to this client."
              : "Selected exercises are invalid or inactive.",
        });
      } else {
        await Swal.fire({
          icon: "success",
          title: "Exercises assigned",
          timer: 1500,
          showConfirmButton: false,
        });
      }

      setSelectedExercisesById(new Map());
      setSearch("");
      setCatalogPage(1);
      await Promise.all([loadAssignments(), loadCatalog()]);
    } catch (err) {
      if (err?.status === 401) onUnauthorized?.();
      else await Swal.fire({ icon: "error", title: "Assign failed", text: err.message || "Could not assign exercises." });
    } finally {
      setAssigning(false);
    }
  };

  const handleRemove = async (assignment) => {
    const title = assignment.exercise?.title || "this exercise";
    const confirm = await Swal.fire({
      icon: "warning",
      title: "Remove exercise?",
      text: `"${title}" will be removed from this client's list.`,
      showCancelButton: true,
      confirmButtonText: "Remove",
    });
    if (!confirm.isConfirmed) return;

    const assignmentId = assignment.id || assignment._id;
    setRemovingId(assignmentId);
    try {
      await api.remove(token, userId, assignmentId);
      await Swal.fire({ icon: "success", title: "Removed", timer: 1200, showConfirmButton: false });
      await loadAssignments();
    } catch (err) {
      if (err?.status === 401) onUnauthorized?.();
      else await Swal.fire({ icon: "error", title: "Remove failed", text: err.message || "Could not remove exercise." });
    } finally {
      setRemovingId("");
    }
  };

  if (notFound && NotFoundPage) return <NotFoundPage />;
  if (loading && PageLoader) return <PageLoader label="Loading physical exercises…" />;

  const embedded = !backTo;

  return (
    <div className={embedded ? "client-hub-embedded-panel client-hub-module-panel" : "user-page"}>
      {embedded ? (
        <div className="client-hub-embedded-panel__header">
          <h2 className="client-hub-embedded-panel__title">Physical Exercises</h2>
          <p className="client-hub-embedded-panel__subtitle">
            Assign workout videos from the catalog to this client&apos;s exercise list.
          </p>
        </div>
      ) : (
        <div className="user-page__toolbar">
          <Link to={backTo} className="user-back-btn" aria-label="Back to clients">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18 9 12l6-6" />
            </svg>
          </Link>
          <div className="user-page__toolbar-text">
            <h2 className="user-page__title">Physical Exercises</h2>
            <p className="user-page__subtitle">Assign exercises from the admin catalog to this client.</p>
          </div>
        </div>
      )}

      {error ? (
        <p className="user-list-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className={embedded ? "client-hub-module-panel__content" : "page-card diet-plan-page"}>
        {!readOnly ? (
          <form
            className={`form-card diet-plan-upload${embedded ? " form-card--embedded" : ""}`}
            onSubmit={handleAssign}
          >
            <h3 className="form-card__title">Assign from catalog</h3>

            <div className="form-section">
              <div className="form-section__header">
                <span className="user-field__label" style={{ marginBottom: 0 }}>
                  Select exercises <span className="required-dot">*</span>
                </span>
              </div>

              <div className="catalog-picker__toolbar">
                <label className="user-field">
                  <span className="user-field__label">Search</span>
                  <input
                    className="user-field__input"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Exercise name or description…"
                  />
                </label>
                <label className="user-field">
                  <span className="user-field__label">Type</span>
                  <select className="user-field__input" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                    <option value="">All types</option>
                    <option value="ytlink">YouTube</option>
                    <option value="video">Video</option>
                  </select>
                </label>
                <div className="catalog-picker__summary">
                  <span>
                    {selectedExerciseIds.length} selected · {catalogPagination.total || 0} total
                  </span>
                  {selectedExerciseIds.length > 0 ? (
                    <button type="button" className="btn btn--ghost btn--sm" onClick={clearSelection}>
                      Clear
                    </button>
                  ) : null}
                </div>
              </div>

              {filteredExercises.length === 0 && !catalogLoading ? (
                <p className="table-placeholder">
                  {catalogPagination.total === 0
                    ? "No active exercises in catalog. Ask admin to add exercises."
                    : assignments.length > 0
                      ? "All exercises on this page are already assigned, or none match your filters."
                      : "No matching exercises. Try another search or filter."}
                </p>
              ) : (
                <>
                  <div className="catalog-picker">
                    <div className={`catalog-picker__grid${catalogLoading ? " catalog-picker__grid--loading" : ""}`}>
                      {filteredExercises.map((exercise) => {
                        const id = exercise.id || exercise._id;
                        return (
                          <ExercisePickerCard
                            key={id}
                            exercise={exercise}
                            selected={selectedExerciseIds.includes(id)}
                            onToggle={() => toggleExercise(exercise)}
                          />
                        );
                      })}
                    </div>
                  </div>
                  <CatalogPickerPagination
                    page={catalogPagination.page || catalogPage}
                    pages={catalogPagination.pages || 1}
                    total={catalogPagination.total || 0}
                    loading={catalogLoading}
                    onPageChange={setCatalogPage}
                  />
                </>
              )}

              {selectedExercises.length > 0 ? (
                <div className="client-hub-module-panel__selection">
                  <span className="client-hub-module-panel__selection-label">Selected exercises</span>
                  <div className="plan-chip-list">
                    {selectedExercises.map((exercise) => (
                      <div key={exercise.id || exercise._id} className="plan-chip">
                        <span className="plan-chip__name">{exercise.title}</span>
                        <span className="plan-chip__meta">{exerciseTypeLabel(exercise.type)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="diet-assign-form__actions">
              <span className="diet-assign-form__hint">
                {selectedExerciseIds.length
                  ? `${selectedExerciseIds.length} exercise(s) will be assigned to this client.`
                  : "Select one or more exercises to assign."}
              </span>
              <button
                type="submit"
                className="btn btn--primary"
                disabled={assigning || !selectedExerciseIds.length}
              >
                {assigning ? "Assigning…" : "Assign selected"}
              </button>
            </div>
          </form>
        ) : null}

        <section className="diet-plan-section client-hub-module-panel__section">
          <h3 className="form-card__title">Assigned exercises ({assignments.length})</h3>
          {assignments.length === 0 ? (
            <p className="table-placeholder">No exercises assigned yet.</p>
          ) : (
            <div className="diet-plan-list">
              {assignments.map((assignment) => (
                <AssignmentCard
                  key={assignment.id || assignment._id}
                  assignment={assignment}
                  onRemove={handleRemove}
                  removing={removingId === (assignment.id || assignment._id)}
                  canRemove={!readOnly}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
