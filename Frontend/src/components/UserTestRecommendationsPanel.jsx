import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import { fetchActiveTestCatalog } from "../wellnessCoach/api/coachTestCatalog.js";

function formatReportDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function RecommendationCard({ recommendation, onDelete, deleting, canDelete }) {
  const recId = recommendation.id || recommendation._id;
  const pdfUrl = recommendation.pdfUrl;
  const testNames = (recommendation.tests || []).map((t) => t.name).join(", ");

  return (
    <div className="diet-plan-card">
      <div className="diet-plan-card__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      </div>
      <div className="diet-plan-card__body">
        <div className="diet-plan-card__title">Report date: {formatReportDate(recommendation.reportDate)}</div>
        <div className="diet-plan-card__date">{testNames || "Recommended tests"}</div>
        <div className="diet-plan-card__note">
          {(recommendation.tests || []).length} test(s) selected
        </div>
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
            onClick={() => onDelete(recommendation)}
            disabled={deleting}
          >
            Delete
          </button>
        ) : null}
      </div>
    </div>
  );
}

function LabReportCard({ report }) {
  const fileUrl = report.fileUrl;

  return (
    <div className="diet-plan-card">
      <div className="diet-plan-card__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      </div>
      <div className="diet-plan-card__body">
        <div className="diet-plan-card__title">Report date: {formatReportDate(report.reportDate)}</div>
        <div className="diet-plan-card__date">Uploaded by client</div>
        {report.createdAt ? (
          <div className="diet-plan-card__note">Submitted {formatReportDate(report.createdAt)}</div>
        ) : null}
      </div>
      <div className="diet-plan-card__actions">
        {fileUrl ? (
          <>
            <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="btn btn--ghost btn--sm">
              View
            </a>
            <a href={fileUrl} download className="btn btn--primary btn--sm">
              Download
            </a>
          </>
        ) : (
          <span className="data-table__muted">No file</span>
        )}
      </div>
    </div>
  );
}

export function UserTestRecommendationsPanel({
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
  const [catalogTests, setCatalogTests] = useState([]);
  const [recommended, setRecommended] = useState(null);
  const [history, setHistory] = useState([]);
  const [labReports, setLabReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [reportDate, setReportDate] = useState("");
  const [selectedTestIds, setSelectedTestIds] = useState([]);

  const loadData = useCallback(async () => {
    if (!token || !userId) return;
    setError("");
    setNotFound(false);
    setLoading(true);
    try {
      const [catalog, recs, reportsResult] = await Promise.all([
        fetchActiveTestCatalog(),
        api.list(token, userId),
        api.listLabReports ? api.listLabReports(token, userId) : Promise.resolve({ reports: [] }),
      ]);
      setCatalogGrouped(catalog.grouped ?? {});
      setCatalogTests(catalog.tests ?? []);
      setRecommended(recs.recommended ?? null);
      setHistory(recs.history ?? []);
      setLabReports(reportsResult?.reports ?? []);
    } catch (e) {
      if (e?.status === 401) {
        onUnauthorized?.();
        return;
      }
      if (e?.status === 404) {
        setNotFound(true);
        return;
      }
      setError(e.message || "Failed to load test recommendations.");
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
    const fromTests = [...new Set(catalogTests.map((t) => t.category).filter(Boolean))];
    return fromTests.sort();
  }, [catalogGrouped, catalogTests]);

  const toggleTest = (testId) => {
    setSelectedTestIds((prev) =>
      prev.includes(testId) ? prev.filter((id) => id !== testId) : [...prev, testId]
    );
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!token || !userId) return;
    if (!reportDate) {
      await Swal.fire({ icon: "warning", title: "Select a report date." });
      return;
    }
    if (!selectedTestIds.length) {
      await Swal.fire({ icon: "warning", title: "Select at least one test." });
      return;
    }

    setCreating(true);
    try {
      await api.create(token, userId, { reportDate, testIds: selectedTestIds });
      await Swal.fire({ icon: "success", title: "Recommendation created", timer: 1500, showConfirmButton: false });
      setReportDate("");
      setSelectedTestIds([]);
      await loadData();
    } catch (err) {
      if (err?.status === 401) onUnauthorized?.();
      else await Swal.fire({ icon: "error", title: "Create failed", text: err.message || "Could not create recommendation." });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (rec) => {
    const recId = rec.id || rec._id;
    const confirm = await Swal.fire({
      icon: "warning",
      title: "Delete recommendation?",
      text: "This will permanently remove the recommendation PDF.",
      showCancelButton: true,
      confirmButtonText: "Delete",
    });
    if (!confirm.isConfirmed) return;

    setDeletingId(recId);
    try {
      await api.remove(token, userId, recId);
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
  if (loading && PageLoader) return <PageLoader label="Loading test recommendations…" />;

  return (
    <div className="user-page">
      <div className="user-page__toolbar">
        <Link to={backTo} className="user-back-btn" aria-label="Back to clients">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18 9 12l6-6" />
          </svg>
        </Link>
        <div className="user-page__toolbar-text">
          <h2 className="user-page__title">Internal Parameters</h2>
          <p className="user-page__subtitle">Recommend blood tests and generate a downloadable PDF list.</p>
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
            <h3 className="form-card__title">Create new recommendation</h3>
            <div className="form-grid">
              <label className="user-field">
                <span className="user-field__label">Report date</span>
                <input
                  className="user-field__input"
                  type="date"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  required
                />
              </label>
            </div>

            <div className="form-section" style={{ marginTop: 16 }}>
              <span className="user-field__label">Select tests from catalog</span>
              {categories.length === 0 ? (
                <p className="table-placeholder">No active tests in catalog. Ask admin to add tests.</p>
              ) : (
                categories.map((category) => {
                  const tests = catalogGrouped[category] || catalogTests.filter((t) => t.category === category);
                  return (
                    <div key={category} style={{ marginTop: 12 }}>
                      <div className="form-card__title" style={{ fontSize: "0.95rem" }}>
                        {category}
                      </div>
                      <div className="checkbox-list">
                        {tests.map((test) => {
                          const id = test.id || test._id;
                          return (
                            <label key={id} className="checkbox-list__item">
                              <input
                                type="checkbox"
                                checked={selectedTestIds.includes(id)}
                                onChange={() => toggleTest(id)}
                              />
                              <span>
                                {test.name}
                                <small className="data-table__muted"> ({test.type})</small>
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
              <button type="submit" className="btn btn--primary" disabled={creating || !selectedTestIds.length}>
                {creating ? "Creating…" : "Create recommendation"}
              </button>
            </div>
          </form>
        ) : null}

        <section className="diet-plan-section">
          <h3 className="form-card__title">Current recommendation</h3>
          {recommended ? (
            <RecommendationCard
              recommendation={recommended}
              onDelete={handleDelete}
              deleting={Boolean(deletingId)}
              canDelete={!readOnly}
            />
          ) : (
            <p className="table-placeholder">No recommendation created yet.</p>
          )}
        </section>

        <section className="diet-plan-section">
          <h3 className="form-card__title">History</h3>
          {history.length === 0 ? (
            <p className="table-placeholder">No previous recommendations.</p>
          ) : (
            <div className="diet-plan-list">
              {history.map((rec) => (
                <RecommendationCard
                  key={rec.id || rec._id}
                  recommendation={rec}
                  onDelete={handleDelete}
                  deleting={deletingId === (rec.id || rec._id)}
                  canDelete={!readOnly}
                />
              ))}
            </div>
          )}
        </section>

        <section className="diet-plan-section">
          <h3 className="form-card__title">User uploaded reports</h3>
          {labReports.length === 0 ? (
            <p className="table-placeholder">No reports uploaded by the client yet.</p>
          ) : (
            <div className="diet-plan-list">
              {labReports.map((report) => (
                <LabReportCard key={report.id || report._id} report={report} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
