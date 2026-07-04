import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Swal from "sweetalert2";
import { AdminPageLoader } from "../admin/components/AdminLoader.jsx";

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function daysInMonth(monthYear) {
  const [year, month] = String(monthYear || "").split("-").map(Number);
  if (!year || !month) return 30;
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function buildChartData(monthYear, history) {
  const total = daysInMonth(monthYear);
  const scoreByDate = new Map((history || []).map((row) => [row.date, row.score]));
  const rows = [];
  for (let day = 1; day <= total; day += 1) {
    const dateStr = `${monthYear}-${String(day).padStart(2, "0")}`;
    rows.push({
      date: dateStr,
      day,
      score: scoreByDate.has(dateStr) ? scoreByDate.get(dateStr) : null,
    });
  }
  return rows;
}

function ScoreTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const value = payload[0]?.value;
  return (
    <div className="drs-graph__tooltip">
      <strong>Day {label}</strong>
      <div>{value == null ? "No submission" : `Score: ${value}%`}</div>
    </div>
  );
}

/**
 * Line chart of a single client's daily reflection score across a chosen month.
 * `fetchHistory(token, userId, month)` must resolve to `{ month, history: [{date, score}] }`.
 */
export function DailyReflectionScoreGraph({ token, userId, fetchHistory, onUnauthorized }) {
  const [month, setMonth] = useState(currentMonth);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token || !userId) return;
    setLoading(true);
    try {
      const res = await fetchHistory(token, userId, month);
      setHistory(res?.history ?? []);
    } catch (err) {
      if (err?.status === 401) return onUnauthorized?.();
      await Swal.fire({ icon: "error", title: "Load failed", text: err?.message || "Failed to load score history." });
    } finally {
      setLoading(false);
    }
  }, [token, userId, month, fetchHistory, onUnauthorized]);

  useEffect(() => {
    load();
  }, [load]);

  const chartData = useMemo(() => buildChartData(month, history), [month, history]);
  const submittedCount = history.length;
  const averageScore = submittedCount
    ? Math.round((history.reduce((sum, row) => sum + (Number(row.score) || 0), 0) / submittedCount) * 10) / 10
    : 0;

  return (
    <div className="page-card mt-mode-card">
      <div className="mt-mode-card__header">
        <div>
          <h3 className="form-card__title">Daily reflection score</h3>
          <p className="page-card__desc">
            {submittedCount > 0
              ? `${submittedCount} day(s) submitted this month · Average score ${averageScore}%`
              : "No submissions yet for this month."}
          </p>
        </div>
        <label className="user-field" style={{ maxWidth: 200 }}>
          <span className="user-field__label">Month</span>
          <input
            type="month"
            className="user-field__input"
            value={month}
            max={currentMonth()}
            onChange={(e) => setMonth(e.target.value || currentMonth())}
          />
        </label>
      </div>

      {loading ? (
        <AdminPageLoader label="Loading score history…" />
      ) : (
        <div className="drs-graph">
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} label={{ value: "Day of month", position: "insideBottom", offset: -2, fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} width={36} />
              <Tooltip content={<ScoreTooltip />} />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#0f7f06"
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
