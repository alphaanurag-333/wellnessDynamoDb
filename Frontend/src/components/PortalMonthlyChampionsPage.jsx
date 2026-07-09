import { useCallback, useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { CoachPageLoadingState } from "../wellnessCoach/components/CoachPageLoader.jsx";
import { AdminMediaImage } from "../admin/components/AdminMediaImage.jsx";
import { AdminListHeader, listCountSubtitle } from "../admin/components/AdminCrud.jsx";
import {
  formatDateTime,
  localTodayDateOnly,
  monthYearFromDate,
  rankBadge,
} from "../admin/pages/monthlyChampion/MonthlyChampionShared.js";

function formatMonthLabel(monthYear) {
  if (!monthYear) return "";
  const [year, month] = String(monthYear).split("-").map(Number);
  if (!year || !month) return monthYear;
  return new Date(year, month - 1, 1).toLocaleString("en-US", { month: "long", year: "numeric" });
}

function rankTone(rank) {
  const n = Number(rank);
  if (n === 1) return "gold";
  if (n === 2) return "silver";
  if (n === 3) return "bronze";
  return "default";
}

function ChampionCard({ row, onViewComments }) {
  const tone = rankTone(row.rank);
  const commentCount = row.commentCount ?? 0;

  return (
    <article className={`mc-champion-card mc-champion-card--${tone}`}>
      <div className="mc-champion-card__rank" aria-hidden="true">
        <span className="mc-champion-card__rank-num">#{row.rank}</span>
      </div>

      <div className="mc-champion-card__main">
        <div className="mc-champion-card__header">
          <AdminMediaImage
            path={row.user?.profileImage}
            round
            width={56}
            height={56}
            alt={row.user?.name || "Champion"}
            className="mc-champion-card__avatar"
          />
          <div className="mc-champion-card__identity">
            <h3 className="mc-champion-card__name">{row.user?.name || "—"}</h3>
            <p className="mc-champion-card__meta">{formatMonthLabel(row.monthYear)}</p>
          </div>
          <span className={`mc-champion-card__badge mc-champion-card__badge--${tone}`}>
            {rankBadge(row.rank)}
          </span>
        </div>

        <div className="mc-champion-card__stats">
          <div className="mc-champion-card__stat">
            <span className="mc-champion-card__stat-label">Avg score</span>
            <strong className="mc-champion-card__stat-value">{row.averageScore}%</strong>
          </div>
          <div className="mc-champion-card__stat">
            <span className="mc-champion-card__stat-label">Days submitted</span>
            <strong className="mc-champion-card__stat-value">{row.daysSubmitted}</strong>
          </div>
          <div className="mc-champion-card__stat">
            <span className="mc-champion-card__stat-label">Comments</span>
            <strong className="mc-champion-card__stat-value">{commentCount}</strong>
          </div>
        </div>

        {row.message ? (
          <blockquote className="mc-champion-card__message">{row.message}</blockquote>
        ) : null}

        <div className="mc-champion-card__footer">
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => onViewComments(row)}
          >
            View comments ({commentCount})
          </button>
        </div>
      </div>
    </article>
  );
}

function ChampionCommentsModal({ champion, comments, loading, onClose }) {
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  if (!champion) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="mc-comments-title" onClick={onClose}>
      <div
        className="modal-card modal-card--wide mc-comments-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mc-comments-modal__header">
          <AdminMediaImage
            path={champion.user?.profileImage}
            round
            width={48}
            height={48}
            alt=""
          />
          <div className="mc-comments-modal__header-text">
            <h2 id="mc-comments-title" className="modal-card__title">
              Comments — {champion.user?.name || "Champion"}
            </h2>
            <p className="modal-card__subtitle">
              {rankBadge(champion.rank)} · {formatMonthLabel(champion.monthYear)}
            </p>
          </div>
          <button type="button" className="btn btn--ghost btn--sm mc-comments-modal__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        <div className="mc-comments-modal__body">
          {loading ? (
            <p className="page-card__desc">Loading comments…</p>
          ) : comments.length === 0 ? (
            <div className="mc-comments-modal__empty">
              <p>No comments yet.</p>
              <span className="page-card__desc">Be the first to celebrate this champion.</span>
            </div>
          ) : (
            <ul className="mc-comments-list">
              {comments.map((comment) => (
                <li key={comment._id || comment.id} className="mc-comment-item">
                  <AdminMediaImage
                    path={comment.commenter?.profileImage}
                    round
                    width={40}
                    height={40}
                    alt=""
                    className="mc-comment-item__avatar"
                  />
                  <div className="mc-comment-item__body">
                    <div className="mc-comment-item__head">
                      <strong className="mc-comment-item__name">
                        {comment.commenter?.name || "User"}
                      </strong>
                      <time className="mc-comment-item__time" dateTime={comment.createdAt}>
                        {formatDateTime(comment.createdAt)}
                      </time>
                    </div>
                    <p className="mc-comment-item__text">{comment.comment}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="modal-card__actions">
          <button type="button" className="btn btn--primary btn--sm" onClick={onClose}>
            Close
          </button>
        </div>
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
  const [commentsModal, setCommentsModal] = useState({
    open: false,
    champion: null,
    comments: [],
    loading: false,
  });

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

  const closeCommentsModal = () => {
    setCommentsModal({ open: false, champion: null, comments: [], loading: false });
  };

  const onViewComments = async (row) => {
    setCommentsModal({ open: true, champion: row, comments: [], loading: true });
    try {
      const detail = await getChampionById(token, row._id || row.id);
      setCommentsModal({
        open: true,
        champion: { ...row, ...(detail || {}) },
        comments: detail?.comments || [],
        loading: false,
      });
    } catch (e) {
      if (e?.status === 401) return onUnauthorized?.();
      closeCommentsModal();
      await Swal.fire({ icon: "error", title: "Load failed", text: e.message || "Could not load comments." });
    }
  };

  return (
    <div className="user-page mc-champions-page">
      <div className="page-card">
        <AdminListHeader title={title} subtitle={subtitle} />

        <div className="admin-crud-filters mc-champions-filters">
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
          {listMonth ? (
            <p className="mc-champions-filters__hint">
              Showing champions for <strong>{formatMonthLabel(listMonth)}</strong>
            </p>
          ) : null}
        </div>

        {loading ? (
          <CoachPageLoadingState label="Loading monthly champions…" />
        ) : rows.length === 0 ? (
          <div className="mc-champions-empty">
            <p className="page-card__title">No champions this month</p>
            <p className="page-card__desc">Try selecting a different month to view past champions.</p>
          </div>
        ) : (
          <div className="mc-champions-grid">
            {rows.map((row) => (
              <ChampionCard key={row._id || row.id} row={row} onViewComments={onViewComments} />
            ))}
          </div>
        )}
      </div>

      {commentsModal.open ? (
        <ChampionCommentsModal
          champion={commentsModal.champion}
          comments={commentsModal.comments}
          loading={commentsModal.loading}
          onClose={closeCommentsModal}
        />
      ) : null}
    </div>
  );
}
