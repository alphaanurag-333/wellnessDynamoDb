import { useCallback, useEffect, useMemo, useState } from "react";
import {
  adminDeleteClientTestimonial,
  adminListClientTestimonials,
  adminUpdateClientTestimonial,
} from "../api/clientTestimonialApi.js";
import { TESTIMONIAL_PAGE_SIZE } from "../data/testimonialDropdownData.js";
import { formatRecipeDate } from "../data/recipesConfigData.js";
import { ConfirmDialog } from "./ConfirmDialog.jsx";
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

function Stars({ count = 5 }) {
  return (
    <span className="ua-cfg-cr-stars" aria-label={`${count} stars`}>
      {"★★★★★".slice(0, Math.max(1, Math.min(5, count)))}
    </span>
  );
}

function EditReviewModal({ review, busy, onClose, onSave }) {
  const [quote, setQuote] = useState(review?.quote ?? "");
  const [rating, setRating] = useState(review?.rating ?? 5);

  useEffect(() => {
    setQuote(review?.quote ?? "");
    setRating(review?.rating ?? 5);
  }, [review]);

  if (!review) return null;

  return (
    <div className="ua-cp-modal-backdrop" onClick={onClose} role="presentation">
      <div className="ua-cfg-cr-edit" onClick={(event) => event.stopPropagation()} role="dialog" aria-labelledby="cr-edit-title">
        <div className="ua-cfg-cr-edit__head">
          <div>
            <h3 id="cr-edit-title" className="ua-cfg-cr-edit__title">
              <span aria-hidden="true">✎</span> Edit review
            </h3>
            <p className="ua-cfg-cr-edit__sub">{review.name}</p>
          </div>
          <button type="button" className="ua-cfg-mv-upload-modal__close" aria-label="Close" onClick={onClose}>×</button>
        </div>
        <label className="ua-cfg-panel__sub" htmlFor="cr-edit-rating">Rating</label>
        <select
          id="cr-edit-rating"
          className="ua-cfg-rc-cat"
          value={rating}
          disabled={busy}
          onChange={(event) => setRating(Number(event.target.value))}
        >
          {[5, 4, 3, 2, 1].map((value) => (
            <option key={value} value={value}>{value} star{value === 1 ? "" : "s"}</option>
          ))}
        </select>
        <textarea
          className="ua-cfg-cr-edit__text"
          rows={5}
          value={quote}
          disabled={busy}
          onChange={(event) => setQuote(event.target.value)}
        />
        <div className="ua-cfg-cr-edit__foot">
          <button type="button" className="ua-cfg-btn ua-cfg-btn--outline" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="ua-cfg-btn ua-cfg-btn--primary"
            disabled={busy}
            onClick={() => onSave(quote, rating)}
          >
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}

function ReviewViewModal({ entry, onClose, onEdit }) {
  if (!entry) return null;
  return (
    <div className="ua-cp-modal-backdrop ua-cp-modal-backdrop--drawer" onClick={onClose} role="presentation">
      <div className="ua-cfg-rc-view" onClick={(event) => event.stopPropagation()} role="dialog" aria-labelledby="cr-view-title">
        <div className="ua-cfg-rc-view__head">
          <div>
            <p className="ua-cfg-rc-view__tag">Client review</p>
            <h3 id="cr-view-title">{entry.name || "Untitled client"}</h3>
            <p>{entry.live ? "Live" : "Pending"} · {formatRecipeDate(entry.createdAt)}</p>
          </div>
          <button type="button" className="ua-cfg-mv-upload-modal__close" aria-label="Close" onClick={onClose}>×</button>
        </div>
        {entry.profileImage ? (
          <div className="ua-cfg-rc-view__media ua-cfg-rc-view__media--photo">
            <img src={entry.profileImage} alt="" />
          </div>
        ) : null}
        <p className="ua-cfg-cr-stars" aria-label={`${entry.rating} stars`}>{"★★★★★".slice(0, Math.max(1, Math.min(5, entry.rating || 5)))}</p>
        {entry.quote ? <p className="ua-cfg-rc-view__copy">{entry.quote}</p> : null}
        <dl className="ua-cfg-rc-view__meta">
          <div>
            <dt>Status</dt>
            <dd>{entry.live ? "Live" : "Pending"}</dd>
          </div>
          <div>
            <dt>Rating</dt>
            <dd>{entry.rating} / 5</dd>
          </div>
          <div>
            <dt>Created</dt>
            <dd>{formatRecipeDate(entry.createdAt)}</dd>
          </div>
          <div>
            <dt>Updated</dt>
            <dd>{formatRecipeDate(entry.updatedAt)}</dd>
          </div>
        </dl>
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

export function DynamicClientReviewSection({ queue, setQueue, published, setPublished, onToast }) {
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
      onToast(`${entry.name} approved`);
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
      onToast(`${entry.name} hidden`);
    } catch (error) {
      onToast(error?.message || "Could not hide review");
    } finally {
      setBusy(false);
    }
  }

  async function deleteItem() {
    if (!pendingDelete) return;
    const item = pendingDelete;
    setPendingDelete(null);
    setBusy(true);
    try {
      await adminDeleteClientTestimonial(null, item.id);
      onToast(`${item.name} removed`);
      await loadItems();
    } catch (error) {
      onToast(error?.message || "Could not delete review");
    } finally {
      setBusy(false);
    }
  }

  const liveCount = useMemo(() => published.length, [published]);
  const viewing = [...queue, ...published].find((row) => row.id === viewingId) || null;

  return (
    <div className="ua-cfg-cr">
      <Panel
        title="Pending reviews"
        subtitle={loading ? "Loading reviews…" : `${queue.length} waiting for approval on this page`}
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
          <div className={`ua-cfg-rc-list${loading ? " is-loading" : ""}`}>
            {queue.map((entry) => (
              <article key={entry.id} className="ua-cfg-rc-item is-text">
                {entry.profileImage ? (
                  <div className="ua-cfg-rc-cover-wrap">
                    <div className="ua-cfg-rc-cover is-on">
                      <img className="ua-cfg-rc-cover__img" src={entry.profileImage} alt="" />
                    </div>
                  </div>
                ) : null}
                <div className="ua-cfg-rc-item__body">
                  <div className="ua-cfg-rc-item__row">
                    <strong>{entry.name}</strong>
                    <Stars count={entry.rating} />
                    <span className="ua-cfg-faq__shown">PENDING</span>
                    <button type="button" className="ua-cfg-btn ua-cfg-btn--primary ua-cfg-btn--sm" disabled={busy} onClick={() => approve(entry)}>Approve</button>
                    <button type="button" className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm" disabled={busy} onClick={() => setViewingId(entry.id)}>View</button>
                    <button type="button" className="ua-cfg-cr-link ua-cfg-cr-link--modify" disabled={busy} onClick={() => { setViewingId(null); setEditing(entry); }}>Edit</button>
                    <button type="button" className="ua-cfg-icon-btn" aria-label={`Reject ${entry.name}`} disabled={busy} onClick={() => setPendingDelete(entry)}>×</button>
                  </div>
                  <p>{entry.quote}</p>
                  <p className="ua-cfg-panel__sub">{formatRecipeDate(entry.createdAt)}</p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="ua-cfg-panel__sub">{loading ? "Fetching reviews…" : "No pending reviews."}</p>
        )}
      </Panel>

      <Panel
        title="Published reviews"
        subtitle={`${pagination.total} total · ${liveCount} live on this page · submitted in-app, admin only approves`}
      >
        {published.length ? (
          <div className={`ua-cfg-rc-list${loading ? " is-loading" : ""}`}>
            {published.map((entry) => (
              <article key={entry.id} className="ua-cfg-rc-item is-text">
                {entry.profileImage ? (
                  <div className="ua-cfg-rc-cover-wrap">
                    <div className="ua-cfg-rc-cover is-on">
                      <img className="ua-cfg-rc-cover__img" src={entry.profileImage} alt="" />
                    </div>
                  </div>
                ) : null}
                <div className="ua-cfg-rc-item__body">
                  <div className="ua-cfg-rc-item__row">
                    <strong>{entry.name}</strong>
                    <Stars count={entry.rating} />
                    <span className="ua-cfg-faq__shown is-on">LIVE</span>
                    <button type="button" className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm" disabled={busy} onClick={() => hide(entry)}>Hide</button>
                    <button type="button" className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm" disabled={busy} onClick={() => setViewingId(entry.id)}>View</button>
                    <button type="button" className="ua-cfg-cr-link ua-cfg-cr-link--modify" disabled={busy} onClick={() => { setViewingId(null); setEditing(entry); }}>Edit</button>
                    <button type="button" className="ua-cfg-icon-btn" aria-label={`Delete ${entry.name}`} disabled={busy} onClick={() => setPendingDelete(entry)}>×</button>
                  </div>
                  <p>{entry.quote}</p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="ua-cfg-panel__sub">{loading ? "Fetching reviews…" : query ? "No reviews match your search." : "No live reviews yet."}</p>
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
        title={`${pendingDelete?.live ? "Delete" : "Reject"} ${pendingDelete?.name || "this review"}?`}
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
