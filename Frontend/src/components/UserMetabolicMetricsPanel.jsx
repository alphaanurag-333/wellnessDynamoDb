import { useCallback, useEffect, useState } from "react";
import Swal from "sweetalert2";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";


import { formatDate } from "../admin/utils/formatDate.js";
function MetricCard({ title, current, children, emptyText = "No data recorded yet." }) {
  return (
    <div className="page-card metabolic-metric-card">
      <h3 className="form-card__title">{title}</h3>
      {!current ? (
        <p className="page-card__desc">{emptyText}</p>
      ) : (
        <>
          <div className="metabolic-metric-card__current">{children}</div>
          {current.recordedAt ? (
            <p className="page-card__desc metabolic-metric-card__date">
              Last updated: {formatDate(current.recordedAt)}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}

function MiniBarChart({ data, dataKey, color = "#3b82f6" }) {
  if (!data?.length) return null;
  return (
    <div className="metabolic-mini-chart">
      <ResponsiveContainer width="100%" height={140}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="chartDate" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} width={36} />
          <Tooltip />
          <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function MiniLineChart({ data, dataKey, color = "#8b5cf6" }) {
  if (!data?.length) return null;
  return (
    <div className="metabolic-mini-chart">
      <ResponsiveContainer width="100%" height={140}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="chartDate" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} width={40} />
          <Tooltip />
          <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function HistoryTable({ columns, rows }) {
  if (!rows?.length) return <p className="page-card__desc">No history entries.</p>;
  return (
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
            <tr key={row.id || row.recordedAt}>
              {columns.map((col) => (
                <td key={col.key}>{col.render(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function UserMetabolicMetricsPanel({ token, userId, api, onUnauthorized }) {
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [triglycerides, setTriglycerides] = useState("");
  const [ggt, setGgt] = useState("");
  const [bmiOverride, setBmiOverride] = useState("");
  const [waistCmOverride, setWaistCmOverride] = useState("");
  const [savingFli, setSavingFli] = useState(false);

  const loadAll = useCallback(async () => {
    if (!token || !userId) return;
    setLoading(true);
    try {
      const dashRes = await api.getDashboard(token, userId, { historyLimit: 12 });
      setDashboard(dashRes?.dashboard ?? null);
    } catch (err) {
      if (err?.status === 401) onUnauthorized?.();
      else Swal.fire("Error", err?.message || "Failed to load metabolic health metrics", "error");
    } finally {
      setLoading(false);
    }
  }, [api, onUnauthorized, token, userId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleSaveFattyLiver = async (event) => {
    event.preventDefault();
    if (!api.saveFattyLiverMetric) return;

    const payload = {
      triglycerides: Number(triglycerides),
      ggt: Number(ggt),
    };
    if (bmiOverride.trim()) payload.bmi = Number(bmiOverride);
    if (waistCmOverride.trim()) payload.waistCm = Number(waistCmOverride);

    if (!payload.triglycerides || !payload.ggt) {
      Swal.fire("Validation", "Triglycerides and GGT are required.", "warning");
      return;
    }

    setSavingFli(true);
    try {
      await api.saveFattyLiverMetric(token, userId, payload);
      setTriglycerides("");
      setGgt("");
      setBmiOverride("");
      setWaistCmOverride("");
      await loadAll();
      Swal.fire("Saved", "Fatty Liver Index updated successfully.", "success");
    } catch (err) {
      if (err?.status === 401) onUnauthorized?.();
      else Swal.fire("Error", err?.message || "Failed to save Fatty Liver Index", "error");
    } finally {
      setSavingFli(false);
    }
  };

  if (loading) {
    return <p className="page-card__desc">Loading metabolic health metrics…</p>;
  }

  const bmi = dashboard?.bmi;
  const bmr = dashboard?.bmr;
  const tdee = dashboard?.tdee;
  const bodyFat = dashboard?.bodyFat;
  const visceralFat = dashboard?.visceralFat;
  const fattyLiver = dashboard?.fattyLiver;

  return (
    <div className="metabolic-metrics-panel">
      <div className="page-card">
        <h3 className="form-card__title">Metabolic Health Metrics</h3>
        <p className="page-card__desc">
          Client-submitted calculator results from the mobile app. Review BMI, BMR, body fat, and
          visceral fat trends below.
        </p>
      </div>

      <MetricCard title="BMI" current={bmi?.current}>
        <div className="metabolic-value-block">
          <strong className="metabolic-value-block__value">{bmi?.current?.value ?? "—"}</strong>
          <span className="metabolic-value-block__label">{bmi?.current?.category ?? "—"}</span>
        </div>
        <MiniBarChart data={bmi?.history ?? []} dataKey="value" color="#f59e0b" />
        <HistoryTable
          rows={bmi?.history ?? []}
          columns={[
            { key: "date", label: "Date", render: (r) => formatDate(r.recordedAt) },
            { key: "value", label: "BMI", render: (r) => r.value },
            { key: "category", label: "Category", render: (r) => r.category || "—" },
          ]}
        />
      </MetricCard>

      <MetricCard title="Basal Metabolic Rate (BMR)" current={bmr?.current}>
        <div className="metabolic-value-block metabolic-value-block--orange">
          <strong className="metabolic-value-block__value">
            {bmr?.current?.value != null ? bmr.current.value.toLocaleString() : "—"}
          </strong>
          <span className="metabolic-value-block__label">kcal / day</span>
        </div>
        <MiniLineChart data={bmr?.history ?? []} dataKey="bmr" color="#f97316" />
        <HistoryTable
          rows={bmr?.history ?? []}
          columns={[
            { key: "date", label: "Date", render: (r) => formatDate(r.recordedAt) },
            { key: "bmr", label: "BMR (kcal)", render: (r) => r.bmr },
          ]}
        />
      </MetricCard>

      <MetricCard title="Total Daily Energy Expenditure (TDEE)" current={tdee?.current}>
        <div className="metabolic-value-block metabolic-value-block--green">
          <strong className="metabolic-value-block__value">
            {tdee?.current?.value != null ? tdee.current.value.toLocaleString() : "—"}
          </strong>
          <span className="metabolic-value-block__label">kcal / day</span>
        </div>
        <MiniLineChart data={tdee?.history ?? []} dataKey="value" color="#22c55e" />
        <HistoryTable
          rows={tdee?.history ?? []}
          columns={[
            { key: "date", label: "Date", render: (r) => formatDate(r.recordedAt) },
            { key: "value", label: "TDEE (kcal)", render: (r) => r.value },
          ]}
        />
      </MetricCard>

      <MetricCard title="Body Fat % & Lean Muscle Mass %" current={bodyFat?.current}>
        <div className="metabolic-dual-values">
          <div className="metabolic-value-block metabolic-value-block--orange">
            <strong className="metabolic-value-block__value">{bodyFat?.current?.bodyFatPercent ?? "—"}%</strong>
            <span className="metabolic-value-block__label">
              Body fat
              {bodyFat?.current?.goal != null ? ` · Goal: ${bodyFat.current.goal}%` : ""}
            </span>
          </div>
          <div className="metabolic-value-block metabolic-value-block--blue">
            <strong className="metabolic-value-block__value">
              {bodyFat?.current?.leanMuscleMassPercent ?? "—"}%
            </strong>
            <span className="metabolic-value-block__label">Lean muscle mass</span>
          </div>
        </div>
        <MiniBarChart data={bodyFat?.history ?? []} dataKey="bodyFatPercent" color="#f97316" />
        <HistoryTable
          rows={bodyFat?.history ?? []}
          columns={[
            { key: "date", label: "Date", render: (r) => formatDate(r.recordedAt) },
            { key: "bf", label: "Body fat %", render: (r) => r.bodyFatPercent },
            { key: "lm", label: "Lean muscle %", render: (r) => r.leanMuscleMassPercent },
          ]}
        />
      </MetricCard>

      <MetricCard title="Visceral Fat" current={visceralFat?.current}>
        <div className="metabolic-triple-values">
          <div className="metabolic-value-block metabolic-value-block--orange">
            <strong className="metabolic-value-block__value">{visceralFat?.current?.waistHeightRatio ?? "—"}</strong>
            <span className="metabolic-value-block__label">Waist : Height</span>
          </div>
          <div className="metabolic-value-block metabolic-value-block--blue">
            <strong className="metabolic-value-block__value">
              {visceralFat?.current?.estimatedVisceralFat ?? "—"}
            </strong>
            <span className="metabolic-value-block__label">Est. visceral fat</span>
          </div>
          <div className="metabolic-value-block metabolic-value-block--green">
            <strong className="metabolic-value-block__value">
              {visceralFat?.current?.visceralFatPercent ?? "—"}%
            </strong>
            <span className="metabolic-value-block__label">Visceral fat %</span>
          </div>
        </div>
        <p className="page-card__desc">Risk: {visceralFat?.current?.riskAssessment ?? "—"}</p>
        <MiniBarChart data={visceralFat?.history ?? []} dataKey="estimatedVisceralFat" color="#3b82f6" />
        <HistoryTable
          rows={visceralFat?.history ?? []}
          columns={[
            { key: "date", label: "Date", render: (r) => formatDate(r.recordedAt) },
            { key: "wh", label: "Waist:Height", render: (r) => r.waistHeightRatio },
            { key: "evf", label: "Est. VF", render: (r) => r.estimatedVisceralFat },
            { key: "risk", label: "Risk", render: (r) => r.visceralFatRisk || "—" },
          ]}
        />
      </MetricCard>

      <div className="page-card metabolic-metric-card">
        <h3 className="form-card__title">Fatty Liver Index</h3>
        {fattyLiver?.current ? (
          <>
            <div className="metabolic-metric-card__current">
              <div className="metabolic-value-block metabolic-value-block--green">
                <strong className="metabolic-value-block__value">
                  {fattyLiver.current.value ?? fattyLiver.current.fli ?? "—"}
                </strong>
                <span className="metabolic-value-block__label">
                  FLI
                  {fattyLiver.current.riskLabel ? ` · ${fattyLiver.current.riskLabel}` : ""}
                </span>
              </div>
              <p className="page-card__desc">
                TG: {fattyLiver.current.triglycerides ?? "—"} · GGT:{" "}
                {fattyLiver.current.ggt ?? "—"} · BMI: {fattyLiver.current.bmi ?? "—"} · Waist:{" "}
                {fattyLiver.current.waistCm ?? "—"} cm
              </p>
              <MiniBarChart
                data={fattyLiver.history ?? []}
                dataKey="value"
                color="#22c55e"
              />
            </div>
            {fattyLiver.current.recordedAt ? (
              <p className="page-card__desc metabolic-metric-card__date">
                Last updated: {formatDate(fattyLiver.current.recordedAt)}
              </p>
            ) : null}
          </>
        ) : (
          <p className="page-card__desc">
            No Fatty Liver Index recorded yet. Enter triglycerides and GGT from the
            client&apos;s blood report below to calculate FLI.
          </p>
        )}
        {api.saveFattyLiverMetric ? (
          <form className="metabolic-fli-form" onSubmit={handleSaveFattyLiver}>
            <div className="metabolic-fli-form__grid">
              <label className="metabolic-fli-form__field">
                <span>Triglycerides (mg/dL)</span>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={triglycerides}
                  onChange={(e) => setTriglycerides(e.target.value)}
                  placeholder="e.g. 150"
                />
              </label>
              <label className="metabolic-fli-form__field">
                <span>GGT (U/L)</span>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={ggt}
                  onChange={(e) => setGgt(e.target.value)}
                  placeholder="e.g. 45"
                />
              </label>
              <label className="metabolic-fli-form__field">
                <span>BMI override (optional)</span>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={bmiOverride}
                  onChange={(e) => setBmiOverride(e.target.value)}
                  placeholder="Uses latest BMI log if blank"
                />
              </label>
              <label className="metabolic-fli-form__field">
                <span>Waist cm override (optional)</span>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={waistCmOverride}
                  onChange={(e) => setWaistCmOverride(e.target.value)}
                  placeholder="Uses latest visceral fat log if blank"
                />
              </label>
            </div>
            <button type="submit" className="btn btn-primary" disabled={savingFli}>
              {savingFli ? "Saving…" : "Save Fatty Liver Index"}
            </button>
          </form>
        ) : null}
        <HistoryTable
          rows={fattyLiver?.history ?? []}
          columns={[
            { key: "date", label: "Date", render: (r) => formatDate(r.recordedAt) },
            { key: "tg", label: "TG", render: (r) => r.triglycerides ?? "—" },
            { key: "ggt", label: "GGT", render: (r) => r.ggt ?? "—" },
            { key: "fli", label: "FLI", render: (r) => r.value ?? r.fli ?? "—" },
            { key: "risk", label: "Risk", render: (r) => r.riskLabel || "—" },
          ]}
        />
      </div>
    </div>
  );
}
