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

function testTypeLabel(type) {
  const value = String(type || "").toUpperCase();
  if (value === "PROFILE") return "Profile";
  if (value === "SINGLE") return "Single";
  return type || "Test";
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3">
      <path d="M5 12l5 5L19 7" />
    </svg>
  );
}

function TestPickerCard({ test, selected, onToggle }) {
  const id = test.id || test._id;

  return (
    <button
      type="button"
      className={`catalog-picker__card${selected ? " catalog-picker__card--selected" : ""}`}
      onClick={() => onToggle(id)}
      aria-pressed={selected}
    >
      <div className="catalog-picker__card-head">
        <span className="catalog-picker__card-name">{test.name}</span>
        <span className="catalog-picker__card-check" aria-hidden="true">
          {selected ? <CheckIcon /> : null}
        </span>
      </div>
      <div className="catalog-picker__card-meta">
        <span className="catalog-picker__badge catalog-picker__badge--type">{testTypeLabel(test.type)}</span>
        {test.category ? <span className="catalog-picker__badge">{test.category}</span> : null}
      </div>
    </button>
  );
}

function RecommendationCard({ recommendation, onDelete, deleting, canDelete }) {
  const pdfUrl = recommendation.pdfUrl;
  const tests = recommendation.tests || [];

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
            <div className="diet-plan-card__title">Report date: {formatReportDate(recommendation.reportDate)}</div>
            <div className="diet-plan-card__date">
              {tests.length} test{tests.length === 1 ? "" : "s"} selected
            </div>
          </div>
        </div>
        <div className="assignment-card__header-actions">
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
      <div className="assignment-card__body">
        {tests.length > 0 ? (
          <div className="plan-chip-list">
            {tests.map((test) => (
              <div key={test.id || test._id || test.name} className="plan-chip">
                <span className="plan-chip__name">{test.name}</span>
                <span className="plan-chip__meta">{testTypeLabel(test.type)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="table-placeholder" style={{ margin: 0 }}>
            No test details available.
          </p>
        )}
      </div>
    </article>
  );
}

function LabReportCard({ report }) {
  const fileUrl = report.fileUrl;

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
            <div className="diet-plan-card__title">Report date: {formatReportDate(report.reportDate)}</div>
            <div className="diet-plan-card__date">Uploaded by client</div>
          </div>
        </div>
        <div className="assignment-card__header-actions">
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
      {report.createdAt ? (
        <div className="assignment-card__body">
          <div className="diet-plan-card__note">Submitted {formatReportDate(report.createdAt)}</div>
        </div>
      ) : null}
    </article>
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
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

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

  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    const activeCategory = categoryFilter.trim();

    return categories
      .filter((category) => !activeCategory || category === activeCategory)
      .map((category) => {
        const tests = catalogGrouped[category] || catalogTests.filter((t) => t.category === category);
        const filteredTests = q
          ? tests.filter((test) => {
              const haystack = [test.name, test.type, test.category].filter(Boolean).join(" ").toLowerCase();
              return haystack.includes(q);
            })
          : tests;

        return { category, tests: [...filteredTests].sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""))) };
      })
      .filter((group) => group.tests.length > 0);
  }, [catalogGrouped, catalogTests, categories, categoryFilter, search]);

  const visibleTestCount = useMemo(
    () => filteredCategories.reduce((sum, group) => sum + group.tests.length, 0),
    [filteredCategories]
  );

  const toggleTest = (testId) => {
    setSelectedTestIds((prev) =>
      prev.includes(testId) ? prev.filter((id) => id !== testId) : [...prev, testId]
    );
  };

  const clearSelection = () => setSelectedTestIds([]);

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
      setSearch("");
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

            <div className="row g-3">
              <label className="user-field col-12 col-md-4">
                <span className="user-field__label">
                  Report date <span className="required-dot">*</span>
                </span>
                <input
                  className="user-field__input"
                  type="date"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  required
                />
              </label>
            </div>

            <div className="form-section" style={{ marginTop: 20 }}>
              <div className="form-section__header">
                <span className="user-field__label" style={{ marginBottom: 0 }}>
                  Select tests from catalog <span className="required-dot">*</span>
                </span>
              </div>

              <div className="catalog-picker__toolbar">
                <label className="user-field">
                  <span className="user-field__label">Search</span>
                  <input
                    className="user-field__input"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Test name…"
                  />
                </label>
                <label className="user-field">
                  <span className="user-field__label">Category</span>
                  <select
                    className="user-field__input"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                  >
                    <option value="">All categories</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="catalog-picker__summary">
                  <span>
                    {selectedTestIds.length} selected · {visibleTestCount} shown
                  </span>
                  {selectedTestIds.length > 0 ? (
                    <button type="button" className="btn btn--ghost btn--sm" onClick={clearSelection}>
                      Clear
                    </button>
                  ) : null}
                </div>
              </div>

              {categories.length === 0 ? (
                <p className="table-placeholder">No active tests in catalog. Ask admin to add tests.</p>
              ) : filteredCategories.length === 0 ? (
                <p className="table-placeholder">No matching tests. Try another search or category.</p>
              ) : (
                filteredCategories.map(({ category, tests }) => (
                  <div key={category} className="catalog-picker__group">
                    <div className="catalog-picker__group-title">{category}</div>
                    <div className="catalog-picker">
                      <div className="catalog-picker__grid">
                        {tests.map((test) => {
                          const id = test.id || test._id;
                          return (
                            <TestPickerCard
                              key={id}
                              test={test}
                              selected={selectedTestIds.includes(id)}
                              onToggle={toggleTest}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="diet-assign-form__actions">
              <span className="diet-assign-form__hint">
                {selectedTestIds.length
                  ? `${selectedTestIds.length} test(s) will be included in the PDF recommendation.`
                  : "Select one or more tests and a report date to create a recommendation."}
              </span>
              <button
                type="submit"
                className="btn btn--primary"
                disabled={creating || !selectedTestIds.length || !reportDate}
              >
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
