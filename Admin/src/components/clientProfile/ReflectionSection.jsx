import { useEffect, useMemo, useState } from "react";
import { useViewAs } from "../../context/ViewAsContext.jsx";
import {
  fetchUserDailyReflectionSettings,
  saveUserDailyReflectionSettings,
} from "../../api/dailyReflectionApi.js";
import {
  DEFAULT_BEDTIME,
  formatBedtime,
  selectedQuestionCount,
  selectedSectionPoints,
  selectedWeightage,
  totalQuestionCount,
} from "../../data/reflectionData.js";

function ConfirmModal({ open, eyebrow, title, body, confirmLabel, confirmTone = "primary", onClose, onConfirm }) {
  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="ua-cp-modal-backdrop ua-cp-modal-backdrop--drawer" onClick={onClose} role="presentation">
      <div className="ua-cp-modal ua-cp-reflect-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="reflect-modal-title">
        <p className={`ua-cp-reflect-modal__eyebrow ua-cp-reflect-modal__eyebrow--${confirmTone}`}>{eyebrow}</p>
        <h3 id="reflect-modal-title" className="ua-cp-reflect-modal__title">{title}</h3>
        {body ? <p className="ua-cp-reflect-modal__body">{body}</p> : null}
        <div className="ua-cp-reflect-modal__foot">
          <button type="button" className="ua-cp-btn ua-cp-btn--outline" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className={`ua-cp-btn${confirmTone === "danger" ? " ua-cp-reflect-modal__confirm--danger" : " ua-cp-btn--primary"}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReflectionQuestionRow({ index, question, canSelect, busy, onToggle }) {
  const locked = question.fixed || !canSelect;

  return (
    <div className={`ua-cp-reflect-question${question.selected ? "" : " is-off"}`}>
      <span className="ua-cp-reflect-question__num">{index + 1}.</span>
      <span className="ua-cp-reflect-question__text ua-cp-reflect-question__text--readonly">{question.name}</span>
      <div className="ua-cp-reflect-question__score">
        <span>{question.points} pts</span>
        {question.fixed ? (
          <span className="ua-cp-reflect-section__pill" title="Fixed in the DRF bank">
            <span aria-hidden="true">🔒</span> Fixed
          </span>
        ) : null}
        <button
          type="button"
          className={`ua-toggle ua-toggle--sm${question.selected ? " ua-toggle--on" : ""}`}
          aria-pressed={question.selected}
          aria-label={question.selected ? `Remove ${question.name} from app` : `Add ${question.name} to app`}
          disabled={locked || busy}
          onClick={onToggle}
        >
          <span className="ua-toggle__knob" />
        </button>
      </div>
    </div>
  );
}

function ReflectionSectionCard({
  section,
  index,
  expanded,
  canSelect,
  busy,
  onToggle,
  onToggleQuestion,
}) {
  const points = selectedSectionPoints(section);
  const selectedCount = (section.questions || []).filter((question) => question.selected).length;

  return (
    <div className="ua-cp-reflect-section">
      <div className="ua-cp-reflect-section__head">
        <div className="ua-cp-reflect-section__head-left">
          <button type="button" className="ua-cp-reflect-section__toggle" onClick={onToggle} aria-expanded={expanded}>
            <span className={`ua-cp-reflect-section__chev${expanded ? " ua-cp-reflect-section__chev--open" : ""}`} aria-hidden="true">›</span>
          </button>
          <span className="ua-cp-reflect-section__badge">{index + 1}</span>
          <span className="ua-cp-reflect-section__title ua-cp-reflect-section__title--readonly">{section.name}</span>
        </div>
        <div className="ua-cp-reflect-section__meta">
          <span className="ua-cp-reflect-section__pill" title={section.fixed ? "Weight locked in the DRF bank" : "Section weight from DRF bank"}>
            {section.fixed ? <span aria-hidden="true">🔒</span> : null}
            WT {section.weight}
          </span>
          <span className="ua-cp-reflect-section__pill ua-cp-reflect-section__points">
            {selectedCount} selected · {points.label}
          </span>
        </div>
      </div>
      {expanded ? (
        <div className="ua-cp-reflect-section__body">
          {(section.questions || []).map((question, qIndex) => (
            <ReflectionQuestionRow
              key={question.id}
              index={qIndex}
              question={question}
              canSelect={canSelect && !question.fixed}
              busy={busy}
              onToggle={() => onToggleQuestion(question.id)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function ReflectionSection({ user, onToast }) {
  const userId = String(user?.id || "").trim();
  const isHealClient = String(user?.userTier || "").toLowerCase() === "heal" || user?.tier === "Seek to Heal";
  const { can, viewAs } = useViewAs();
  const canSelect =
    can("console.diet.edit") ||
    viewAs === "wc" ||
    viewAs === "awc" ||
    viewAs === "admin";

  const [sections, setSections] = useState([]);
  const [savedIds, setSavedIds] = useState([]);
  const [bedtime, setBedtime] = useState(DEFAULT_BEDTIME);
  const [savedBedtime, setSavedBedtime] = useState(DEFAULT_BEDTIME);
  const [todayScore, setTodayScore] = useState(null);
  const [expanded, setExpanded] = useState(() => new Set());
  const [loading, setLoading] = useState(Boolean(userId));
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [pushOpen, setPushOpen] = useState(false);

  const clientName = user?.name?.split(" ")[0] || "Client";
  const selectedCount = useMemo(() => selectedQuestionCount(sections), [sections]);
  const questionTotal = useMemo(() => totalQuestionCount(sections), [sections]);
  const weightTotal = useMemo(() => selectedWeightage(sections), [sections]);
  const currentIds = useMemo(
    () => sections.flatMap((section) => (section.questions || []).filter((question) => question.selected).map((question) => question.id)),
    [sections],
  );
  const dirty = currentIds.join("|") !== savedIds.join("|") || bedtime !== savedBedtime;

  useEffect(() => {
    if (!userId || !isHealClient) {
      setSections([]);
      setSavedIds([]);
      setLoading(false);
      setLoadError("");
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setLoadError("");

    fetchUserDailyReflectionSettings(userId)
      .then((data) => {
        if (cancelled) return;
        const nextSections = data?.sections || [];
        setSections(nextSections);
        setSavedIds(data?.selectedQuestionIds || []);
        setBedtime(data?.bedtime || DEFAULT_BEDTIME);
        setSavedBedtime(data?.bedtime || DEFAULT_BEDTIME);
        setTodayScore(data?.todayScore || null);
        setExpanded(new Set(nextSections.map((section) => section.id)));
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(err?.message || "Failed to load daily reflection");
        onToast?.(err?.message || "Failed to load daily reflection");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isHealClient, onToast, userId]);

  function toggleSection(id) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleQuestion(sectionId, questionId) {
    if (!canSelect || saving) return;
    setSections((list) =>
      list.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              questions: (section.questions || []).map((question) => (
                question.id === questionId && !question.fixed
                  ? { ...question, selected: !question.selected }
                  : question
              )),
            }
          : section,
      ),
    );
  }

  async function saveSelection() {
    if (!userId || !canSelect || saving || !dirty) return;
    setSaving(true);
    try {
      const data = await saveUserDailyReflectionSettings(userId, {
        selectedQuestionIds: currentIds,
        bedtime,
      });
      setSections(data?.sections || sections);
      setSavedIds(data?.selectedQuestionIds || currentIds);
      setBedtime(data?.bedtime || bedtime);
      setSavedBedtime(data?.bedtime || bedtime);
      setTodayScore(data?.todayScore || todayScore);
      onToast?.("Daily reflection selection saved");
    } catch (err) {
      onToast?.(err?.message || "Could not save daily reflection");
    } finally {
      setSaving(false);
    }
  }

  if (!userId) {
    return <p className="ua-cp-bms-library-hint">Client is required to load daily reflection.</p>;
  }

  if (!isHealClient) {
    return (
      <div className="ua-cp-section ua-cp-reflect">
        <div className="ua-cp-reflect__head">
          <h2 className="ua-cp-reflect__title">Daily Reflection</h2>
          <p className="ua-cp-reflect__sub">Daily reflection is available for Heal clients.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ua-cp-section ua-cp-reflect">
      <div className="ua-cp-reflect__head">
        <h2 className="ua-cp-reflect__title">Daily Reflection</h2>
        <p className="ua-cp-reflect__sub">Scored daily check-in · monthly totals decide the champion</p>
      </div>

      <div className="ua-cp-reflect-score">
        <div className="ua-cp-reflect-score__left">
          <span>{todayScore ? "Today's reflection score" : "Selected for the client app"}</span>
          <strong>
            {todayScore
              ? `${todayScore.score} / ${todayScore.maxScore} points`
              : `${selectedCount} of ${questionTotal} questions · ${weightTotal}% weight`}
          </strong>
        </div>
        {todayScore ? (
          <div className="ua-cp-reflect-score__right">
            <strong>{Number(todayScore.score).toFixed(0)}</strong>
            <span>/ {todayScore.maxScore}</span>
          </div>
        ) : (
          <div className="ua-cp-reflect-score__right">
            <strong>{weightTotal}</strong>
            <span>/ 100</span>
          </div>
        )}
      </div>

      <div className="ua-cp-reflect-callouts">
        <div className="ua-cp-reflect-callout ua-cp-reflect-callout--app">
          <span className="ua-cp-reflect-callout__icon" aria-hidden="true">🔔</span>
          <p>
            Unlocks in the app 30 min before bedtime (~{formatBedtime(bedtime)}) and a reminder is sent every night before bed.
          </p>
          <div className="ua-cp-reflect-callout__actions">
            <label className="ua-cp-reflect-bedtime">
              Bedtime
              <input
                type="time"
                value={bedtime}
                disabled={!canSelect || saving}
                onChange={(e) => setBedtime(e.target.value)}
              />
              <span>{formatBedtime(bedtime)}</span>
            </label>
            <button
              type="button"
              className="ua-cp-btn ua-cp-btn--primary ua-cp-btn--sm"
              disabled={!canSelect}
              onClick={() => setPushOpen(true)}
            >
              Push to app
            </button>
          </div>
        </div>
        <div className="ua-cp-reflect-callout ua-cp-reflect-callout--champ">
          <span className="ua-cp-reflect-callout__icon" aria-hidden="true">🏁</span>
          <p>
            Championship counts from the <strong>1st of each month</strong>. <strong>Gut Reset</strong> days are excluded.
          </p>
        </div>
      </div>

      <p className="ua-cp-bms-library-hint">
        Admin maintains the DRF activity bank. The wellness coach selects which questions appear in this client&apos;s app.
        Fixed items stay on.
      </p>

      <div className="ua-cp-reflect-weightage">
        <span>{selectedCount} of {questionTotal} selected</span>
        <strong className={weightTotal === 100 ? " ua-cp-reflect-weightage__ok" : ""}>{weightTotal} / 100</strong>
      </div>

      {loading ? (
        <p className="ua-cp-bms-library-hint">Loading DRF activity bank…</p>
      ) : loadError ? (
        <p className="ua-cp-bms-library-hint">{loadError}</p>
      ) : sections.length ? (
        <div className="ua-cp-reflect-sections">
          {sections.map((section, index) => (
            <ReflectionSectionCard
              key={section.id}
              section={section}
              index={index}
              expanded={expanded.has(section.id)}
              canSelect={canSelect}
              busy={saving}
              onToggle={() => toggleSection(section.id)}
              onToggleQuestion={(questionId) => toggleQuestion(section.id, questionId)}
            />
          ))}
        </div>
      ) : (
        <p className="ua-cp-bms-library-hint">
          No live DRF questions yet. Add them in Config → DRF activity bank.
        </p>
      )}

      <div className="ua-cp-reflect-foot ua-cp-reflect-foot--single">
        <button
          type="button"
          className="ua-cp-btn ua-cp-btn--primary ua-cp-reflect-save"
          disabled={!canSelect || saving || !dirty || loading}
          onClick={saveSelection}
        >
          {saving ? "Saving…" : "Save selection"}
        </button>
      </div>

      <ConfirmModal
        open={pushOpen}
        eyebrow="Confirm this action"
        title={`Push an app reminder to ${clientName}?`}
        body="A notification goes to their phone straight away."
        confirmLabel="Yes, send it"
        onClose={() => setPushOpen(false)}
        onConfirm={() => {
          setPushOpen(false);
          onToast?.("Reminder pushed to app");
        }}
      />
    </div>
  );
}
