import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import { CatalogPickerPagination } from "./CatalogPickerPagination.jsx";
import { CATALOG_PAGE_SIZE, emptyCatalogPagination } from "./catalogPickerConstants.js";
import {
  fetchActiveTestCatalog,
  fetchActiveTestCatalogMeta,
} from "../wellnessCoach/api/coachTestCatalog.js";

import { formatDate } from "../admin/utils/formatDate.js";

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
            <div className="diet-plan-card__title">Report date: {formatDate(recommendation.reportDate)}</div>
            <div className="diet-plan-card__date">
              {tests.length} test{tests.length === 1 ? "" : "s"} selected
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
            <div className="diet-plan-card__title">Report date: {formatDate(report.reportDate)}</div>
            <div className="diet-plan-card__date">Uploaded by client</div>
          </div>
        </div>
        <div className="assignment-card__header-actions">
          {fileUrl ? (
            <>
              <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="btn btn--ghost btn--sm">
                View PDF
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
          <div className="diet-plan-card__note">Submitted {formatDate(report.createdAt)}</div>
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
  const [catalogTests, setCatalogTests] = useState([]);
  const [categories, setCategories] = useState([]);
  const [catalogPage, setCatalogPage] = useState(1);
  const [catalogPagination, setCatalogPagination] = useState(() => emptyCatalogPagination());
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [recommended, setRecommended] = useState(null);
  const [history, setHistory] = useState([]);
  const [labReports, setLabReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [reportDate, setReportDate] = useState("");
  const [selectedTestsById, setSelectedTestsById] = useState(() => new Map());
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const loadAssignments = useCallback(async () => {
    if (!token || !userId) return;
    setError("");
    setNotFound(false);
    setLoading(true);
    try {
      const [recs, reportsResult] = await Promise.all([
        api.list(token, userId),
        api.listLabReports ? api.listLabReports(token, userId) : Promise.resolve({ reports: [] }),
      ]);
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

  const loadCatalogMeta = useCallback(async () => {
    try {
      const meta = await fetchActiveTestCatalogMeta();
      setCategories(meta.categories ?? []);
    } catch {
      setCategories([]);
    }
  }, []);

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    try {
      const catalog = await fetchActiveTestCatalog({
        page: catalogPage,
        limit: CATALOG_PAGE_SIZE,
        search,
        category: categoryFilter,
      });
      setCatalogTests(catalog.tests ?? []);
      setCatalogPagination(catalog.pagination ?? emptyCatalogPagination(catalogPage));
    } catch (e) {
      setCatalogTests([]);
      setCatalogPagination(emptyCatalogPagination(catalogPage));
      setError((prev) => prev || e.message || "Failed to load test catalog.");
    } finally {
      setCatalogLoading(false);
    }
  }, [catalogPage, categoryFilter, search]);

  useEffect(() => {
    loadAssignments();
    loadCatalogMeta();
  }, [loadAssignments, loadCatalogMeta]);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    setCatalogPage(1);
  }, [search, categoryFilter]);

  const selectedTestIds = useMemo(() => [...selectedTestsById.keys()], [selectedTestsById]);

  const selectedTests = useMemo(() => [...selectedTestsById.values()], [selectedTestsById]);

  const toggleTest = (test) => {
    const testId = test.id || test._id;
    setSelectedTestsById((prev) => {
      const next = new Map(prev);
      if (next.has(testId)) next.delete(testId);
      else next.set(testId, test);
      return next;
    });
  };

  const clearSelection = () => setSelectedTestsById(new Map());

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
      setSelectedTestsById(new Map());
      setSearch("");
      setCatalogPage(1);
      await Promise.all([loadAssignments(), loadCatalog()]);
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
      await loadAssignments();
    } catch (err) {
      if (err?.status === 401) onUnauthorized?.();
      else await Swal.fire({ icon: "error", title: "Delete failed", text: err.message || "Could not delete." });
    } finally {
      setDeletingId("");
    }
  };

  if (notFound && NotFoundPage) return <NotFoundPage />;
  if (loading && PageLoader) return <PageLoader label="Loading internal parameters…" />;

  const embedded = !backTo;

  return (
    <div className={embedded ? "client-hub-embedded-panel client-hub-module-panel" : "user-page"}>
      {embedded ? (
        <div className="client-hub-embedded-panel__header">
          <h2 className="client-hub-embedded-panel__title">Internal Parameters</h2>
          <p className="client-hub-embedded-panel__subtitle">
            Recommend blood tests from the catalog and generate a downloadable PDF for this client.
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
            <h2 className="user-page__title">Internal Parameters</h2>
            <p className="user-page__subtitle">Recommend blood tests and generate a downloadable PDF list.</p>
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
            onSubmit={handleCreate}
          >
            <h3 className="form-card__title">Create new recommendation</h3>

            <div className="row g-3" style={{ marginTop: 16 }}>
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
                    placeholder="Test name, category…"
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
                    {selectedTestIds.length} selected · {catalogPagination.total || catalogTests.length} total
                  </span>
                  {selectedTestIds.length > 0 ? (
                    <button type="button" className="btn btn--ghost btn--sm" onClick={clearSelection}>
                      Clear
                    </button>
                  ) : null}
                </div>
              </div>

              {catalogTests.length === 0 && !catalogLoading ? (
                <p className="table-placeholder">
                  {categories.length === 0
                    ? "No active tests in catalog. Ask admin to add tests."
                    : "No matching tests. Try another search or category."}
                </p>
              ) : (
                <>
                  <div className="catalog-picker">
                    <div className={`catalog-picker__grid${catalogLoading ? " catalog-picker__grid--loading" : ""}`}>
                      {catalogTests.map((test) => {
                        const id = test.id || test._id;
                        return (
                          <TestPickerCard
                            key={id}
                            test={test}
                            selected={selectedTestIds.includes(id)}
                            onToggle={() => toggleTest(test)}
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

              {selectedTests.length > 0 ? (
                <div className="client-hub-module-panel__selection">
                  <span className="client-hub-module-panel__selection-label">Selected tests</span>
                  <div className="plan-chip-list">
                    {selectedTests.map((test) => (
                      <div key={test.id || test._id} className="plan-chip">
                        <span className="plan-chip__name">{test.name}</span>
                        <span className="plan-chip__meta">
                          {testTypeLabel(test.type)}
                          {test.category ? ` · ${test.category}` : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
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

        <section className="diet-plan-section client-hub-module-panel__section">
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

        <section className="diet-plan-section client-hub-module-panel__section">
          <h3 className="form-card__title">History ({history.length})</h3>
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

        <section className="diet-plan-section client-hub-module-panel__section">
          <h3 className="form-card__title">User uploaded reports ({labReports.length})</h3>
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
