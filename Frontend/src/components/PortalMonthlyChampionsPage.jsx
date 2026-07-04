import { useCallback, useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { CoachPageLoadingState } from "../wellnessCoach/components/CoachPageLoader.jsx";
import { AdminMediaImage } from "../admin/components/AdminMediaImage.jsx";
import { AdminListHeader, listCountSubtitle } from "../admin/components/AdminCrud.jsx";
import {
  localTodayDateOnly,
  monthYearFromDate,
  rankBadge,
} from "../admin/pages/monthlyChampion/MonthlyChampionShared.js";

function ChampionCard({ row, onViewComments }) {
  return (
    <div className="page-card mt-pending-card">
      <div className="mt-pending-card__header">
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <AdminMediaImage path={row.user?.profileImage} round width={48} height={48} alt={row.user?.name || "Profile"} />
          <div>
            <h3 className="mt-pending-card__title">{row.user?.name || "—"}</h3>
            <p className="mt-pending-card__meta">
              {row.monthYear} · Avg score {row.averageScore}% · {row.daysSubmitted} day(s) submitted
            </p>
          </div>
        </div>
        <span className="mt-pending-card__badge">{rankBadge(row.rank)}</span>
      </div>
      <p className="mt-pending-card__desc">{row.message}</p>
      <div className="mt-pending-card__actions">
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => onViewComments(row)}>
          View comments ({row.commentCount ?? 0})
        </button>
      </div>
    </div>
  );
}

export function PortalMonthlyChampionsPage({
  token,
  onUnauthorized,
  listChampions,
  getChampionById,
  title = "Monthly champions",
}) {
  const [listDate, setListDate] = useState(() => localTodayDateOnly());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const listMonth = monthYearFromDate(listDate);

  const loadRows = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await listChampions(token, { limit: 50, monthYear: listMonth || undefined });
      setRows(data.monthlyChampionPosts);
    } catch (e) {
      if (e?.status === 401) return onUnauthorized?.();
      await Swal.fire({ icon: "error", title: "Load failed", text: e.message });
    } finally {
      setLoading(false);
    }
  }, [token, listMonth, listChampions, onUnauthorized]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const subtitle = useMemo(
    () => listCountSubtitle(loading, rows.length, "monthly champion", "monthly champions"),
    [loading, rows.length]
  );

  const onViewComments = async (row) => {
    let comments = [];
    try {
      const detail = await getChampionById(token, row._id || row.id);
      comments = detail?.comments || [];
    } catch (e) {
      if (e?.status === 401) return onUnauthorized?.();
      await Swal.fire({ icon: "error", title: "Load failed", text: e.message || "Could not load comments." });
      return;
    }

    const html =
      comments.length === 0
        ? "<p>No comments yet.</p>"
        : comments
            .map(
              (c) =>
                `<div style="text-align:left;margin-bottom:8px;"><strong>${c.commenter?.name || "Someone"}</strong>: ${c.comment}</div>`
            )
            .join("");
    await Swal.fire({ title: `Comments — ${row.user?.name || "Champion"}`, html, width: 480 });
  };

  return (
    <div className="user-page">
      <div className="page-card">
        <AdminListHeader title={title} subtitle={subtitle} />

        <div className="admin-crud-filters">
          <label className="user-field admin-crud-filters__select">
            <span className="user-field__label">Champion month</span>
            <input
              type="date"
              className="user-field__input"
              value={listDate}
              max={localTodayDateOnly()}
              onChange={(e) => setListDate(e.target.value)}
            />
          </label>
        </div>

        {loading ? (
          <CoachPageLoadingState label="Loading monthly champions…" />
        ) : rows.length === 0 ? (
          <p className="page-card__desc">No monthly champions found.</p>
        ) : (
          rows.map((row) => <ChampionCard key={row._id || row.id} row={row} onViewComments={onViewComments} />)
        )}
      </div>
    </div>
  );
}
