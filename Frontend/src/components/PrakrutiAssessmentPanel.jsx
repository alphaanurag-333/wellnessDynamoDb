import { useCallback, useEffect, useState, Fragment } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import { useDebouncedSearch } from "../hooks/useDebouncedSearch.js";
import {
  groupQuestionsByCategory,
  PRAKRUTI_LIST_SEARCH_MAX_LEN,
  PRAKRUTI_QUESTION_PAGE_SIZE,
  PRAKRUTI_THING_PAGE_SIZE,
  PRAKRUTI_TYPES,
  prakrutiTypeLabel,
} from "./prakrutiShared.js";

function PrakrutiListToolbar({ search, onSearchChange, placeholder, summary, maxLength }) {
  return (
    <div className="prakruti-assessment-page__list-toolbar">
      <label className="user-field prakruti-assessment-page__list-search">
        <span className="user-field__label">Search</span>
        <input
          className="user-field__input"
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
        />
      </label>
      {summary ? <span className="prakruti-assessment-page__list-summary">{summary}</span> : null}
    </div>
  );
}

function PrakrutiListPagination({ page, pages, total, onPageChange }) {
  if (pages <= 1 && total <= 0) return null;
  return (
    <div className="user-list-pagination launch-assessment-page__pagination">
      <span className="user-list-pagination__info">
        Page {page} of {pages} · {total} item{total === 1 ? "" : "s"}
      </span>
      <div className="user-list-pagination__btns">
        <button type="button" className="btn btn--ghost btn--sm" disabled={page <= 1} onClick={() => onPageChange(Math.max(1, page - 1))}>
          Previous
        </button>
        <button type="button" className="btn btn--ghost btn--sm" disabled={page >= pages} onClick={() => onPageChange(Math.min(pages, page + 1))}>
          Next
        </button>
      </div>
    </div>
  );
}

const PRAKRUTI_TABS = [
  { id: "things-to-avoid", label: "Things to avoid" },
  { id: "questions", label: "View question" },
];

export function PrakrutiAssessmentPanel({
  token,
  userId,
  api,
  backTo = "/coach/my-users",
  PageLoader,
  NotFoundPage,
  onUnauthorized,
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [currentAssessment, setCurrentAssessment] = useState(null);
  const [prakrutiType, setPrakrutiType] = useState("");
  const [selectedThingIds, setSelectedThingIds] = useState([]);
  const [selectedThingLabels, setSelectedThingLabels] = useState({});
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState("things-to-avoid");

  const [thingsToAvoid, setThingsToAvoid] = useState([]);
  const [thingsLoading, setThingsLoading] = useState(false);
  const {
    searchInput: thingSearch,
    debouncedSearch: debouncedThingSearch,
    onSearchChange: onThingSearchChange,
  } = useDebouncedSearch("", { maxLength: PRAKRUTI_LIST_SEARCH_MAX_LEN });
  const [thingPage, setThingPage] = useState(1);
  const [thingPages, setThingPages] = useState(1);
  const [thingTotal, setThingTotal] = useState(0);

  const [questions, setQuestions] = useState([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const {
    searchInput: questionSearch,
    debouncedSearch: debouncedQuestionSearch,
    onSearchChange: onQuestionSearchChange,
  } = useDebouncedSearch("", { maxLength: PRAKRUTI_LIST_SEARCH_MAX_LEN });
  const [questionPage, setQuestionPage] = useState(1);
  const [questionPages, setQuestionPages] = useState(1);
  const [questionTotal, setQuestionTotal] = useState(0);

  const toggleThing = (id, title) => {
    const key = String(id);
    setSelectedThingIds((prev) => (prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]));
    setSelectedThingLabels((prev) => {
      const next = { ...prev };
      if (next[key]) {
        delete next[key];
      } else {
        next[key] = title;
      }
      return next;
    });
  };

  const syncSelectedThings = (assessment) => {
    const ids = (assessment?.thingToAvoidIds || []).map(String);
    const labels = {};
    for (const row of assessment?.thingsToAvoid || []) {
      const id = String(row.id || row._id || "");
      if (id) labels[id] = row.title;
    }
    setSelectedThingIds(ids);
    setSelectedThingLabels(labels);
  };

  const loadAssessment = useCallback(async () => {
    if (!token || !userId) return;
    const { assessment } = await api.getAssessment(token, userId);
    setCurrentAssessment(assessment);
    setPrakrutiType(assessment?.prakrutiType || "");
    syncSelectedThings(assessment);
  }, [api, token, userId]);

  const loadThingsToAvoid = useCallback(async () => {
    if (!token || !userId || !api.listThingsToAvoid) return;
    setThingsLoading(true);
    try {
      const { thingsToAvoid: rows, pagination } = await api.listThingsToAvoid(token, userId, {
        page: thingPage,
        limit: PRAKRUTI_THING_PAGE_SIZE,
        ...(debouncedThingSearch ? { search: debouncedThingSearch } : {}),
      });
      setThingsToAvoid(rows);
      setThingPages(pagination?.pages ?? 1);
      setThingTotal(pagination?.total ?? 0);
      setSelectedThingLabels((prev) => {
        const next = { ...prev };
        for (const row of rows) {
          const id = String(row.id || row._id || "");
          if (id && row.title) next[id] = row.title;
        }
        return next;
      });
    } catch (e) {
      if (e?.status === 401) return onUnauthorized?.();
      await Swal.fire({ icon: "error", title: "Load failed", text: e.message || "Could not load things to avoid." });
    } finally {
      setThingsLoading(false);
    }
  }, [api, debouncedThingSearch, onUnauthorized, thingPage, token, userId]);

  const loadQuestions = useCallback(async () => {
    if (!token || !userId) return;
    setQuestionsLoading(true);
    try {
      const { questions: rows, pagination } = await api.listQuestions(token, userId, {
        page: questionPage,
        limit: PRAKRUTI_QUESTION_PAGE_SIZE,
        ...(debouncedQuestionSearch ? { search: debouncedQuestionSearch } : {}),
      });
      setQuestions(rows);
      setQuestionPages(pagination?.pages ?? 1);
      setQuestionTotal(pagination?.total ?? 0);
    } catch (e) {
      if (e?.status === 401) return onUnauthorized?.();
      await Swal.fire({ icon: "error", title: "Load failed", text: e.message || "Could not load questions." });
    } finally {
      setQuestionsLoading(false);
    }
  }, [api, debouncedQuestionSearch, onUnauthorized, questionPage, token, userId]);

  const loadBaseData = useCallback(async () => {
    if (!token || !userId) return;
    setLoading(true);
    setNotFound(false);
    try {
      await loadAssessment();
    } catch (e) {
      if (e?.status === 401) return onUnauthorized?.();
      if (e?.status === 404 || e?.status === 403) {
        setNotFound(true);
        return;
      }
      await Swal.fire({ icon: "error", title: "Load failed", text: e.message || "Could not load Prakruti assessment." });
    } finally {
      setLoading(false);
    }
  }, [loadAssessment, onUnauthorized, token, userId]);

  useEffect(() => {
    loadBaseData();
  }, [loadBaseData]);

  useEffect(() => {
    if (loading) return;
    loadThingsToAvoid();
  }, [loadThingsToAvoid, loading]);

  useEffect(() => {
    if (loading) return;
    loadQuestions();
  }, [loadQuestions, loading]);

  useEffect(() => {
    setThingPage(1);
  }, [debouncedThingSearch]);

  useEffect(() => {
    setQuestionPage(1);
  }, [debouncedQuestionSearch]);

  const grouped = groupQuestionsByCategory(questions);
  const selectedThingCount = selectedThingIds.length;
  const previewType = prakrutiType || currentAssessment?.prakrutiType || "";
  const previewRecommendations =
    currentAssessment?.prakrutiType === prakrutiType ? currentAssessment?.recommendations || [] : [];
  const previewThingTitles = selectedThingIds
    .map((id) => selectedThingLabels[id])
    .filter(Boolean);

  const onSave = async () => {
    if (!token || !userId) return;
    if (!prakrutiType) {
      await Swal.fire({ icon: "warning", title: "Prakruti type required", text: "Select the client's Prakruti type before saving." });
      return;
    }

    setSaving(true);
    try {
      const assessment = await api.save(token, userId, {
        prakrutiType,
        thingToAvoidIds: selectedThingIds,
      });
      setCurrentAssessment(assessment);
      setPrakrutiType(assessment?.prakrutiType || prakrutiType);
      syncSelectedThings(assessment);
      await Swal.fire({ icon: "success", title: "Saved", text: "Prakruti assessment saved.", timer: 1500 });
    } catch (e) {
      if (e?.status === 401) return onUnauthorized?.();
      await Swal.fire({ icon: "error", title: "Save failed", text: e.message || "Could not save assessment." });
    } finally {
      setSaving(false);
    }
  };

  const onExportQuestions = async () => {
    if (!token || !userId) return;
    setExporting(true);
    try {
      await api.downloadExport(token, userId, { filename: "prakruti-questions.csv" });
    } catch (e) {
      if (e?.status === 401) return onUnauthorized?.();
      await Swal.fire({ icon: "error", title: "Export failed", text: e.message || "Could not download questions." });
    } finally {
      setExporting(false);
    }
  };

  if (notFound && NotFoundPage) return <NotFoundPage />;
  if (loading && PageLoader) return <PageLoader label="Loading Prakruti assessment…" />;

  return (
    <div className="page-card launch-assessment-page prakruti-assessment-page">
      <div className="launch-assessment-page__toolbar">
        <Link to={backTo} className="btn btn--ghost btn--sm launch-assessment-page__back">
          ← Back to clients
        </Link>
        <button type="button" className="btn btn--ghost btn--sm" onClick={onExportQuestions} disabled={exporting || questionTotal === 0}>
          {exporting ? "Exporting…" : "Download questions (Excel)"}
        </button>
      </div>

      <div className="launch-assessment-page__intro">
        <h2 className="page-card__title">Prakruti Assessment</h2>
        <p className="page-card__desc">
          Conduct the assessment using the question sheet, then set the client&apos;s Prakruti type and select things to avoid from the admin catalog.
        </p>
      </div>

      <div className="prakruti-assessment-page__body">
        <div className="prakruti-assessment-page__main">
          <div className="prakruti-assessment-page__form-card">
            <h3 className="launch-assessment-page__score-card-title">Set Prakruti type</h3>
            <div className="prakruti-assessment-page__form-row">
              <label className="user-field prakruti-assessment-page__type-field">
                <span className="user-field__label">Prakruti type</span>
                <select className="user-field__input" value={prakrutiType} onChange={(e) => setPrakrutiType(e.target.value)}>
                  <option value="">Select type…</option>
                  {PRAKRUTI_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="prakruti-assessment-page__form-actions">
                <span
                  className={`launch-assessment-page__status-badge${
                    currentAssessment ? " launch-assessment-page__status-badge--edit" : ""
                  }`}
                >
                  {currentAssessment ? "Update assessment" : "New assessment"}
                </span>
                <button type="button" className="btn btn--primary prakruti-assessment-page__save-btn" disabled={saving} onClick={onSave}>
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </div>

          <div className="launch-assessment-page__tabs-panel prakruti-assessment-page__tabs-panel">
            <div className="launch-assessment-tabs" role="tablist" aria-label="Prakruti assessment sections">
              {PRAKRUTI_TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    id={`prakruti-tab-${tab.id}`}
                    aria-selected={isActive}
                    aria-controls={`prakruti-panel-${tab.id}`}
                    className={`launch-assessment-tabs__btn${isActive ? " launch-assessment-tabs__btn--active" : ""}`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {activeTab === "things-to-avoid" ? (
              <div
                id="prakruti-panel-things-to-avoid"
                role="tabpanel"
                aria-labelledby="prakruti-tab-things-to-avoid"
                className="launch-assessment-tabs__panel prakruti-assessment-page__tab-panel"
              >
                <p className="page-card__desc launch-assessment-tabs__intro">
                  Select things to avoid from the admin catalog. The client will see these after you save.
                </p>
                <PrakrutiListToolbar
                  search={thingSearch}
                  onSearchChange={onThingSearchChange}
                  placeholder="Search things to avoid..."
                  maxLength={PRAKRUTI_LIST_SEARCH_MAX_LEN}
                  summary={selectedThingCount > 0 ? `${selectedThingCount} selected` : thingTotal > 0 ? `${thingTotal} available` : ""}
                />
                {thingsLoading ? (
                  <p className="table-placeholder">Loading things to avoid…</p>
                ) : thingTotal === 0 ? (
                  <p className="table-placeholder">
                    {debouncedThingSearch ? "No items match your search." : "No active things to avoid. Ask admin to add items first."}
                  </p>
                ) : (
                  <>
                    <div className="prakruti-things-list">
                      {thingsToAvoid.map((item) => {
                        const id = String(item.id || item._id);
                        const checked = selectedThingIds.includes(id);
                        return (
                          <label
                            key={id}
                            className={`prakruti-things-list__item${checked ? " prakruti-things-list__item--checked" : ""}`}
                          >
                            <input type="checkbox" checked={checked} onChange={() => toggleThing(id, item.title)} />
                            <span>{item.title}</span>
                          </label>
                        );
                      })}
                    </div>
                    <PrakrutiListPagination page={thingPage} pages={thingPages} total={thingTotal} onPageChange={setThingPage} />
                  </>
                )}
              </div>
            ) : null}

            {activeTab === "questions" ? (
              <div
                id="prakruti-panel-questions"
                role="tabpanel"
                aria-labelledby="prakruti-tab-questions"
                className="launch-assessment-tabs__panel prakruti-assessment-page__tab-panel"
              >
                <p className="page-card__desc launch-assessment-tabs__intro">
                  Reference only — use the downloaded sheet during the assessment. Only Prakruti type and selected things to avoid are stored.
                </p>
                <PrakrutiListToolbar
                  search={questionSearch}
                  onSearchChange={onQuestionSearchChange}
                  placeholder="Search category or question..."
                  maxLength={PRAKRUTI_LIST_SEARCH_MAX_LEN}
                  summary={questionTotal > 0 ? `${questionTotal} questions` : ""}
                />
                {questionsLoading ? (
                  <p className="table-placeholder">Loading questions…</p>
                ) : questionTotal === 0 ? (
                  <p className="table-placeholder">
                    {debouncedQuestionSearch ? "No questions match your search." : "No active Prakruti questions. Ask admin to add questions first."}
                  </p>
                ) : (
                  <>
                    <div className="table-scroll">
                      <table className="data-table launch-assessment-table">
                        <thead>
                          <tr>
                            <th>Ser</th>
                            <th>Category / Question</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            let rowIndex = (questionPage - 1) * PRAKRUTI_QUESTION_PAGE_SIZE;
                            return grouped.map((group) => (
                              <Fragment key={`cat-${group.category}`}>
                                <tr className="launch-assessment-table__category-row">
                                  <td colSpan={2}>
                                    <strong>{group.category}</strong>
                                  </td>
                                </tr>
                                {group.items.map((q) => {
                                  rowIndex += 1;
                                  return (
                                    <tr key={q.id || q._id}>
                                      <td className="data-table__muted">{rowIndex}</td>
                                      <td>{q.question}</td>
                                    </tr>
                                  );
                                })}
                              </Fragment>
                            ));
                          })()}
                        </tbody>
                      </table>
                    </div>
                    <PrakrutiListPagination page={questionPage} pages={questionPages} total={questionTotal} onPageChange={setQuestionPage} />
                  </>
                )}
              </div>
            ) : null}
          </div>
        </div>

        {previewType ? (
          <aside className="prakruti-result-preview" aria-label="Client preview">
            <div className="prakruti-result-preview__header">
              <span className="prakruti-result-preview__label">Your Prakruti Type :</span>
              <span className="prakruti-result-preview__type">{prakrutiTypeLabel(previewType)}</span>
            </div>
            <div className="prakruti-result-preview__section">
              <h4>Recommendations</h4>
              <ul>
                {previewRecommendations.length > 0 ? (
                  previewRecommendations.map((row) => <li key={row.id || row.title}>{row.title}</li>)
                ) : (
                  <li className="prakruti-result-preview__hint">Save to load recommendations for this type.</li>
                )}
              </ul>
            </div>
            <div className="prakruti-result-preview__section">
              <h4>Things to Avoid</h4>
              <ul>
                {previewThingTitles.length > 0 ? (
                  previewThingTitles.map((title) => <li key={title}>{title}</li>)
                ) : (
                  <li className="prakruti-result-preview__hint">Select items in the list — the client will see your choices after save.</li>
                )}
              </ul>
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
