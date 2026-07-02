import { useCallback, useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";

const FEATURES = [
  { key: "weightPic", label: "Weight pic" },
  { key: "glucose", label: "Glucose" },
  { key: "bloodPressure", label: "Blood pressure" },
  { key: "menstrualCycle", label: "Menstrual cycle" },
  { key: "conditionComparison", label: "Condition comparison" },
];

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function HistoryTable({ title, columns, rows, emptyText = "No entries yet." }) {
  return (
    <div className="page-card">
      <h3 className="form-card__title">{title}</h3>
      {rows.length === 0 ? (
        <p className="page-card__desc">{emptyText}</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col.key}>{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  {columns.map((col) => (
                    <td key={col.key}>{col.render(row)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function UserHealthProgressPanel({
  token,
  userId,
  api,
  readOnly = false,
  onUnauthorized,
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({});
  const [storedSettings, setStoredSettings] = useState({});
  const [isFemale, setIsFemale] = useState(false);
  const [weightLogs, setWeightLogs] = useState([]);
  const [glucoseLogs, setGlucoseLogs] = useState([]);
  const [bpLogs, setBpLogs] = useState([]);
  const [cycleLogs, setCycleLogs] = useState([]);
  const [conditionLogs, setConditionLogs] = useState([]);

  const loadAll = useCallback(async () => {
    if (!token || !userId) return;
    setLoading(true);
    try {
      const settingsRes = await api.getSettings(token, userId);
      const nextSettings = settingsRes?.settings ?? {};
      setSettings(nextSettings);
      setStoredSettings(settingsRes?.storedSettings ?? {});
      setIsFemale(Boolean(settingsRes?.isFemale));

      const requests = [];
      if (nextSettings.weightPic && api.listWeight) {
        requests.push(api.listWeight(token, userId, { page: 1, limit: 50 }).then((r) => setWeightLogs(r?.logs ?? [])));
      } else setWeightLogs([]);
      if (nextSettings.glucose && api.listGlucose) {
        requests.push(api.listGlucose(token, userId, { page: 1, limit: 50 }).then((r) => setGlucoseLogs(r?.logs ?? [])));
      } else setGlucoseLogs([]);
      if (nextSettings.bloodPressure && api.listBloodPressure) {
        requests.push(api.listBloodPressure(token, userId, { page: 1, limit: 50 }).then((r) => setBpLogs(r?.logs ?? [])));
      } else setBpLogs([]);
      if (nextSettings.menstrualCycle && api.listMenstrualCycle) {
        requests.push(api.listMenstrualCycle(token, userId, { page: 1, limit: 50 }).then((r) => setCycleLogs(r?.logs ?? [])));
      } else setCycleLogs([]);
      if (nextSettings.conditionComparison && api.listCondition) {
        requests.push(api.listCondition(token, userId, { page: 1, limit: 50 }).then((r) => setConditionLogs(r?.logs ?? [])));
      } else setConditionLogs([]);

      await Promise.all(requests);
    } catch (err) {
      if (err?.status === 401) onUnauthorized?.();
      else Swal.fire("Error", err?.message || "Failed to load health progress", "error");
    } finally {
      setLoading(false);
    }
  }, [api, onUnauthorized, token, userId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleToggle = async (key) => {
    if (readOnly || !api.updateSettings) return;
    const next = {
      ...storedSettings,
      [key]: !Boolean(storedSettings?.[key]),
    };
    if (key === "menstrualCycle" && !isFemale) {
      next.menstrualCycle = false;
    }
    setSaving(true);
    try {
      const res = await api.updateSettings(token, userId, next);
      setSettings(res?.settings ?? next);
      setStoredSettings(res?.storedSettings ?? next);
      await loadAll();
      Swal.fire("Saved", "Health progress settings updated", "success");
    } catch (err) {
      if (err?.status === 401) onUnauthorized?.();
      else Swal.fire("Error", err?.message || "Failed to update settings", "error");
    } finally {
      setSaving(false);
    }
  };

  const conditionGroups = useMemo(() => {
    const map = new Map();
    for (const log of conditionLogs) {
      const key = log.bodyPart || "other";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(log);
    }
    return [...map.entries()];
  }, [conditionLogs]);

  if (loading) {
    return <p className="page-card__desc">Loading health progress…</p>;
  }

  return (
    <div className="user-health-progress-panel">
      <div className="page-card mt-mode-card">
        <div className="mt-mode-card__header">
          <div>
            <h3 className="form-card__title">Client health progress features</h3>
            <p className="page-card__desc">
              Choose which trackers this client can see in the mobile app.
              {readOnly ? " (Read-only view)" : ""}
            </p>
          </div>
        </div>
        <div className="hp-feature-grid">
          {FEATURES.map((feature) => {
            const disabled =
              feature.key === "menstrualCycle" && !isFemale;
            const active = Boolean(settings?.[feature.key]);
            return (
              <button
                key={feature.key}
                type="button"
                className={`hp-feature-toggle${active ? " hp-feature-toggle--active" : ""}`}
                disabled={readOnly || saving || disabled || !api.updateSettings}
                onClick={() => handleToggle(feature.key)}
                title={
                  disabled
                    ? "Menstrual cycle is only available for female clients"
                    : undefined
                }
              >
                <span>{feature.label}</span>
                <strong>{active ? "Enabled" : "Disabled"}</strong>
              </button>
            );
          })}
        </div>
      </div>

      {settings.weightPic ? (
        <HistoryTable
          title="Weight history"
          columns={[
            { key: "date", label: "Date", render: (row) => formatDate(row.recordedAt) },
            { key: "weight", label: "Weight (kg)", render: (row) => row.weightKg },
            {
              key: "photo",
              label: "Photo",
              render: (row) =>
                row.weightPicUrl ? (
                  <a href={row.weightPicUrl} target="_blank" rel="noreferrer">
                    View
                  </a>
                ) : (
                  "—"
                ),
            },
          ]}
          rows={weightLogs}
        />
      ) : null}

      {settings.glucose ? (
        <HistoryTable
          title="Glucose history"
          columns={[
            { key: "date", label: "Date", render: (row) => formatDate(row.recordedAt) },
            { key: "type", label: "Type", render: (row) => String(row.type || "").toUpperCase() },
            { key: "value", label: "Value", render: (row) => row.value },
          ]}
          rows={glucoseLogs}
        />
      ) : null}

      {settings.bloodPressure ? (
        <HistoryTable
          title="Blood pressure history"
          columns={[
            { key: "date", label: "Date", render: (row) => formatDate(row.recordedAt) },
            { key: "sys", label: "SYS", render: (row) => row.sys },
            { key: "dia", label: "DIA", render: (row) => row.dia },
          ]}
          rows={bpLogs}
        />
      ) : null}

      {settings.menstrualCycle ? (
        <HistoryTable
          title="Menstrual cycle history"
          columns={[
            { key: "start", label: "Start", render: (row) => formatDate(row.startDate) },
            { key: "end", label: "End", render: (row) => formatDate(row.endDate) },
          ]}
          rows={cycleLogs}
        />
      ) : null}

      {settings.conditionComparison ? (
        <div className="page-card">
          <h3 className="form-card__title">Condition comparison photos</h3>
          {conditionGroups.length === 0 ? (
            <p className="page-card__desc">No entries yet.</p>
          ) : (
            conditionGroups.map(([part, logs]) => (
              <div key={part} className="hp-condition-group">
                <h4 className="form-card__subtitle">{part.replace(/_/g, " ")}</h4>
                <div className="hp-condition-grid">
                  {logs.map((log) => (
                    <div key={log.id} className="hp-condition-card">
                      <p>{formatDate(log.recordedAt)}</p>
                      {log.picUrl ? (
                        <img src={log.picUrl} alt={part} className="hp-condition-image" />
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
