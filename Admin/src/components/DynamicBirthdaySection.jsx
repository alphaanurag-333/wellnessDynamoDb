import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BIRTHDAY_PAGE_SIZE,
  adminListBirthdayNotifications,
  adminListBirthdayPosts,
  adminResendBirthdayNotification,
  adminRunBirthdayJob,
  adminUpdateBirthdayPost,
  todayDateOnly,
} from "../api/birthdayApi.js";
import { formatRecipeDate } from "../data/recipesConfigData.js";
import { asCopyString } from "../data/bannerConfigData.js";
import { ListPagination } from "./shared.jsx";

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
      <div className="ua-cfg-cr-edit" onClick={(event) => event.stopPropagation()} role="dialog" aria-labelledby="bd-edit-title">
        <div className="ua-cfg-cr-edit__head">
          <div>
            <p className="ua-cfg-rc-view__tag">Birthday card</p>
            <h3 id="bd-edit-title" className="ua-cfg-cr-edit__title">Edit message</h3>
            <p className="ua-cfg-cr-edit__sub">
              {asCopyString(entry.name)} · {entry.postDate || "—"}
            </p>
          </div>
          <button type="button" className="ua-cfg-icon-btn" aria-label="Close" onClick={onClose}>×</button>
        </div>
        <div className="ua-cfg-cr-edit__body">
          <label className="ua-cfg-cr-edit__field">
            <span>Wish message</span>
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

function mergeBirthdayPost(row, saved) {
  if (!saved) return row;
  return {
    ...row,
    ...saved,
    name: saved.name && saved.name !== "Unknown" ? saved.name : row.name,
    profileImage: saved.profileImage || row.profileImage,
    commentCount: saved.commentCount || row.commentCount,
  };
}

export function DynamicBirthdaySection({ posts, setPosts, queue, setQueue, onToast }) {
  const today = useMemo(() => todayDateOnly(), []);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [busy, setBusy] = useState(false);
  const [jobBusy, setJobBusy] = useState(false);
  const [editing, setEditing] = useState(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: BIRTHDAY_PAGE_SIZE,
    total: 0,
    pages: 1,
  });
  const [lastJob, setLastJob] = useState(null);

  const loadQueue = useCallback(async () => {
    setLoadingQueue(true);
    try {
      const result = await adminListBirthdayNotifications(null, {
        page: 1,
        limit: 50,
        notificationDate: today,
      });
      setQueue(result.items || []);
    } catch (error) {
      setQueue([]);
      onToast(error?.message || "Could not load today's birthday queue");
    } finally {
      setLoadingQueue(false);
    }
  }, [onToast, setQueue, today]);

  const loadPosts = useCallback(async (pageOverride) => {
    const nextPage = pageOverride ?? page;
    setLoadingPosts(true);
    try {
      const result = await adminListBirthdayPosts(null, {
        page: nextPage,
        limit: BIRTHDAY_PAGE_SIZE,
      });
      const next = result.items || [];
      setPosts(next);
      setPagination({
        page: Number(result.pagination?.page) || nextPage,
        limit: Number(result.pagination?.limit) || BIRTHDAY_PAGE_SIZE,
        total: Number(result.pagination?.total) || next.length,
        pages: Number(result.pagination?.pages) || 1,
      });
    } catch (error) {
      setPosts([]);
      onToast(error?.message || "Could not load birthday posts");
    } finally {
      setLoadingPosts(false);
    }
  }, [onToast, page, setPosts]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const queueStats = useMemo(() => {
    const sent = queue.filter((row) => row.status === "sent").length;
    const pending = queue.filter((row) => row.status === "pending").length;
    const failed = queue.filter((row) => row.status === "failed").length;
    return { sent, pending, failed };
  }, [queue]);

  async function runJob() {
    setJobBusy(true);
    try {
      const result = await adminRunBirthdayJob(null, { dateOnly: today });
      setLastJob(result);
      onToast(result?.message || "Birthday job completed");
      await Promise.all([loadQueue(), loadPosts(1)]);
      setPage(1);
    } catch (error) {
      onToast(error?.message || "Could not run birthday job");
    } finally {
      setJobBusy(false);
    }
  }

  async function resend(entry) {
    setBusy(true);
    try {
      const result = await adminResendBirthdayNotification(null, entry.id);
      if (result?.notification) {
        setQueue((prev) =>
          prev.map((row) => (row.id === result.notification.id ? { ...row, ...result.notification } : row)),
        );
      } else {
        await loadQueue();
      }
      onToast(result?.message || `Resent to ${asCopyString(entry.name)}`);
    } catch (error) {
      onToast(error?.message || "Could not resend birthday notification");
    } finally {
      setBusy(false);
    }
  }

  async function saveMessage(nextMessage) {
    if (!editing) return;
    const text = String(nextMessage || "").trim();
    if (!text) {
      onToast("Message is required");
      return;
    }
    setBusy(true);
    try {
      const saved = await adminUpdateBirthdayPost(null, editing.id, { message: text });
      setPosts((prev) => prev.map((row) => (row.id === saved.id ? mergeBirthdayPost(row, saved) : row)));
      setEditing(null);
      onToast("Birthday message updated");
    } catch (error) {
      onToast(error?.message || "Could not update birthday post");
    } finally {
      setBusy(false);
    }
  }

  async function toggleLive(entry) {
    setBusy(true);
    try {
      const saved = await adminUpdateBirthdayPost(null, entry.id, { live: !entry.live });
      setPosts((prev) => prev.map((row) => (row.id === saved.id ? mergeBirthdayPost(row, saved) : row)));
      onToast(`${asCopyString(entry.name)} marked ${saved.live ? "live" : "hidden"}`);
    } catch (error) {
      onToast(error?.message || "Could not update birthday post");
    } finally {
      setBusy(false);
    }
  }

  const liveCount = useMemo(() => posts.filter((row) => row.live).length, [posts]);

  return (
    <div className="ua-cfg-ch">
      <Panel
        title="⏱ Automatic trigger"
        subtitle="Runs every night at ~12:05 AM IST and sends a wish + social post to everyone whose birthday it is."
        actions={
          <button
            type="button"
            className="ua-cfg-btn ua-cfg-btn--primary ua-cfg-btn--sm"
            disabled={jobBusy}
            onClick={runJob}
          >
            {jobBusy ? "Running…" : "Run now"}
          </button>
        }
      >
        <div className="ua-cfg-bd-stats">
          <div className="ua-cfg-bd-stat ua-cfg-bd-stat--ok">
            <span>Today sent</span>
            <strong>{loadingQueue ? "…" : queueStats.sent}</strong>
            <p>{today}</p>
          </div>
          <div className="ua-cfg-bd-stat ua-cfg-bd-stat--next">
            <span>Queued / pending</span>
            <strong>{loadingQueue ? "…" : queueStats.pending}</strong>
            <p>{lastJob ? `Last run matched ${lastJob.matchedUsers ?? 0}` : "Waiting for tonight’s job"}</p>
          </div>
          <div className="ua-cfg-bd-stat ua-cfg-bd-stat--fail">
            <span>Failures</span>
            <strong>{loadingQueue ? "…" : queueStats.failed}</strong>
            <p>{lastJob ? `${lastJob.failed ?? 0} failed on last run` : "Resend from the queue below"}</p>
          </div>
        </div>
      </Panel>

      <Panel
        title="Today's birthdays"
        subtitle={`${queueStats.sent} sent · ${queueStats.pending} pending · ${queueStats.failed} failed`}
      >
        {queue.length ? (
          <div className={`ua-cfg-bd-queue${loadingQueue ? " is-loading" : ""}`}>
            {queue.map((entry) => (
              <article key={entry.id} className="ua-cfg-bd-queue__row">
                <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
                  <Avatar src={entry.profileImage} name={asCopyString(entry.name)} />
                  <div>
                    <strong>{asCopyString(entry.name)}</strong>
                    <p>{asCopyString(entry.message) || "Birthday wish"}</p>
                  </div>
                </div>
                <span className="ua-cfg-bd-queue__time">{entry.time}</span>
                <span
                  className={`ua-cfg-bd-queue__status is-${
                    entry.status === "pending" ? "queued" : entry.status
                  }`}
                >
                  {entry.status}
                </span>
                {entry.status === "failed" || entry.status === "pending" ? (
                  <button
                    type="button"
                    className="ua-cfg-btn ua-cfg-btn--ghost ua-cfg-btn--sm ua-cfg-bd-queue__resend"
                    disabled={busy}
                    onClick={() => resend(entry)}
                  >
                    Resend
                  </button>
                ) : (
                  <span className="ua-cfg-bd-queue__spacer" />
                )}
              </article>
            ))}
          </div>
        ) : (
          <p className="ua-cfg-panel__sub">
            {loadingQueue ? "Fetching today's queue…" : "No birthdays matched for today yet."}
          </p>
        )}
      </Panel>

      <Panel
        title="Birthday posts"
        subtitle={`${pagination.total} total · ${liveCount} live on the public feed`}
      >
        {posts.length ? (
          <div className={`ua-cfg-cr-live__list${loadingPosts ? " is-loading" : ""}`}>
            {posts.map((entry) => (
              <article key={entry.id} className={`ua-cfg-cr-row${entry.live ? " ua-cfg-cr-row--live" : ""}`}>
                <Avatar src={entry.profileImage} name={asCopyString(entry.name)} />
                <div className="ua-cfg-cr-row__copy">
                  <div className="ua-cfg-cr-row__meta">
                    <strong>{asCopyString(entry.name)}</strong>
                    <span className={`ua-cfg-faq__shown${entry.live ? " is-on" : ""}`}>
                      {entry.live ? "LIVE" : "HIDDEN"}
                    </span>
                  </div>
                  <p>{asCopyString(entry.message) || "No message"}</p>
                  <p className="ua-cfg-panel__sub">
                    {entry.postDate || "—"}
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
            {loadingPosts ? "Fetching birthday posts…" : "No birthday posts yet. Run the job to create them."}
          </p>
        )}

        <ListPagination
          page={pagination.page}
          pages={pagination.pages}
          total={pagination.total}
          pageSize={BIRTHDAY_PAGE_SIZE}
          onPageChange={setPage}
          label="Birthday post pagination"
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
