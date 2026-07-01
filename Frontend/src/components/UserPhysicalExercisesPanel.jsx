import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
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
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [removingId, setRemovingId] = useState("");
  const [selectedExerciseIds, setSelectedExerciseIds] = useState([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const assignedExerciseIds = useMemo(
    () => new Set(assignments.map((row) => row.exerciseId || row.exercise?.id || row.exercise?._id).filter(Boolean)),
    [assignments]
  );

  const availableCatalog = useMemo(
    () => catalogExercises.filter((ex) => !assignedExerciseIds.has(ex.id || ex._id)),
    [catalogExercises, assignedExerciseIds]
  );

  const filteredExercises = useMemo(() => {
    const q = search.trim().toLowerCase();
    let exercises = availableCatalog;

    if (typeFilter) {
      exercises = exercises.filter((ex) => ex.type === typeFilter);
    }

    if (q) {
      exercises = exercises.filter((ex) => {
        const haystack = [ex.title, ex.description, exerciseTypeLabel(ex.type)].filter(Boolean).join(" ").toLowerCase();
        return haystack.includes(q);
      });
    }

    return [...exercises].sort((a, b) => String(a.title || "").localeCompare(String(b.title || "")));
  }, [availableCatalog, search, typeFilter]);

  const loadData = useCallback(async () => {
    if (!token || !userId) return;
    setError("");
    setNotFound(false);
    setLoading(true);
    try {
      const [catalog, assigned] = await Promise.all([
        fetchActivePhysicalExerciseCatalog(),
        api.list(token, userId),
      ]);
      setCatalogExercises(catalog.physicalExercises ?? []);
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

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleExercise = (exerciseId) => {
    setSelectedExerciseIds((prev) =>
      prev.includes(exerciseId) ? prev.filter((id) => id !== exerciseId) : [...prev, exerciseId]
    );
  };

  const clearSelection = () => setSelectedExerciseIds([]);

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

      setSelectedExerciseIds([]);
      setSearch("");
      await loadData();
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
      await loadData();
    } catch (err) {
      if (err?.status === 401) onUnauthorized?.();
      else await Swal.fire({ icon: "error", title: "Remove failed", text: err.message || "Could not remove exercise." });
    } finally {
      setRemovingId("");
    }
  };

  if (notFound && NotFoundPage) return <NotFoundPage />;
  if (loading && PageLoader) return <PageLoader label="Loading physical exercises…" />;

  return (
    <div className="user-page">
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

      {error ? (
        <p className="user-list-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="page-card diet-plan-page">
        {!readOnly ? (
          <form className="form-card diet-plan-upload" onSubmit={handleAssign}>
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
                    {selectedExerciseIds.length} selected · {filteredExercises.length} available
                  </span>
                  {selectedExerciseIds.length > 0 ? (
                    <button type="button" className="btn btn--ghost btn--sm" onClick={clearSelection}>
                      Clear
                    </button>
                  ) : null}
                </div>
              </div>

              {filteredExercises.length === 0 ? (
                <p className="table-placeholder">
                  {catalogExercises.length === 0
                    ? "No active exercises in catalog. Ask admin to add exercises."
                    : availableCatalog.length === 0
                      ? "All catalog exercises are already assigned to this client."
                      : "No matching exercises. Try another search or filter."}
                </p>
              ) : (
                <div className="catalog-picker">
                  <div className="catalog-picker__grid">
                    {filteredExercises.map((exercise) => {
                      const id = exercise.id || exercise._id;
                      return (
                        <ExercisePickerCard
                          key={id}
                          exercise={exercise}
                          selected={selectedExerciseIds.includes(id)}
                          onToggle={toggleExercise}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
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

        <section className="diet-plan-section">
          <h3 className="form-card__title">Assigned exercises</h3>
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
