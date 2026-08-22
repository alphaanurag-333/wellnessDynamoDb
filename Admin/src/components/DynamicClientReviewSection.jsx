import { useCallback, useEffect, useMemo, useState } from "react";
import {
  adminDeleteClientTestimonial,
  adminListClientTestimonials,
  adminUpdateClientTestimonial,
} from "../api/clientTestimonialApi.js";
import { TESTIMONIAL_PAGE_SIZE } from "../data/testimonialDropdownData.js";
import { formatRecipeDate } from "../data/recipesConfigData.js";
import { asCopyString } from "../data/bannerConfigData.js";
import { moveConfigListItem } from "../utils/configReorder.js";
import { ConfirmDialog } from "./ConfirmDialog.jsx";
import { CfgSelect, ListPagination } from "./shared.jsx";
import { SectionSurfacePanel } from "./SectionSurfacePanel.jsx";

const RATING_OPTIONS = [5, 4, 3, 2, 1].map((value) => ({
  value,
  label: `${value} star${value === 1 ? "" : "s"}`,
}));

function Panel({ title, subtitle, actions, children }) {
  return (
    <section className="ua-cfg-panel">
      <div className="ua-cfg-panel__head">
        <div className="ua-cfg-panel__copy">
          {title ? <h3 className="ua-cfg-panel__title">{title}</h3> : null}
          {subtitle ? <p className="ua-cfg-panel__sub">{subtitle}</p> : null}
        </div>
        {actions ? <div className="ua-cfg-panel__actions">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

function Stars({ count = 5 }) {
  const filled = Math.max(0, Math.min(5, Number(count) || 0));
  return (
    <span className="ua-cfg-cr-stars" aria-label={`${filled} stars`}>
      <span>{"★★★★★".slice(0, filled)}</span>
      <span className="ua-cfg-cr-stars__empty">{"★★★★★".slice(filled)}</span>
    </span>
  );
}

function Avatar({ src, name }) {
  if (src) {
    return <img className="ua-cfg-cr-avatar ua-cfg-cr-avatar--img" src={src} alt="" />;
  }
  return (
    <span className="ua-cfg-cr-avatar ua-cfg-cr-avatar--empty" aria-hidden="true" title={asCopyString(name)}>
      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
        <path d="M12 12a4.5 4.5 0 1 0-4.5-4.5A4.5 4.5 0 0 0 12 12Zm0 2.25c-3.6 0-6.75 1.8-6.75 4.05V20h13.5v-1.7c0-2.25-3.15-4.05-6.75-4.05Z" />
      </svg>
    </span>
  );
}

function EditReviewModal({ review, busy, onClose, onSave }) {
  const [quote, setQuote] = useState(asCopyString(review?.quote));
  const [rating, setRating] = useState(review?.rating ?? 5);

  useEffect(() => {
    setQuote(asCopyString(review?.quote));
    setRating(review?.rating ?? 5);
  }, [review]);

  if (!review) return null;

  return (
    <div className="ua-cp-modal-backdrop" onClick={onClose} role="presentation">
      <div className="ua-cfg-cr-edit" onClick={(event) => event.stopPropagation()} role="dialog" aria-labelledby="cr-edit-title">
        <div className="ua-cfg-cr-edit__head">
          <div>
            {/* <p className="ua-cfg-rc-view__tag">Client review</p> */}
            <h3 id="cr-edit-title" className="ua-cfg-cr-edit__title">Edit review</h3>
            <p className="ua-cfg-cr-edit__sub">{asCopyString(review.name)}</p>
          </div>
          <button type="button" className="ua-cfg-icon-btn" aria-label="Close" onClick={onClose}>×</button>
        </div>
        <div className="ua-cfg-cr-edit__body">
          <label className="ua-cfg-cr-edit__field">
            <span>Rating</span>
            <CfgSelect
              className="ua-cfg-cr-edit__select"
              ariaLabel="Rating"
              options={RATING_OPTIONS}
              value={rating}
              disabled={busy}
              onChange={(value) => setRating(Number(value))}
            />
          </label>
          <label className="ua-cfg-cr-edit__field">
            <span>Review</span>
            <textarea
              className="ua-cfg-cr-edit__text"
              rows={5}
              value={quote}
              disabled={busy}
              onChange={(event) => setQuote(event.target.value)}
            />
          </label>
        </div>
        <div className="ua-cfg-cr-edit__foot">
          <button type="button" className="ua-cfg-btn ua-cfg-btn--outline" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="ua-cfg-btn ua-cfg-btn--primary"
            disabled={busy}
            onClick={() => onSave(quote, rating)}
          >
            {busy ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReviewViewModal({ entry, onClose, onEdit }) {
  if (!entry) return null;
  return (
    <div className="ua-cp-modal-backdrop" onClick={onClose} role="presentation">
      <div className="ua-cfg-rc-view ua-cfg-cr-view" onClick={(event) => event.stopPropagation()} role="dialog" aria-labelledby="cr-view-title">
        <div className="ua-cfg-rc-view__head">
          <div>
            <p className="ua-cfg-rc-view__tag">Client review</p>
            <h3 id="cr-view-title">{asCopyString(entry.name) || "Untitled client"}</h3>
            <p>
              {formatRecipeDate(entry.createdAt)}
              <span className={`ua-cfg-tf-view__status${entry.live ? " is-live" : ""}`}>
                {entry.live ? "Live" : "Pending"}
              </span>
            </p>
          </div>
          <button type="button" className="ua-cfg-icon-btn" aria-label="Close" onClick={onClose}>×</button>
        </div>
        <div className="ua-cfg-cr-view__body">
          {entry.profileImage ? (
            <div className="ua-cfg-rc-view__media ua-cfg-rc-view__media--photo ua-cfg-cr-view__photo">
              <img src={entry.profileImage} alt="" />
            </div>
          ) : null}
          <Stars count={entry.rating} />
          {asCopyString(entry.quote) ? <p className="ua-cfg-rc-view__copy">{asCopyString(entry.quote)}</p> : null}
        </div>
        <div className="ua-cfg-rc-view__foot">
          <button type="button" className="ua-cfg-btn ua-cfg-btn--outline" onClick={onClose}>Close</button>
          <button
            type="button"
            className="ua-cfg-btn ua-cfg-btn--primary"
            onClick={() => {
              onEdit(entry);
              onClose();
            }}
          >
            Edit review
          </button>
        </div>
      </div>
    </div>
  );
}

export function DynamicClientReviewSection({
  queue,
  setQueue,
  published,
  setPublished,
  editor,
  setEditor,
  onToast,
}) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewingId, setViewingId] = useState(null);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: TESTIMONIAL_PAGE_SIZE, total: 0, pages: 1 });
  const [pendingDelete, setPendingDelete] = useState(null);

  const loadItems = useCallback(async (pageOverride) => {
    const nextPage = pageOverride ?? page;
    setLoading(true);
    try {
      const result = await adminListClientTestimonials(null, {
        page: nextPage,
        limit: TESTIMONIAL_PAGE_SIZE,
        search: query || undefined,
      });
      const next = result.items || [];
      setQueue(next.filter((row) => !row.live));
      setPublished(next.filter((row) => row.live));
      setPagination({
        page: Number(result.pagination?.page) || nextPage,
        limit: Number(result.pagination?.limit) || TESTIMONIAL_PAGE_SIZE,
        total: Number(result.pagination?.total) || next.length,
        pages: Number(result.pagination?.pages) || 1,
      });
      setViewingId((current) => (next.some((row) => row.id === current) ? current : null));
    } catch (error) {
      setQueue([]);
      setPublished([]);
      onToast(error?.message || "Could not load client reviews");
    } finally {
      setLoading(false);
    }
  }, [onToast, page, query, setPublished, setQueue]);

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(search.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [query]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  async function saveQuote(nextQuote, nextRating) {
    if (!editing) return;
    const text = String(nextQuote || "").trim();
    if (!text) {
      onToast("Review text is required");
      return;
    }
    setBusy(true);
    try {
      const saved = await adminUpdateClientTestimonial(null, editing.id, {
        quote: text,
        rating: nextRating,
      });
      setQueue((prev) => prev.map((row) => (row.id === saved.id ? saved : row)));
      setPublished((prev) => prev.map((row) => (row.id === saved.id ? saved : row)));
      setEditing(null);
      onToast("Review updated");
    } catch (error) {
      onToast(error?.message || "Could not update review");
    } finally {
      setBusy(false);
    }
  }

  async function approve(entry) {
    setBusy(true);
    try {
      const saved = await adminUpdateClientTestimonial(null, entry.id, { live: true });
      setQueue((prev) => prev.filter((row) => row.id !== entry.id));
      setPublished((prev) => [saved, ...prev.filter((row) => row.id !== saved.id)]);
      onToast(`${asCopyString(entry.name)} approved`);
    } catch (error) {
      onToast(error?.message || "Could not approve review");
    } finally {
      setBusy(false);
    }
  }

  async function hide(entry) {
    setBusy(true);
    try {
      const saved = await adminUpdateClientTestimonial(null, entry.id, { live: false });
      setPublished((prev) => prev.filter((row) => row.id !== entry.id));
      setQueue((prev) => [saved, ...prev.filter((row) => row.id !== saved.id)]);
      onToast(`${asCopyString(entry.name)} hidden`);
    } catch (error) {
      onToast(error?.message || "Could not hide review");
    } finally {
      setBusy(false);
    }
  }

  function patchPublished(id, patch) {
    setPublished((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  async function toggleSurface(item, field) {
    if (busy || (field !== "webVisible" && field !== "appVisible")) return;
    const next = !item[field];
    const prev = item[field];
    patchPublished(item.id, { [field]: next });
    try {
      const saved = await adminUpdateClientTestimonial(null, item.id, { [field]: next });
      patchPublished(item.id, saved);
    } catch (error) {
      patchPublished(item.id, { [field]: prev });
      onToast(error?.message || `Could not update ${field === "webVisible" ? "web" : "app"} visibility`);
    }
  }

  async function deleteItem() {
    if (!pendingDelete) return;
    const item = pendingDelete;
    setPendingDelete(null);
    setBusy(true);
    try {
      await adminDeleteClientTestimonial(null, item.id);
      onToast(`${asCopyString(item.name)} removed`);
      await loadItems();
    } catch (error) {
      onToast(error?.message || "Could not delete review");
    } finally {
      setBusy(false);
    }
  }

  async function moveItem(index, direction) {
    await moveConfigListItem({
      canReorder,
      busy,
      setBusy,
      items: published,
      setItems: setPublished,
      index,
      direction,
      listAll: async () => {
        const result = await adminListClientTestimonials(null, { page: 1, limit: 200, status: "active" });
        return result.items || [];
      },
      updateItem: (id, fields) => adminUpdateClientTestimonial(null, id, fields),
      reload: loadItems,
      onToast,
      blockedMessage: "Clear search to reorder reviews",
    });
  }

  const hasListFilter = Boolean(query);
  const canReorder = !hasListFilter;
  const liveCount = useMemo(() => published.length, [published]);
  const viewing = [...queue, ...published].find((row) => row.id === viewingId) || null;

  return (
    <div className="ua-cfg-cr">
      <SectionSurfacePanel
        sectionId="client-review"
        editor={editor}
        setEditor={setEditor}
        onToast={onToast}
      />
      <Panel
        title="Review queue"
        actions={(
          <p className="ua-cfg-cr-headmeta">
            Submitted by clients in the app ·{" "}
            <strong className="ua-cfg-cr-count">{loading ? "…" : queue.length}</strong>
            {" "}awaiting review
          </p>
        )}
      >
        <div className="ua-cfg-rc-toolbar">
          <input
            type="search"
            className="ua-cfg-dd-search"
            placeholder="Search by client name or review…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search client reviews"
          />
        </div>
        {queue.length ? (
          <div className={`ua-cfg-cr-queue${loading ? " is-loading" : ""}`}>
            {queue.map((entry) => (
              <article key={entry.id} className="ua-cfg-cr-row">
                <Avatar src={entry.profileImage} name={asCopyString(entry.name)} />
                <div className="ua-cfg-cr-row__copy">
                  <div className="ua-cfg-cr-row__meta">
                    <strong>{asCopyString(entry.name)}</strong>
                    <Stars count={entry.rating} />
                    <em className="ua-cfg-cr-pending">Pending</em>
                  </div>
                  {asCopyString(entry.quote) ? <p className="ua-cfg-cr-row__quote">{asCopyString(entry.quote)}</p> : null}
                </div>
                <div className="ua-cfg-cr-row__actions">
                  <button style={{    border: "1px solid rgb(230, 235, 242)",
    background: "rgb(255, 255, 255)",
    color:" rgb(94, 106, 210)"}}
                    type="button"
                    className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm"
                    disabled={busy}
                    onClick={() => { setViewingId(null); setEditing(entry); }}
                  >
                    Modify
                  </button>
                  <button style={{background: "rgb(231, 246, 238)",
    color: "rgb(43, 143, 91)",borderColor:"rgb(231, 246, 238)"}}
                    type="button"
                    className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm ua-cfg-cr-btn-approve"
                    disabled={busy}
                    onClick={() => approve(entry)}
                  >
                    Approve
                  </button>
                  <button style={{border: "1px solid rgb(246, 208, 209)",
    background: "rgb(255, 255, 255)",
    color: "rgb(192, 57, 43)"}}
                    type="button"
                    className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm ua-cfg-cr-btn-reject"
                    disabled={busy}
                    onClick={() => setPendingDelete(entry)}
                  >
                    Reject
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="ua-cfg-panel__sub">{loading ? "Fetching reviews…" : "No pending reviews."}</p>
        )}
      </Panel>

      <Panel
        title="Live on site"
        subtitle={`${pagination.total} total · ${liveCount} published · submitted in-app, admin only approves${canReorder ? " · use arrows to reorder" : ""}`}
      >
        {published.length ? (
          <div className={`ua-cfg-cr-live__list${loading ? " is-loading" : ""}`}>
            {published.map((entry, index) => (
              <article key={entry.id} className="ua-cfg-cr-row ua-cfg-cr-row--live">
                <Avatar src={entry.profileImage} name={asCopyString(entry.name)} />
                <div className="ua-cfg-cr-row__copy">
                  <div className="ua-cfg-cr-row__meta">
                    <strong>{asCopyString(entry.name)}</strong>
                    <Stars count={entry.rating} />
                  </div>
                  {asCopyString(entry.quote) ? <p className="ua-cfg-cr-row__quote">{asCopyString(entry.quote)}</p> : null}
                </div>
                <div className="ua-cfg-cr-row__actions">
                  <div className="ua-cfg-rp-item__surfaces">
                    <div className="ua-cfg-rp-item__live">
                      <span className={`ua-cfg-faq__shown${entry.webVisible ? " is-on" : ""}`}>WEB</span>
                      <button
                        type="button"
                        className={`ua-toggle ua-toggle--sm${entry.webVisible ? " ua-toggle--on" : ""}`}
                        aria-pressed={entry.webVisible}
                        aria-label={entry.webVisible ? "Hide on web" : "Show on web"}
                        disabled={busy}
                        onClick={() => toggleSurface(entry, "webVisible")}
                      >
                        <span className="ua-toggle__knob" />
                      </button>
                    </div>
                    <div className="ua-cfg-rp-item__live">
                      <span className={`ua-cfg-faq__shown${entry.appVisible ? " is-on" : ""}`}>APP</span>
                      <button
                        type="button"
                        className={`ua-toggle ua-toggle--sm${entry.appVisible ? " ua-toggle--on" : ""}`}
                        aria-pressed={entry.appVisible}
                        aria-label={entry.appVisible ? "Hide on app" : "Show on app"}
                        disabled={busy}
                        onClick={() => toggleSurface(entry, "appVisible")}
                      >
                        <span className="ua-toggle__knob" />
                      </button>
                    </div>
                    <div className="ua-cfg-rp-item__live">
                      <span className={`ua-cfg-faq__shown${entry.live ? " is-on" : ""}`}>
                        {entry.live ? "LIVE" : "HIDDEN"}
                      </span>
                      <button
                        type="button"
                        className={`ua-toggle ua-toggle--sm${entry.live ? " ua-toggle--on" : ""}`}
                        aria-pressed={entry.live}
                        disabled={busy}
                        onClick={() => hide(entry)}
                      >
                        <span className="ua-toggle__knob" />
                      </button>
                    </div>
                  </div>
                  <div className="ua-cfg-tf-item__moves">
                    <button
                      type="button"
                      className="ua-cfg-icon-btn"
                      disabled={busy || !canReorder || index === 0}
                      onClick={() => moveItem(index, -1)}
                      aria-label="Move up"
                      title={canReorder ? "Move up" : "Clear search to reorder"}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="ua-cfg-icon-btn"
                      disabled={busy || !canReorder || index === published.length - 1}
                      onClick={() => moveItem(index, 1)}
                      aria-label="Move down"
                      title={canReorder ? "Move down" : "Clear search to reorder"}
                    >
                      ↓
                    </button>
                  </div>
                  <div className="ua-cfg-cr-row__btns">
                    <button
                      type="button"
                      className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm"
                      disabled={busy}
                      onClick={() => setViewingId(entry.id)}
                    >
                      View
                    </button>
                    <button
                      type="button"
                      className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm"
                      disabled={busy}
                      onClick={() => { setViewingId(null); setEditing(entry); }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="ua-cfg-icon-btn"
                      aria-label={`Delete ${asCopyString(entry.name)}`}
                      disabled={busy}
                      onClick={() => setPendingDelete(entry)}
                    >
                      ×
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="ua-cfg-panel__sub">
            {loading ? "Fetching reviews…" : query ? "No reviews match your search." : "No live reviews yet."}
          </p>
        )}

        <ListPagination
          page={pagination.page}
          pages={pagination.pages}
          total={pagination.total}
          pageSize={TESTIMONIAL_PAGE_SIZE}
          onPageChange={setPage}
          label="Client review pagination"
        />
      </Panel>

      <ReviewViewModal
        entry={viewing}
        onClose={() => setViewingId(null)}
        onEdit={(entry) => setEditing(entry)}
      />

      <EditReviewModal
        review={editing}
        busy={busy}
        onClose={() => setEditing(null)}
        onSave={saveQuote}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        tag="Client review"
        title={`${pendingDelete?.live ? "Delete" : "Reject"} ${asCopyString(pendingDelete?.name) || "this review"}?`}
        body={pendingDelete?.live
          ? "This permanently removes the published client review."
          : "This rejects the in-app submission and deletes it."}
        confirmLabel={pendingDelete?.live ? "Delete" : "Reject"}
        confirmTone="danger"
        onCancel={() => setPendingDelete(null)}
        onConfirm={deleteItem}
      />
    </div>
  );
}
