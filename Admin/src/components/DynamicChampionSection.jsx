import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MONTHLY_CHAMPION_PAGE_SIZE,
  adminListMonthlyChampions,
  adminRunMonthlyChampionJob,
  adminUpdateMonthlyChampion,
  previousMonthYear,
  recentChampionMonthOptions,
} from "../api/monthlyChampionApi.js";
import { formatRecipeDate } from "../data/recipesConfigData.js";
import { asCopyString } from "../data/bannerConfigData.js";
import { CfgSelect, ListPagination } from "./shared.jsx";

function Panel({ title, subtitle, actions, children }) {
  return (
    <section className="ua-cfg-panel">
      <div className="ua-cfg-panel__head">
        <div>
          {title ? <h3 className="ua-cfg-panel__title">{title}</h3> : null}
          {subtitle ? <p className="ua-cfg-panel__sub">{subtitle}</p> : null}
        </div>
        {actions ? <div className="ua-cfg-panel__actions">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

function Avatar({ src, name }) {
  if (src) {
    return <img className="ua-cfg-cr-avatar ua-cfg-cr-avatar--img" src={src} alt="" />;
  }
  const initial = String(name || "?").trim().charAt(0).toUpperCase() || "?";
  return (
    <span className="ua-cfg-cr-avatar" aria-hidden="true">{initial}</span>
  );
}

function EditMessageModal({ entry, busy, onClose, onSave }) {
  const [message, setMessage] = useState(asCopyString(entry?.message));

  useEffect(() => {
    setMessage(asCopyString(entry?.message));
  }, [entry]);

  if (!entry) return null;

  return (
    <div className="ua-cp-modal-backdrop" onClick={onClose} role="presentation">
      <div className="ua-cfg-cr-edit" onClick={(event) => event.stopPropagation()} role="dialog" aria-labelledby="ch-edit-title">
        <div className="ua-cfg-cr-edit__head">
          <div>
            <p className="ua-cfg-rc-view__tag">Champion of the month</p>
            <h3 id="ch-edit-title" className="ua-cfg-cr-edit__title">Edit message</h3>
            <p className="ua-cfg-cr-edit__sub">
              {asCopyString(entry.name)} · {entry.monthLabel || entry.monthYear}
            </p>
          </div>
          <button type="button" className="ua-cfg-icon-btn" aria-label="Close" onClick={onClose}>×</button>
        </div>
        <div className="ua-cfg-cr-edit__body">
          <label className="ua-cfg-cr-edit__field">
            <span>Card message</span>
            <textarea
              className="ua-cfg-cr-edit__text"
              rows={5}
              maxLength={1000}
              value={message}
              disabled={busy}
              onChange={(event) => setMessage(event.target.value)}
            />
          </label>
        </div>
        <div className="ua-cfg-cr-edit__foot">
          <button type="button" className="ua-cfg-btn ua-cfg-btn--outline" onClick={onClose} disabled={busy}>Cancel</button>
          <button
            type="button"
            className="ua-cfg-btn ua-cfg-btn--primary"
            disabled={busy}
            onClick={() => onSave(message)}
          >
            {busy ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function mergeChampion(row, saved) {
  if (!saved) return row;
  return {
    ...row,
    ...saved,
    name: saved.name && saved.name !== "Unknown" ? saved.name : row.name,
    profileImage: saved.profileImage || row.profileImage,
    monthLabel: saved.monthLabel || row.monthLabel,
    commentCount: saved.commentCount || row.commentCount,
    averageScore: saved.averageScore ?? row.averageScore,
    daysSubmitted: saved.daysSubmitted ?? row.daysSubmitted,
    rank: saved.rank ?? row.rank,
  };
}

export function DynamicChampionSection({ items, setItems, onToast }) {
  const monthOptions = useMemo(() => recentChampionMonthOptions(12), []);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [jobBusy, setJobBusy] = useState(false);
  const [editing, setEditing] = useState(null);
  const [monthYear, setMonthYear] = useState("");
  const [jobMonth, setJobMonth] = useState(previousMonthYear);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: MONTHLY_CHAMPION_PAGE_SIZE,
    total: 0,
    pages: 1,
  });
  const [lastJob, setLastJob] = useState(null);

  const loadItems = useCallback(async (pageOverride) => {
    const nextPage = pageOverride ?? page;
    setLoading(true);
    try {
      const result = await adminListMonthlyChampions(null, {
        page: nextPage,
        limit: MONTHLY_CHAMPION_PAGE_SIZE,
        monthYear: monthYear || undefined,
      });
      const next = result.items || [];
      setItems(next);
      setPagination({
        page: Number(result.pagination?.page) || nextPage,
        limit: Number(result.pagination?.limit) || MONTHLY_CHAMPION_PAGE_SIZE,
        total: Number(result.pagination?.total) || next.length,
        pages: Number(result.pagination?.pages) || 1,
      });
    } catch (error) {
      setItems([]);
      onToast(error?.message || "Could not load monthly champions");
    } finally {
      setLoading(false);
    }
  }, [monthYear, onToast, page, setItems]);

  useEffect(() => {
    setPage(1);
  }, [monthYear]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  async function saveMessage(nextMessage) {
    if (!editing) return;
    const text = String(nextMessage || "").trim();
    if (!text) {
      onToast("Message is required");
      return;
    }
    setBusy(true);
    try {
      const saved = await adminUpdateMonthlyChampion(null, editing.id, { message: text });
      setItems((prev) => prev.map((row) => (row.id === saved.id ? mergeChampion(row, saved) : row)));
      setEditing(null);
      onToast("Champion message updated");
    } catch (error) {
      onToast(error?.message || "Could not update champion");
    } finally {
      setBusy(false);
    }
  }

  async function toggleLive(entry) {
    setBusy(true);
    try {
      const saved = await adminUpdateMonthlyChampion(null, entry.id, { live: !entry.live });
      setItems((prev) => prev.map((row) => (row.id === saved.id ? mergeChampion(row, saved) : row)));
      onToast(`${asCopyString(entry.name)} marked ${saved.live ? "live" : "hidden"}`);
    } catch (error) {
      onToast(error?.message || "Could not update champion status");
    } finally {
      setBusy(false);
    }
  }

  async function runJob() {
    setJobBusy(true);
    try {
      const result = await adminRunMonthlyChampionJob(null, { monthYear: jobMonth || undefined });
      setLastJob(result?.result || result);
      onToast(result?.message || "Monthly champion job executed");
      await loadItems(1);
      setPage(1);
    } catch (error) {
      onToast(error?.message || "Could not run champion job");
    } finally {
      setJobBusy(false);
    }
  }

  const liveCount = useMemo(() => items.filter((row) => row.live).length, [items]);

  return (
    <div className="ua-cfg-ch">
      <Panel
        title="Automatic ranking"
        subtitle="Ranks clients by average daily reflection score. Cron runs on the 1st of each month (~00:10 IST) for the previous month."
        actions={
          <div className="ua-cfg-bd-trigger__controls">
            <CfgSelect
              className="ua-cfg-ch-select"
              ariaLabel="Job month"
              options={monthOptions.filter((row) => row.value)}
              value={jobMonth}
              disabled={jobBusy}
              onChange={setJobMonth}
            />
            <button
              type="button"
              className="ua-cfg-btn ua-cfg-btn--primary ua-cfg-btn--sm"
              disabled={jobBusy}
              onClick={runJob}
            >
              {jobBusy ? "Running…" : "Run job now"}
            </button>
          </div>
        }
      >
        <div className="ua-cfg-bd-stats">
          <div className="ua-cfg-bd-stat ua-cfg-bd-stat--ok">
            <span>Live cards</span>
            <strong>{loading ? "…" : liveCount}</strong>
            <p>Visible on app & website</p>
          </div>
          <div className="ua-cfg-bd-stat ua-cfg-bd-stat--next">
            <span>Total listed</span>
            <strong>{loading ? "…" : pagination.total}</strong>
            <p>{monthYear ? monthOptions.find((row) => row.value === monthYear)?.label : "All months"}</p>
          </div>
          <div className="ua-cfg-bd-stat ua-cfg-bd-stat--fail">
            <span>Last job</span>
            <strong>
              {lastJob?.monthYear
                || lastJob?.result?.monthYear
                || "—"}
            </strong>
            <p>
              {lastJob
                ? `matched ${lastJob.matchedUsers ?? lastJob.result?.matchedUsers ?? 0} · created ${lastJob.created ?? lastJob.result?.created ?? 0}`
                : "Run the job to refresh champions"}
            </p>
          </div>
        </div>
      </Panel>

      <Panel
        title="Champion cards"
        subtitle="Generated by the monthly job — edit the message or hide a card from the public feed."
      >
        <div className="ua-cfg-rc-toolbar">
          <CfgSelect
            className="ua-cfg-ch-filter"
            ariaLabel="Filter by month"
            options={monthOptions}
            value={monthYear}
            disabled={loading || busy}
            onChange={setMonthYear}
          />
        </div>
        {items.length ? (
          <div className={`ua-cfg-cr-live__list${loading ? " is-loading" : ""}`}>
            {items.map((entry) => (
              <article key={entry.id} className={`ua-cfg-cr-row${entry.live ? " ua-cfg-cr-row--live" : ""}`}>
                <Avatar src={entry.profileImage} name={asCopyString(entry.name)} />
                <div className="ua-cfg-cr-row__copy">
                  <div className="ua-cfg-cr-row__meta">
                    <strong>{asCopyString(entry.name)}</strong>
                    {entry.rank != null ? <em>Rank #{entry.rank}</em> : null}
                    <span className={`ua-cfg-faq__shown${entry.live ? " is-on" : ""}`}>
                      {entry.live ? "LIVE" : "HIDDEN"}
                    </span>
                  </div>
                  <p>{asCopyString(entry.message) || "No message"}</p>
                  <p className="ua-cfg-panel__sub">
                    {entry.monthLabel || entry.monthYear}
                    {entry.averageScore != null ? ` · avg ${entry.averageScore}%` : ""}
                    {entry.daysSubmitted != null ? ` · ${entry.daysSubmitted} days` : ""}
                    {entry.commentCount ? ` · ${entry.commentCount} comments` : ""}
                    {entry.updatedAt ? ` · ${formatRecipeDate(entry.updatedAt)}` : ""}
                  </p>
                </div>
                <div className="ua-cfg-cr-row__actions">
                  <button
                    type="button"
                    className={`ua-toggle ua-toggle--sm${entry.live ? " ua-toggle--on" : ""}`}
                    aria-pressed={entry.live}
                    disabled={busy}
                    onClick={() => toggleLive(entry)}
                  >
                    <span className="ua-toggle__knob" />
                  </button>
                  <button
                    type="button"
                    className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm"
                    disabled={busy}
                    onClick={() => setEditing(entry)}
                  >
                    Edit
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="ua-cfg-panel__sub">
            {loading
              ? "Fetching champions…"
              : monthYear
                ? "No champions for this month yet. Run the job to generate them."
                : "No champion cards yet. Run the monthly job to generate them."}
          </p>
        )}

        <ListPagination
          page={pagination.page}
          pages={pagination.pages}
          total={pagination.total}
          pageSize={MONTHLY_CHAMPION_PAGE_SIZE}
          onPageChange={setPage}
          label="Champion pagination"
        />
      </Panel>

      <EditMessageModal
        entry={editing}
        busy={busy}
        onClose={() => setEditing(null)}
        onSave={saveMessage}
      />
    </div>
  );
}
