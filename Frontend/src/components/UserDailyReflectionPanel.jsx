import { useCallback, useEffect, useState } from "react";
import Swal from "sweetalert2";

const ACTIVITY_LABELS = {
  yogaNamaskar: "Yoga Namaskar",
  suryaNamaskar: "Surya Namaskar",
  bhramari: "Bhramari",
  meditation: "Meditation",
  nadiSuddhi: "Nadi Suddhi",
  lnb: "LNB",
  pranayam: "Pranayam",
  blessingsFromSun: "Blessings from Sun",
  physicalExercise: "Physical Exercise",
  grounding: "Grounding",
  gratitudeJournal: "Gratitude Journal",
};

const UNIT_LABELS = {
  cycles: "Cycles",
  times: "Times",
  mins: "Mins",
  boolean: "Yes / No",
};

function toStoredMap(activities) {
  const map = {};
  for (const row of activities || []) {
    map[row.key] = {
      enabled: Boolean(row.enabled),
      goal: Number(row.goal) || 0,
    };
  }
  return map;
}

export function UserDailyReflectionPanel({
  token,
  userId,
  api,
  readOnly = false,
  onUnauthorized,
}) {
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState("");
  const [activities, setActivities] = useState([]);
  const [storedSettings, setStoredSettings] = useState({});

  const loadAll = useCallback(async () => {
    if (!token || !userId) return;
    setLoading(true);
    try {
      const res = await api.getSettings(token, userId);
      setActivities(res?.activities ?? []);
      setStoredSettings(res?.storedSettings ?? toStoredMap(res?.activities));
    } catch (err) {
      if (err?.status === 401) onUnauthorized?.();
      else Swal.fire("Error", err?.message || "Failed to load daily reflection settings", "error");
    } finally {
      setLoading(false);
    }
  }, [api, onUnauthorized, token, userId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const persistSettings = async (nextStored, changedKey) => {
    if (readOnly || !api.updateSettings) return;
    setSavingKey(changedKey || "all");
    try {
      const res = await api.updateSettings(token, userId, nextStored);
      setActivities(res?.activities ?? []);
      setStoredSettings(res?.storedSettings ?? nextStored);
      Swal.fire("Saved", "Daily reflection settings updated", "success");
    } catch (err) {
      if (err?.status === 401) onUnauthorized?.();
      else Swal.fire("Error", err?.message || "Failed to update settings", "error");
      await loadAll();
    } finally {
      setSavingKey("");
    }
  };

  const handleToggle = async (key) => {
    const next = {
      ...storedSettings,
      [key]: {
        enabled: !Boolean(storedSettings?.[key]?.enabled),
        goal: Number(storedSettings?.[key]?.goal) || 0,
      },
    };
    setStoredSettings(next);
    await persistSettings(next, key);
  };

  const handleGoalChange = (key, value) => {
    const goal = Math.max(0, Number(value) || 0);
    setStoredSettings((prev) => ({
      ...prev,
      [key]: {
        enabled: Boolean(prev?.[key]?.enabled),
        goal,
      },
    }));
  };

  const handleGoalBlur = async (key) => {
    if (readOnly || !api.updateSettings) return;
    await persistSettings(storedSettings, key);
  };

  if (loading) {
    return <p className="page-card__desc">Loading daily reflection settings…</p>;
  }

  return (
    <div className="user-daily-reflection-panel">
      <div className="page-card mt-mode-card">
        <div className="mt-mode-card__header">
          <div>
            <h3 className="form-card__title">Daily reflection activities</h3>
            <p className="page-card__desc">
              Enable activities for this client and set their daily goals. Disabled activities
              will not appear in the mobile daily reflection form.
              {readOnly ? " (Read-only view)" : ""}
            </p>
          </div>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Activity</th>
                <th>Unit</th>
                <th>Status</th>
                <th>Daily goal</th>
              </tr>
            </thead>
            <tbody>
              {activities.map((row) => {
                const active = Boolean(storedSettings?.[row.key]?.enabled);
                const isBoolean = row.unit === "boolean";
                const goal = Number(storedSettings?.[row.key]?.goal) || 0;
                const busy = savingKey === row.key || savingKey === "all";

                return (
                  <tr key={row.key}>
                    <td>{ACTIVITY_LABELS[row.key] || row.key}</td>
                    <td>{UNIT_LABELS[row.unit] || row.unit}</td>
                    <td>
                      <button
                        type="button"
                        className={`hp-feature-toggle${active ? " hp-feature-toggle--active" : ""}`}
                        disabled={readOnly || busy || !api.updateSettings}
                        onClick={() => handleToggle(row.key)}
                      >
                        <span>{active ? "Enabled" : "Disabled"}</span>
                      </button>
                    </td>
                    <td>
                      {isBoolean ? (
                        <span className="page-card__desc">Yes / No response</span>
                      ) : (
                        <input
                          type="number"
                          min={0}
                          className="user-field__input"
                          style={{ maxWidth: 120 }}
                          disabled={readOnly || !active || busy || !api.updateSettings}
                          value={goal}
                          onChange={(e) => handleGoalChange(row.key, e.target.value)}
                          onBlur={() => handleGoalBlur(row.key)}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
