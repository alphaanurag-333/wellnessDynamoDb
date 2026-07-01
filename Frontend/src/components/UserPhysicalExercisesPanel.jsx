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

function AssignmentCard({ assignment, onRemove, removing, canRemove }) {
  const assignmentId = assignment.id || assignment._id;
  const exercise = assignment.exercise || {};
  const link = exercise.link;

  return (
    <div className="diet-plan-card">
      <div className="diet-plan-card__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6.5 6.5h11v11h-11z" />
          <path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4" />
        </svg>
      </div>
      <div className="diet-plan-card__body">
        <div className="diet-plan-card__title">{exercise.title || "Exercise"}</div>
        <div className="diet-plan-card__date">
          {exercise.type === "video" ? "Video" : "YouTube link"}
          {assignment.createdAt ? ` · Assigned ${formatAssignedDate(assignment.createdAt)}` : ""}
        </div>
        {exercise.description ? (
          <div className="diet-plan-card__note">{exercise.description}</div>
        ) : null}
      </div>
      <div className="diet-plan-card__actions">
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

  const assignedExerciseIds = useMemo(
    () => new Set(assignments.map((row) => row.exerciseId || row.exercise?.id || row.exercise?._id).filter(Boolean)),
    [assignments]
  );

  const availableCatalog = useMemo(
    () => catalogExercises.filter((ex) => !assignedExerciseIds.has(ex.id || ex._id)),
    [catalogExercises, assignedExerciseIds]
  );

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
      const skippedInvalid = result?.skippedInvalid?.length ?? 0;

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
      await loadData();
    } catch (err) {
      if (err?.status === 401) onUnauthorized?.();
      else await Swal.fire({ icon: "error", title: "Assign failed", text: err.message || "Could not assign exercises." });
    } finally {
      setAssigning(false);
    }
  };

  const handleRemove = async (assignment) => {
    const assignmentId = assignment.id || assignment._id;
    const title = assignment.exercise?.title || "this exercise";
    const confirm = await Swal.fire({
      icon: "warning",
      title: "Remove exercise?",
      text: `"${title}" will be removed from this client's list.`,
      showCancelButton: true,
      confirmButtonText: "Remove",
    });
    if (!confirm.isConfirmed) return;

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
            {availableCatalog.length === 0 ? (
              <p className="table-placeholder">
                {catalogExercises.length === 0
                  ? "No active exercises in catalog. Ask admin to add exercises."
                  : "All catalog exercises are already assigned to this client."}
              </p>
            ) : (
              <div className="checkbox-list">
                {availableCatalog.map((exercise) => {
                  const id = exercise.id || exercise._id;
                  return (
                    <label key={id} className="checkbox-list__item">
                      <input
                        type="checkbox"
                        checked={selectedExerciseIds.includes(id)}
                        onChange={() => toggleExercise(id)}
                      />
                      <span>
                        {exercise.title}
                        <small className="data-table__muted">
                          {" "}
                          ({exercise.type === "video" ? "Video" : "YouTube"})
                        </small>
                      </span>
                    </label>
                  );
                })}
              </div>
            )}

            <div className="form-card__actions">
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
