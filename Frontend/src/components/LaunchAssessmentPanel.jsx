import { useCallback, useEffect, useState, Fragment } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import { LaunchScoreGauge, LaunchScoreHistoryChart } from "./LaunchScoreChart.jsx";
import {
  clampLaunchScore,
  LAUNCH_FOCUS_AREA_PAGE_SIZE,
  LAUNCH_LIST_SEARCH_MAX_LEN,
  LAUNCH_QUESTION_PAGE_SIZE,
  sanitizeLaunchScoreInput,
  todayDateInputValue,
  validateLaunchScore,
} from "./launchAssessmentShared.js";
import { useDebouncedSearch } from "../hooks/useDebouncedSearch.js";

function groupQuestionsByCategory(questions) {
  const groups = [];
  let current = null;
  for (const q of questions || []) {
    const cat = q.category || "General";
    if (!current || current.category !== cat) {
      current = { category: cat, items: [] };
      groups.push(current);
    }
    current.items.push(q);
  }
  return groups;
}

function LaunchListToolbar({ search, onSearchChange, placeholder, summary, maxLength }) {
  return (
    <div className="launch-assessment-page__list-toolbar">
      <label className="user-field launch-assessment-page__list-search">
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
      {summary ? <span className="launch-assessment-page__list-summary">{summary}</span> : null}
    </div>
  );
}

function LaunchListPagination({ page, pages, total, onPageChange }) {
  if (pages <= 1 && total <= 0) return null;
  return (
    <div className="user-list-pagination launch-assessment-page__pagination">
      <span className="user-list-pagination__info">
        Page {page} of {pages} · {total} item{total === 1 ? "" : "s"}
      </span>
      <div className="user-list-pagination__btns">
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          Previous
        </button>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          disabled={page >= pages}
          onClick={() => onPageChange(Math.min(pages, page + 1))}
        >
          Next
        </button>
      </div>
    </div>
  );
}

const LAUNCH_TABS = [
  { id: "focus-areas", label: "Area to focus" },
  { id: "questions", label: "View question" },
];

export function LaunchAssessmentPanel({
  token,
  userId,
  api,
  backTo = "/coach/my-users",
  embedded = false,
  PageLoader,
  NotFoundPage,
  onUnauthorized,
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [history, setHistory] = useState([]);
  const [assessmentDate, setAssessmentDate] = useState(todayDateInputValue());
  const [totalScore, setTotalScore] = useState("");
  const [currentAssessment, setCurrentAssessment] = useState(null);
  const [selectedFocusAreaIds, setSelectedFocusAreaIds] = useState([]);
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState("focus-areas");

  const [focusAreas, setFocusAreas] = useState([]);
  const [focusAreaLoading, setFocusAreaLoading] = useState(false);
  const {
    searchInput: focusAreaSearch,
    debouncedSearch: debouncedFocusAreaSearch,
    onSearchChange: onFocusAreaSearchChange,
  } = useDebouncedSearch("", { maxLength: LAUNCH_LIST_SEARCH_MAX_LEN });
  const [focusAreaPage, setFocusAreaPage] = useState(1);
  const [focusAreaPages, setFocusAreaPages] = useState(1);
  const [focusAreaTotal, setFocusAreaTotal] = useState(0);

  const [questions, setQuestions] = useState([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const {
    searchInput: questionSearch,
    debouncedSearch: debouncedQuestionSearch,
    onSearchChange: onQuestionSearchChange,
  } = useDebouncedSearch("", { maxLength: LAUNCH_LIST_SEARCH_MAX_LEN });
  const [questionPage, setQuestionPage] = useState(1);
  const [questionPages, setQuestionPages] = useState(1);
  const [questionTotal, setQuestionTotal] = useState(0);

  const toggleFocusArea = (id) => {
    setSelectedFocusAreaIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const loadHistory = useCallback(async () => {
    if (!token || !userId) return;
    const { history: hist } = await api.listAssessments(token, userId);
    setHistory(hist);
  }, [api, token, userId]);

  const loadFocusAreas = useCallback(async () => {
    if (!token || !userId || !api.listFocusAreas) return;
    setFocusAreaLoading(true);
    try {
      const { focusAreas: rows, pagination } = await api.listFocusAreas(token, userId, {
        page: focusAreaPage,
        limit: LAUNCH_FOCUS_AREA_PAGE_SIZE,
        ...(debouncedFocusAreaSearch ? { search: debouncedFocusAreaSearch } : {}),
      });
      setFocusAreas(rows);
      setFocusAreaPages(pagination?.pages ?? 1);
      setFocusAreaTotal(pagination?.total ?? 0);
    } catch (e) {
      if (e?.status === 401) return onUnauthorized?.();
      await Swal.fire({ icon: "error", title: "Load failed", text: e.message || "Could not load focus areas." });
    } finally {
      setFocusAreaLoading(false);
    }
  }, [api, debouncedFocusAreaSearch, focusAreaPage, onUnauthorized, token, userId]);

  const loadQuestions = useCallback(async () => {
    if (!token || !userId) return;
    setQuestionsLoading(true);
    try {
      const { questions: rows, pagination } = await api.listQuestions(token, userId, {
        page: questionPage,
        limit: LAUNCH_QUESTION_PAGE_SIZE,
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
      await loadHistory();
    } catch (e) {
      if (e?.status === 401) return onUnauthorized?.();
      if (e?.status === 404 || e?.status === 403) {
        setNotFound(true);
        return;
      }
      await Swal.fire({ icon: "error", title: "Load failed", text: e.message || "Could not load LAUNCH assessment." });
    } finally {
      setLoading(false);
    }
  }, [loadHistory, onUnauthorized, token, userId]);

  const loadDateAssessment = useCallback(
    async (date) => {
      if (!token || !userId) return;
      try {
        const { assessment } = await api.getByDate(token, userId, date);
        setCurrentAssessment(assessment);
        setTotalScore(assessment?.totalScore ?? "");
        setSelectedFocusAreaIds(assessment?.focusAreaIds || []);
      } catch (e) {
        if (e?.status === 401) return onUnauthorized?.();
        await Swal.fire({ icon: "error", title: "Load failed", text: e.message || "Could not load assessment for date." });
      }
    },
    [api, onUnauthorized, token, userId]
  );

  useEffect(() => {
    loadBaseData();
  }, [loadBaseData]);

  useEffect(() => {
    if (loading) return;
    loadDateAssessment(assessmentDate);
  }, [assessmentDate, loadDateAssessment, loading]);

  useEffect(() => {
    if (loading) return;
    loadFocusAreas();
  }, [loadFocusAreas, loading]);

  useEffect(() => {
    if (loading) return;
    loadQuestions();
  }, [loadQuestions, loading]);

  useEffect(() => {
    setFocusAreaPage(1);
  }, [debouncedFocusAreaSearch]);

  useEffect(() => {
    setQuestionPage(1);
  }, [debouncedQuestionSearch]);

  const grouped = groupQuestionsByCategory(questions);
  const scoreError = totalScore !== "" ? validateLaunchScore(totalScore) : "";
  const displayScore = totalScore === "" ? 0 : clampLaunchScore(totalScore);
  const selectedFocusCount = selectedFocusAreaIds.length;

  const onScoreChange = (raw) => {
    setTotalScore(sanitizeLaunchScoreInput(raw));
  };

  const onSave = async () => {
    if (!token || !userId) return;

    const validationError = validateLaunchScore(totalScore);
    if (validationError) {
      await Swal.fire({ icon: "warning", title: "Invalid score", text: validationError });
      return;
    }

    const score = Number(totalScore);
    const payload = { assessmentDate, totalScore: score, focusAreaIds: selectedFocusAreaIds };

    setSaving(true);
    try {
      if (currentAssessment?.id) {
        await api.update(token, userId, currentAssessment.id, payload);
      } else {
        await api.save(token, userId, payload);
      }
      await Swal.fire({ icon: "success", title: "Saved", text: "LAUNCH score saved.", timer: 1500 });
      await loadHistory();
      await loadDateAssessment(assessmentDate);
    } catch (e) {
      if (e?.status === 401) return onUnauthorized?.();
      await Swal.fire({ icon: "error", title: "Save failed", text: e.message || "Could not save score." });
    } finally {
      setSaving(false);
    }
  };

  const onExportQuestions = async () => {
    if (!token || !userId) return;
    setExporting(true);
    try {
      await api.downloadExport(token, userId, { filename: "launch-questions.csv" });
    } catch (e) {
      if (e?.status === 401) return onUnauthorized?.();
      await Swal.fire({ icon: "error", title: "Export failed", text: e.message || "Could not download questions." });
    } finally {
      setExporting(false);
    }
  };

  if (notFound && NotFoundPage) return <NotFoundPage />;
  if (loading && PageLoader) return <PageLoader label="Loading LAUNCH assessment…" />;

  return (
    <div className={`page-card launch-assessment-page${embedded ? " launch-assessment-page--embedded" : ""}`}>
      {!embedded ? (
      <div className="launch-assessment-page__toolbar">
        <Link to={backTo} className="btn btn--ghost btn--sm launch-assessment-page__back">
          ← Back to clients
        </Link>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={onExportQuestions}
          disabled={exporting || questionTotal === 0}
        >
          {exporting ? "Exporting…" : "Download questions (Excel)"}
        </button>
      </div>
      ) : null}

      {!embedded ? (
      <div className="launch-assessment-page__intro">
        <h2 className="page-card__title">LAUNCH Assessment</h2>
        <p className="page-card__desc">
          Conduct the assessment manually using the question sheet. Log only the final lifestyle score here, date-wise.
        </p>
      </div>
      ) : (
      <div className="launch-assessment-page__toolbar launch-assessment-page__toolbar--embedded">
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={onExportQuestions}
          disabled={exporting || questionTotal === 0}
        >
          {exporting ? "Exporting…" : "Download questions (Excel)"}
        </button>
      </div>
      )}

      <div className="launch-assessment-page__dashboard">
        <div className="launch-assessment-page__gauge-col">
          <LaunchScoreGauge score={displayScore} />
        </div>
        <div className="launch-assessment-page__history-col">
          <LaunchScoreHistoryChart history={history} />
        </div>
      </div>

      <div className="launch-assessment-page__score-card">
        <h3 className="launch-assessment-page__score-card-title">Log assessment score</h3>
        <div className="launch-assessment-page__score-form">
          <label className="user-field launch-assessment-page__form-field">
            <span className="user-field__label">Assessment date</span>
            <input
              className="user-field__input"
              type="date"
              value={assessmentDate}
              onChange={(e) => setAssessmentDate(e.target.value)}
            />
          </label>
          <label className="user-field launch-assessment-page__form-field launch-assessment-page__score-field">
            <span className="user-field__label">Final lifestyle score (0–750)</span>
            <input
              className={`user-field__input${scoreError ? " user-field__input--invalid" : ""}`}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={3}
              value={totalScore}
              onChange={(e) => onScoreChange(e.target.value)}
              placeholder="e.g. 485"
              aria-invalid={Boolean(scoreError)}
              aria-describedby={scoreError ? "launch-score-error" : undefined}
            />
            {scoreError ? (
              <small id="launch-score-error" className="launch-assessment-page__field-error" role="alert">
                {scoreError}
              </small>
            ) : (
              null
            )}
          </label>
          <div className="launch-assessment-page__score-actions">
            <span
              className={`launch-assessment-page__status-badge${
                currentAssessment ? " launch-assessment-page__status-badge--edit" : ""
              }`}
            >
              {currentAssessment ? "Editing score for this date" : "New score entry for this date"}
            </span>
            <button
              type="button"
              className="btn btn--primary launch-assessment-page__save-btn"
              onClick={onSave}
              disabled={saving || !totalScore || Boolean(scoreError)}
            >
              {saving ? "Saving…" : currentAssessment ? "Update score" : "Save score"}
            </button>
          </div>
        </div>
      </div>

      <div className="launch-assessment-page__tabs-panel">
        <div className="launch-assessment-tabs" role="tablist" aria-label="LAUNCH assessment sections">
          {LAUNCH_TABS.map((t) => {
            const isActive = activeTab === t.id;
            const tabLabel =
              t.id === "focus-areas" && selectedFocusCount > 0
                ? `${t.label} (${selectedFocusCount})`
                : t.label;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`launch-tab-${t.id}`}
                aria-selected={isActive}
                aria-controls={`launch-panel-${t.id}`}
                className={`launch-assessment-tabs__btn${isActive ? " launch-assessment-tabs__btn--active" : ""}`}
                onClick={() => setActiveTab(t.id)}
              >
                {tabLabel}
              </button>
            );
          })}
        </div>

        <div
          id="launch-panel-focus-areas"
          role="tabpanel"
          aria-labelledby="launch-tab-focus-areas"
          hidden={activeTab !== "focus-areas"}
          className={`launch-assessment-tabs__panel launch-assessment-tabs__panel--focus${activeTab === "focus-areas" ? "" : " launch-assessment-tabs__panel--hidden"}`}
        >
          <p className="page-card__desc launch-assessment-tabs__intro">
            Select one or more focus areas visible to the client after saving this score.
          </p>
          <LaunchListToolbar
            search={focusAreaSearch}
            onSearchChange={onFocusAreaSearchChange}
            placeholder="Search focus areas..."
            maxLength={LAUNCH_LIST_SEARCH_MAX_LEN}
            summary={
              selectedFocusCount > 0
                ? `${selectedFocusCount} selected`
                : focusAreaTotal > 0
                  ? `${focusAreaTotal} available`
                  : ""
            }
          />
          {focusAreaLoading ? (
            <p className="table-placeholder">Loading focus areas…</p>
          ) : focusAreaTotal === 0 ? (
            <p className="table-placeholder">
              {debouncedFocusAreaSearch
                ? "No focus areas match your search."
                : "No active areas to focus. Ask admin to add items under Area to Focus."}
            </p>
          ) : (
            <>
              <div className="launch-focus-area-list">
                {focusAreas.map((area) => {
                  const id = area.id || area._id;
                  const checked = selectedFocusAreaIds.includes(id);
                  return (
                    <label
                      key={id}
                      className={`launch-focus-area-list__item${checked ? " launch-focus-area-list__item--checked" : ""}`}
                    >
                      <input type="checkbox" checked={checked} onChange={() => toggleFocusArea(id)} />
                      <span>{area.title}</span>
                    </label>
                  );
                })}
              </div>
              <LaunchListPagination
                page={focusAreaPage}
                pages={focusAreaPages}
                total={focusAreaTotal}
                onPageChange={setFocusAreaPage}
              />
            </>
          )}
        </div>

        <div
          id="launch-panel-questions"
          role="tabpanel"
          aria-labelledby="launch-tab-questions"
          hidden={activeTab !== "questions"}
          className={`launch-assessment-tabs__panel${activeTab === "questions" ? "" : " launch-assessment-tabs__panel--hidden"}`}
        >
          <p className="page-card__desc launch-assessment-tabs__intro">
            Reference only — use the downloaded sheet for replies and per-question scoring. Only the final score is stored.
          </p>
          <LaunchListToolbar
            search={questionSearch}
            onSearchChange={onQuestionSearchChange}
            placeholder="Search category or question..."
            maxLength={LAUNCH_LIST_SEARCH_MAX_LEN}
            summary={questionTotal > 0 ? `${questionTotal} questions` : ""}
          />
          {questionsLoading ? (
            <p className="table-placeholder">Loading questions…</p>
          ) : questionTotal === 0 ? (
            <p className="table-placeholder">
              {debouncedQuestionSearch
                ? "No questions match your search."
                : "No active LAUNCH questions. Ask admin to add questions first."}
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
                      let rowIndex = (questionPage - 1) * LAUNCH_QUESTION_PAGE_SIZE;
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
              <LaunchListPagination
                page={questionPage}
                pages={questionPages}
                total={questionTotal}
                onPageChange={setQuestionPage}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
