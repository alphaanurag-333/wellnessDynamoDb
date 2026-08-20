import { useEffect, useMemo, useState } from "react";
import { useViewAs } from "../../context/ViewAsContext.jsx";
import {
  fetchUserDailyReflectionSettings,
  saveUserDailyReflectionSettings,
  submitUserDailyReflectionScore,
  pushUserDailyReflectionBedtime,
} from "../../api/dailyReflectionApi.js";
import {
  TRACKING_ROWS,
  activitiesPayload,
  formatBedtime,
  groupActivities,
  unitLabel,
} from "../../data/reflectionData.js";

function ConfirmModal({ open, eyebrow, title, body, confirmLabel, confirmTone = "primary", busy, onClose, onConfirm }) {
  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "Escape" && !busy) onClose();
    }
    if (open) document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [busy, open, onClose]);

  if (!open) return null;

  return (
    <div className="ua-cp-modal-backdrop ua-cp-modal-backdrop--drawer" onClick={busy ? undefined : onClose} role="presentation">
      <div className="ua-cp-modal ua-cp-reflect-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="reflect-modal-title">
        <p className={`ua-cp-reflect-modal__eyebrow ua-cp-reflect-modal__eyebrow--${confirmTone}`}>{eyebrow}</p>
        <h3 id="reflect-modal-title" className="ua-cp-reflect-modal__title">{title}</h3>
        {body ? <p className="ua-cp-reflect-modal__body">{body}</p> : null}
        <div className="ua-cp-reflect-modal__foot">
          <button type="button" className="ua-cp-btn ua-cp-btn--outline" disabled={busy} onClick={onClose}>Cancel</button>
          <button
            type="button"
            className={`ua-cp-btn${confirmTone === "danger" ? " ua-cp-reflect-modal__confirm--danger" : " ua-cp-btn--primary"}`}
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? "Sending…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function trackingLabel(metric, unit) {
  if (!metric) return "Not logged";
  const current = Number(metric.current || 0);
  const goal = Number(metric.goal || 0);
  const pct = metric.percent == null ? null : Number(metric.percent);
  const amount = goal > 0 ? `${current} / ${goal} ${unit}` : `${current} ${unit}`;
  return pct == null ? amount : `${amount} · ${pct}%`;
}

function ActivityRow({ index, activity, canEdit, busy, onToggle, onGoal, onToday }) {
  const locked = !canEdit;

  return (
    <div className={`ua-cp-reflect-question${activity.enabled ? "" : " is-off"}`}>
      <span className="ua-cp-reflect-question__num">{index + 1}.</span>
      <span className="ua-cp-reflect-question__text ua-cp-reflect-question__text--readonly">{activity.name}</span>
      <div className="ua-cp-reflect-question__score">
        {activity.unit === "boolean" ? (
          activity.enabled ? (
            <div className="ua-cp-reflect-yesno" role="group" aria-label={`${activity.name} today`}>
              <button
                type="button"
                className={`ua-cp-reflect-yesno__btn${activity.todayValue ? " is-on" : ""}`}
                disabled={locked || busy}
                onClick={() => onToday(1)}
              >
                Yes
              </button>
              <button
                type="button"
                className={`ua-cp-reflect-yesno__btn${!activity.todayValue ? " is-on" : ""}`}
                disabled={locked || busy}
                onClick={() => onToday(0)}
              >
                No
              </button>
            </div>
          ) : (
            <span>Daily</span>
          )
        ) : (
          <>
            <label className="ua-cp-reflect-field">
              Goal
              <input
                className="ua-cp-reflect-goal"
                type="number"
                min="0"
                max="9999"
                value={activity.goal}
                disabled={locked || busy}
                onChange={(e) => onGoal(e.target.value)}
              />
            </label>
            {activity.enabled ? (
              <label className="ua-cp-reflect-field">
                Today
                <input
                  className="ua-cp-reflect-today"
                  type="number"
                  min="0"
                  max="9999"
                  value={activity.todayValue}
                  disabled={locked || busy}
                  onChange={(e) => onToday(e.target.value)}
                />
              </label>
            ) : null}
            <span>{unitLabel(activity.unit)}</span>
          </>
        )}
        <button
          type="button"
          className={`ua-toggle ua-toggle--sm${activity.enabled ? " ua-toggle--on" : ""}`}
          aria-pressed={activity.enabled}
          aria-label={activity.enabled ? `Hide ${activity.name} from app` : `Show ${activity.name} in app`}
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
  canEdit,
  busy,
  onToggle,
  onToggleActivity,
  onGoal,
  onToday,
}) {
  const selectedCount = (section.activities || []).filter((activity) => activity.enabled).length;

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
          <span className="ua-cp-reflect-section__pill ua-cp-reflect-section__points">
            {selectedCount} of {(section.activities || []).length} in app
          </span>
        </div>
      </div>
      {expanded ? (
        <div className="ua-cp-reflect-section__body">
          {(section.activities || []).map((activity, qIndex) => (
            <ActivityRow
              key={activity.key}
              index={qIndex}
              activity={activity}
              canEdit={canEdit}
              busy={busy}
              onToggle={() => onToggleActivity(activity.key)}
              onGoal={(value) => onGoal(activity.key, value)}
              onToday={(value) => onToday(activity.key, value)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function snapshotKey(activities) {
  return (activities || [])
    .map((activity) => `${activity.key}:${activity.enabled ? 1 : 0}:${Number(activity.goal) || 0}`)
    .join("|");
}

export function ReflectionSection({ user, onToast }) {
  const userId = String(user?.id || "").trim();
  const isHealClient = String(user?.userTier || "").toLowerCase() === "heal" || user?.tier === "Seek to Heal";
  const { can } = useViewAs();
  const canEdit = can("console.diet.edit");

  const [activities, setActivities] = useState([]);
  const [savedSettingsKey, setSavedSettingsKey] = useState("");
  const [tracking, setTracking] = useState(null);
  const [bedtime, setBedtime] = useState("");
  const [savedBedtime, setSavedBedtime] = useState("");
  const [todayScore, setTodayScore] = useState(null);
  const [date, setDate] = useState("");
  const [expanded, setExpanded] = useState(() => new Set(["tracking"]));
  const [loading, setLoading] = useState(Boolean(userId));
  const [saving, setSaving] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [pushOpen, setPushOpen] = useState(false);

  const clientName = user?.name?.split(" ")[0] || "Client";
  const groups = useMemo(() => groupActivities(activities), [activities]);
  const enabledCount = useMemo(() => activities.filter((activity) => activity.enabled).length, [activities]);
  const settingsDirty = snapshotKey(activities) !== savedSettingsKey || bedtime !== savedBedtime;
  const busy = saving || scoring || pushing;

  function applyForm(data) {
    const nextActivities = data?.activities || [];
    setActivities(nextActivities);
    setSavedSettingsKey(snapshotKey(nextActivities));
    setTracking(data?.tracking || null);
    setBedtime(data?.bedtime || "");
    setSavedBedtime(data?.bedtime || "");
    setTodayScore(data?.todayScore || null);
    setDate(data?.date || "");
  }

  useEffect(() => {
    if (!userId || !isHealClient) {
      setActivities([]);
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
        applyForm(data);
        setExpanded(new Set(["tracking", ...groupActivities(data?.activities || []).map((group) => group.id)]));
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

  function updateActivity(key, patch) {
    setActivities((list) => list.map((activity) => (
      activity.key === key ? { ...activity, ...patch } : activity
    )));
  }

  function toggleActivity(key) {
    if (!canEdit || busy) return;
    setActivities((list) => list.map((activity) => {
      if (activity.key !== key) return activity;
      const enabled = !activity.enabled;
      const goal = enabled && !(Number(activity.goal) > 0)
        ? Number(activity.defaultGoal) || 0
        : activity.goal;
      return { ...activity, enabled, goal };
    }));
  }

  function changeGoal(key, value) {
    const n = Number.parseInt(String(value), 10);
    updateActivity(key, { goal: Number.isFinite(n) && n >= 0 ? n : 0 });
  }

  function changeToday(key, value) {
    const n = Number.parseInt(String(value), 10);
    updateActivity(key, { todayValue: Number.isFinite(n) && n >= 0 ? n : 0 });
  }

  async function saveSelection() {
    if (!userId || !canEdit || saving || !settingsDirty) return;
    setSaving(true);
    try {
      const data = await saveUserDailyReflectionSettings(userId, {
        activities: activitiesPayload(activities),
        bedtime,
      });
      applyForm({
        ...data,
        activities: (data.activities || []).map((row) => {
          const local = activities.find((item) => item.key === row.key);
          return local ? { ...row, todayValue: local.todayValue } : row;
        }),
      });
      onToast?.("Daily reflection activities saved for the app");
    } catch (err) {
      onToast?.(err?.message || "Could not save daily reflection");
    } finally {
      setSaving(false);
    }
  }

  async function saveTodayScore() {
    if (!userId || !canEdit || scoring) return;
    const enabled = activities.filter((activity) => activity.enabled);
    const missingGoal = enabled.find((activity) => activity.unit !== "boolean" && !(Number(activity.goal) > 0));
    if (missingGoal) {
      onToast?.(`Set a goal for ${missingGoal.name} first`);
      return;
    }
    if (settingsDirty) {
      onToast?.("Save the activity selection first");
      return;
    }

    const activityValues = {};
    let gratitudeYes = false;
    for (const activity of enabled) {
      if (activity.unit === "boolean") {
        gratitudeYes = Number(activity.todayValue) > 0;
      } else {
        activityValues[activity.key] = Number(activity.todayValue) || 0;
      }
    }

    setScoring(true);
    try {
      const data = await submitUserDailyReflectionScore(userId, {
        activityValues,
        gratitudeYes,
        date,
      });
      applyForm(data);
      onToast?.(`Today's score saved: ${Number(data?.todayScore?.score ?? data?.score ?? 0)} / 100`);
    } catch (err) {
      onToast?.(err?.message || "Could not save today's score");
    } finally {
      setScoring(false);
    }
  }

  async function sendBedtimePush() {
    if (!userId || !canEdit || pushing) return;
    setPushing(true);
    try {
      if (settingsDirty) {
        const data = await saveUserDailyReflectionSettings(userId, {
          activities: activitiesPayload(activities),
          bedtime,
        });
        applyForm({
          ...data,
          activities: (data.activities || []).map((row) => {
            const local = activities.find((item) => item.key === row.key);
            return local ? { ...row, todayValue: local.todayValue } : row;
          }),
        });
      }
      await pushUserDailyReflectionBedtime(userId);
      setPushOpen(false);
      onToast?.("Bedtime reminder pushed to app");
    } catch (err) {
      onToast?.(err?.message || "Could not send bedtime reminder");
    } finally {
      setPushing(false);
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
              : `${enabledCount} of ${activities.length} activities enabled`}
          </strong>
        </div>
        {todayScore ? (
          <div className="ua-cp-reflect-score__right">
            <strong>{Number(todayScore.score).toFixed(0)}</strong>
            <span>/ {todayScore.maxScore}</span>
          </div>
        ) : (
          <div className="ua-cp-reflect-score__right">
            <strong>{enabledCount}</strong>
            <span>/ {activities.length || 0}</span>
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
                disabled={!canEdit || busy}
                onChange={(e) => setBedtime(e.target.value)}
              />
              <span>{formatBedtime(bedtime)}</span>
            </label>
            <button
              type="button"
              className="ua-cp-btn ua-cp-btn--primary ua-cp-btn--sm"
              disabled={!canEdit || busy}
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
        Enable the same yoga and lifestyle activities the client logs in the app. Set a goal, then fill today&apos;s values here if you are scoring on their behalf.
      </p>

      <div className="ua-cp-reflect-weightage">
        <span>{enabledCount} of {activities.length} enabled in app</span>
        <strong>{todayScore ? `${Number(todayScore.score).toFixed(0)} / 100` : "No score yet"}</strong>
      </div>

      {loading ? (
        <p className="ua-cp-bms-library-hint">Loading daily reflection…</p>
      ) : loadError ? (
        <p className="ua-cp-bms-library-hint">{loadError}</p>
      ) : (
        <div className="ua-cp-reflect-sections">
          <div className="ua-cp-reflect-section">
            <div className="ua-cp-reflect-section__head">
              <div className="ua-cp-reflect-section__head-left">
                <button type="button" className="ua-cp-reflect-section__toggle" onClick={() => toggleSection("tracking")} aria-expanded={expanded.has("tracking")}>
                  <span className={`ua-cp-reflect-section__chev${expanded.has("tracking") ? " ua-cp-reflect-section__chev--open" : ""}`} aria-hidden="true">›</span>
                </button>
                <span className="ua-cp-reflect-section__badge">1</span>
                <span className="ua-cp-reflect-section__title ua-cp-reflect-section__title--readonly">Auto tracking</span>
              </div>
              <div className="ua-cp-reflect-section__meta">
                <span className="ua-cp-reflect-section__pill" title="Pulled from steps, water, meals and dosages">
                  <span aria-hidden="true">🔒</span> From app trackers
                </span>
              </div>
            </div>
            {expanded.has("tracking") ? (
              <div className="ua-cp-reflect-section__body">
                {TRACKING_ROWS.map((row, index) => (
                  <div key={row.key} className="ua-cp-reflect-question">
                    <span className="ua-cp-reflect-question__num">{index + 1}.</span>
                    <span className="ua-cp-reflect-question__text ua-cp-reflect-question__text--readonly">{row.name}</span>
                    <div className="ua-cp-reflect-question__score">
                      <span className="ua-cp-reflect-tracking">{trackingLabel(tracking?.[row.key], row.unit)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {groups.map((section, index) => (
            <ReflectionSectionCard
              key={section.id}
              section={section}
              index={index + 1}
              expanded={expanded.has(section.id)}
              canEdit={canEdit}
              busy={busy}
              onToggle={() => toggleSection(section.id)}
              onToggleActivity={toggleActivity}
              onGoal={changeGoal}
              onToday={changeToday}
            />
          ))}
        </div>
      )}

      <div className="ua-cp-reflect-foot">
        <button
          type="button"
          className="ua-cp-btn ua-cp-btn--outline ua-cp-reflect-save"
          disabled={!canEdit || scoring || loading}
          onClick={saveTodayScore}
        >
          {scoring ? "Saving score…" : "Save today's score"}
        </button>
        <button
          type="button"
          className="ua-cp-btn ua-cp-btn--primary ua-cp-reflect-save"
          disabled={!canEdit || saving || !settingsDirty || loading}
          onClick={saveSelection}
        >
          {saving ? "Saving…" : "Save selection"}
        </button>
      </div>

      <ConfirmModal
        open={pushOpen}
        eyebrow="Confirm this action"
        title={`Push a bedtime reminder to ${clientName}?`}
        body={`A notification goes to their phone now, using bedtime ${formatBedtime(bedtime)}.`}
        confirmLabel="Yes, send it"
        busy={pushing}
        onClose={() => !pushing && setPushOpen(false)}
        onConfirm={sendBedtimePush}
      />
    </div>
  );
}
