import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminListChallenges } from "../api/challengesApi.js";
import { UPDATED_ADMIN_PATHS } from "../data/dashboardData.js";

function todayIsoLocal() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function daysBetweenInclusive(start, end) {
  const a = new Date(`${start}T00:00:00`);
  const b = new Date(`${end}T00:00:00`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
  return Math.max(1, Math.floor((b.getTime() - a.getTime()) / 86400000) + 1);
}

function challengePhase(item, today) {
  const start = String(item.startDate || "");
  const end = String(item.endDate || "");
  const status = String(item.status || "").toLowerCase();
  if (status === "cancelled") return "cancelled";
  if (status === "completed") return "completed";
  if (status === "draft") return "draft";
  if (status !== "published") return status || "draft";
  if (start && start > today) return "upcoming";
  if (end && end < today) return "ended";
  return "running";
}

function challengeDayInfo(item, today) {
  const start = String(item.startDate || "");
  const end = String(item.endDate || "");
  const total = daysBetweenInclusive(start, end);
  if (!start || !end || !total) {
    return { day: 0, total: 0, pct: 0, label: "Dates TBD" };
  }
  if (start > today) {
    return { day: 0, total, pct: 0, label: `Starts ${start}` };
  }
  if (end < today) {
    return { day: total, total, pct: 100, label: `Ended ${end}` };
  }
  const day = daysBetweenInclusive(start, today);
  const pct = Math.min(100, Math.round((day / total) * 100));
  return { day, total, pct, label: `Day ${day} of ${total}` };
}

function formatMoney(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function ChallengeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2l3 6.5 7 .6-5.3 4.6 1.6 6.8L12 17l-6.9 3.5 1.6-6.8L1.4 9.1l7-.6z" />
    </svg>
  );
}

export function DashboardChallengesCard({ onToast }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const today = useMemo(() => todayIsoLocal(), []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminListChallenges(null, { limit: 100 });
      setItems(result?.items || []);
    } catch (err) {
      setItems([]);
      onToast?.(err?.message || "Could not load challenges");
    } finally {
      setLoading(false);
    }
  }, [onToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const enriched = useMemo(
    () =>
      (items || []).map((item) => {
        const phase = challengePhase(item, today);
        const progress = challengeDayInfo(item, today);
        return { ...item, phase, progress };
      }),
    [items, today],
  );

  const running = useMemo(
    () => enriched.filter((row) => row.phase === "running"),
    [enriched],
  );
  const upcoming = useMemo(
    () => enriched.filter((row) => row.phase === "upcoming"),
    [enriched],
  );
  const drafts = useMemo(
    () => enriched.filter((row) => row.phase === "draft"),
    [enriched],
  );
  const enrolledTotal = useMemo(
    () => enriched.reduce((sum, row) => sum + (Number(row.enrollmentCount) || 0), 0),
    [enriched],
  );

  const spotlight = useMemo(() => {
    const pool = [...running, ...upcoming, ...enriched.filter((row) => row.phase === "published")];
    return pool.slice(0, 4);
  }, [running, upcoming, enriched]);

  const goManage = () => navigate(`${UPDATED_ADMIN_PATHS.configs}/app-challenges`);

  return (
    <div className="ops-challenge ops-challenge--live">
      <div className="ops-challenge__head">
        <span className="ops-challenge__icon" aria-hidden="true">
          <ChallengeIcon />
        </span>
        <span className="ops-challenge__title">Challenges</span>
        <span className="ops-challenge__count">
          {loading ? "…" : `${running.length} RUNNING`}
        </span>
      </div>

      <div className="ops-challenge__stats">
        <div className="ops-challenge__stat">
          <strong>{loading ? "—" : running.length}</strong>
          <span>Live now</span>
        </div>
        <div className="ops-challenge__stat">
          <strong>{loading ? "—" : upcoming.length}</strong>
          <span>Upcoming</span>
        </div>
        <div className="ops-challenge__stat">
          <strong>{loading ? "—" : enrolledTotal}</strong>
          <span>Enrolled</span>
        </div>
        <div className="ops-challenge__stat">
          <strong>{loading ? "—" : drafts.length}</strong>
          <span>Drafts</span>
        </div>
      </div>

      <div className="ops-challenge__list">
        <div className="ops-challenge__list-items">
          {loading ? (
            <div className="ops-challenge__empty">Loading challenges…</div>
          ) : spotlight.length === 0 ? (
            <div className="ops-challenge__empty">
              No challenges yet. Create and publish one from Configs → Challenges.
            </div>
          ) : (
            spotlight.map((challenge) => (
              <button
                key={challenge.id}
                type="button"
                className="ops-challenge__item ops-challenge__item--btn"
                onClick={goManage}
              >
                <div className="ops-challenge__item-head">
                  <span className="ops-challenge__item-name">{challenge.title}</span>
                  <span className={`ops-challenge__phase ops-challenge__phase--${challenge.phase}`}>
                    {challenge.phase}
                  </span>
                </div>
                <div className="ops-challenge__bar">
                  <span
                    className="ops-challenge__bar-fill"
                    style={{ width: `${challenge.progress.pct}%` }}
                  />
                </div>
                <div className="ops-challenge__item-meta">
                  {challenge.progress.label}
                  {" · "}
                  {challenge.enrollmentCount || 0} enrolled
                  {" · "}
                  {formatMoney(challenge.price)}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="ops-challenge__foot">
        <button type="button" className="ops-challenge__manage" onClick={goManage}>
          Manage challenges
        </button>
      </div>
    </div>
  );
}
