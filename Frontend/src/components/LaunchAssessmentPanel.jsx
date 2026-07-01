import { useCallback, useEffect, useState, Fragment } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import { LaunchScoreGauge, LaunchScoreHistoryChart } from "./LaunchScoreChart.jsx";
import {
  clampLaunchScore,
  sanitizeLaunchScoreInput,
  todayDateInputValue,
  validateLaunchScore,
} from "./launchAssessmentShared.js";

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

export function LaunchAssessmentPanel({
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
  const [questions, setQuestions] = useState([]);
  const [history, setHistory] = useState([]);
  const [assessmentDate, setAssessmentDate] = useState(todayDateInputValue());
  const [totalScore, setTotalScore] = useState("");
  const [currentAssessment, setCurrentAssessment] = useState(null);
  const [focusAreasCatalog, setFocusAreasCatalog] = useState([]);
  const [selectedFocusAreaIds, setSelectedFocusAreaIds] = useState([]);
  const [exporting, setExporting] = useState(false);

  const toggleFocusArea = (id) => {
    setSelectedFocusAreaIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const loadBaseData = useCallback(async () => {
    if (!token || !userId) return;
    setLoading(true);
    setNotFound(false);
    try {
      const [{ questions: qRows }, { history: hist }, focusResult] = await Promise.all([
        api.listQuestions(token, userId),
        api.listAssessments(token, userId),
        api.listFocusAreas ? api.listFocusAreas(token, userId) : Promise.resolve({ focusAreas: [] }),
      ]);
      setQuestions(qRows);
      setHistory(hist);
      setFocusAreasCatalog(focusResult.focusAreas || []);
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
  }, [api, onUnauthorized, token, userId]);

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

  const grouped = groupQuestionsByCategory(questions);
  const scoreError = totalScore !== "" ? validateLaunchScore(totalScore) : "";
  const displayScore = totalScore === "" ? 0 : clampLaunchScore(totalScore);

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
      await loadBaseData();
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
    <div className="page-card launch-assessment-page">
      <div className="page-card__head">
        <div>
          <Link to={backTo} className="btn btn--ghost btn--sm launch-assessment-page__back">
            ← Back to clients
          </Link>
          <h2 className="page-card__title">LAUNCH Assessment</h2>
          <p className="page-card__desc">
            Conduct the assessment manually using the question sheet. Log only the final lifestyle score here, date-wise.
          </p>
        </div>
        <div className="page-card__actions launch-assessment-page__actions">
          <button type="button" className="btn btn--ghost" onClick={onExportQuestions} disabled={exporting || !questions.length}>
            {exporting ? "Exporting…" : "Download questions (Excel)"}
          </button>
        </div>
      </div>

      <div className="launch-assessment-page__overview">
        <LaunchScoreGauge score={displayScore} />
        <div className="launch-assessment-page__history">
          <h3 className="launch-assessment-page__section-title">Score history</h3>
          <LaunchScoreHistoryChart history={history} />
        </div>
      </div>

      <div className="launch-assessment-page__score-form">
        <label className="user-field">
          <span className="user-field__label">Assessment date</span>
          <input
            className="user-field__input"
            type="date"
            value={assessmentDate}
            onChange={(e) => setAssessmentDate(e.target.value)}
          />
        </label>
        <label className="user-field launch-assessment-page__score-field">
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
            <small className="data-table__muted">Enter a whole number from 0 to 750.</small>
          )}
        </label>
        {currentAssessment ? (
          <span className="launch-assessment-page__date-hint">Editing score for this date</span>
        ) : (
          <span className="launch-assessment-page__date-hint">New score entry for this date</span>
        )}
        <button
          type="button"
          className="btn btn--primary"
          onClick={onSave}
          disabled={saving || !totalScore || Boolean(scoreError)}
        >
          {saving ? "Saving…" : currentAssessment ? "Update score" : "Save score"}
        </button>
      </div>

      {focusAreasCatalog.length > 0 ? (
        <div className="launch-assessment-page__focus-areas">
          <h3 className="launch-assessment-page__section-title">Area to focus</h3>
          <p className="page-card__desc">Select one or more focus areas visible to the client after saving this score.</p>
          <div className="launch-focus-area-list">
            {focusAreasCatalog.map((area) => {
              const id = area.id || area._id;
              const checked = selectedFocusAreaIds.includes(id);
              return (
                <label key={id} className={`launch-focus-area-list__item${checked ? " launch-focus-area-list__item--checked" : ""}`}>
                  <input type="checkbox" checked={checked} onChange={() => toggleFocusArea(id)} />
                  <span>{area.title}</span>
                </label>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="table-placeholder">No active areas to focus. Ask admin to add items under Area to Focus.</p>
      )}

      {questions.length === 0 ? (
        <p className="table-placeholder">No active LAUNCH questions. Ask admin to add questions first.</p>
      ) : (
        <div className="launch-assessment-page__questions">
          <h3 className="launch-assessment-page__section-title">Questions (reference only)</h3>
          <p className="page-card__desc">Use the downloaded sheet for replies and per-question scoring. Only the final score is stored in the system.</p>
          <div className="table-scroll">
            <table className="data-table launch-assessment-table">
              <thead>
                <tr>
                  <th>Ser</th>
                  <th>Category / Question</th>
                </tr>
              </thead>
              <tbody>
                {grouped.map((group) => (
                  <Fragment key={`cat-${group.category}`}>
                    <tr className="launch-assessment-table__category-row">
                      <td colSpan={2}>
                        <strong>{group.category}</strong>
                      </td>
                    </tr>
                    {group.items.map((q, idx) => (
                      <tr key={q.id || q._id}>
                        <td className="data-table__muted">{idx + 1}</td>
                        <td>{q.question}</td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
