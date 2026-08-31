import { useCallback, useEffect, useMemo, useState } from "react";
import {
  adminDeleteMediaAsset,
  adminGetMediaAsset,
  adminListMediaAssets,
  adminRestoreMediaAssetVersion,
  adminUpdateMediaAsset,
  downloadMediaAsset,
} from "../api/mediaAssetApi.js";
import { GALLERY_PAGE_SIZE, galleryCategoryClass, galleryVersionLabel } from "../data/galleryData.js";
import { ConfirmDialog } from "./ConfirmDialog.jsx";
import { MediaTypeIcon } from "./GalleryMediaIcons.jsx";
import { MediaPickerModal } from "./MediaPickerModal.jsx";
import { ListPagination } from "./shared.jsx";

const EMPTY_PAGINATION = {
  page: 1,
  limit: GALLERY_PAGE_SIZE,
  total: 0,
  pages: 1,
};

function requestType(activeTab, typeFilter) {
  if (activeTab === "image" || activeTab === "video" || activeTab === "audio") return activeTab;
  return typeFilter === "all" ? undefined : typeFilter;
}

function requestStatus(activeTab) {
  return activeTab === "live" ? "active" : undefined;
}

function Panel({ title, subtitle, actions, children, className = "" }) {
  const hasHead = Boolean(title || subtitle || actions);
  return (
    <section className={`ua-cfg-panel${className ? ` ${className}` : ""}`}>
      {hasHead ? (
        <div className="ua-cfg-panel__head">
          <div>
            {title ? <h3 className="ua-cfg-panel__title">{title}</h3> : null}
            {subtitle ? <p className="ua-cfg-panel__sub">{subtitle}</p> : null}
          </div>
          {actions ? <div className="ua-cfg-panel__actions">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

function buildHistoryRows(entry) {
  if (!entry) return [];
  const rows = [
    {
      badge: "CURRENT",
      current: true,
      title: entry.live ? "Live version" : "Current version",
      author: entry.owner,
      date: entry.date,
      size: entry.size || "—",
      url: entry.url,
      n: entry.versions,
    },
  ];
  const history = Array.isArray(entry.history) ? entry.history : [];
  for (const item of history) {
    rows.push({
      badge: `V${item.n}`,
      current: false,
      title: `Version ${item.n}`,
      author: item.owner,
      date: item.date || "—",
      size: item.size || "—",
      url: item.url,
      n: item.n,
    });
  }
  return rows;
}

function HistoryModal({ entry, busy, onClose, onDownload, onRestore }) {
  if (!entry) return null;
  const kind = entry.category || entry.type || "Media";

  return (
    <div className="ua-cp-modal-backdrop" onClick={onClose} role="presentation">
      <div className="ua-cfg-rc-history" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
        <div className="ua-cfg-rc-history__head">
          <div>
            <h3>{entry.title}</h3>
            <p>
              {kind} · owned by {entry.owner} · newest first
            </p>
          </div>
          <button type="button" className="ua-cfg-mv-upload-modal__close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
        {buildHistoryRows(entry).map((row) => (
          <div key={`${row.badge}-${row.n}`} className={`ua-cfg-rc-history__row${row.current ? " is-current" : ""}`}>
            <span className={row.current ? "is-current" : "is-old"}>{row.badge}</span>
            <div>
              <strong>{row.title}</strong>
              <p>
                Uploaded by {row.author} · {row.date} · {row.size}
              </p>
            </div>
            <div className="ua-cfg-rc-history__actions">
              <button
                type="button"
                className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm"
                disabled={!row.url || busy}
                onClick={() => onDownload?.(row)}
              >
                Download
              </button>
              {row.current ? null : (
                <button
                  type="button"
                  className="ua-cfg-btn ua-cfg-btn--ghost ua-cfg-btn--sm"
                  disabled={busy}
                  onClick={() => onRestore?.(row)}
                >
                  Restore
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MediaThumb({ entry }) {
  const type = entry.type === "audio" || entry.type === "video" ? entry.type : "image";
  const badgeLabel =
    type === "audio" || type === "video"
      ? type === "audio"
        ? "Audio"
        : "Video"
      : entry.category || "Image";
  const placeholderLabel =
    type === "image"
      ? `${entry.category || "Image"} image`
      : type === "audio"
        ? "AUDIO"
        : "VIDEO";
  const videoSrc = entry.url
    ? entry.url.includes("#")
      ? entry.url
      : `${entry.url}#t=0.1`
    : "";

  return (
    <>
      <span className={`ua-cfg-gl-card__badge is-${galleryCategoryClass(entry.category || type)}`}>
        {badgeLabel}
      </span>

      {type === "image" && entry.url ? (
        <img className="ua-cfg-gl-card__preview" src={entry.url} alt="" />
      ) : type === "video" && videoSrc ? (
        <video
          className="ua-cfg-gl-card__preview ua-cfg-gl-card__preview--video"
          src={videoSrc}
          muted
          playsInline
          preload="metadata"
        />
      ) : (
        <span className={`ua-cfg-gl-card__icon-tile is-${type}`} aria-hidden="true">
          <MediaTypeIcon type={type} />
        </span>
      )}

      <span className="ua-cfg-gl-card__placeholder">
        {placeholderLabel}
        {entry.duration ? ` · ${entry.duration}` : ""}
      </span>
    </>
  );
}

export function GallerySection({ media, setMedia, onToast, onLiveChange }) {
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [owner, setOwner] = useState("All owners");
  const [typeFilter, setTypeFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selected, setSelected] = useState([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [historyEntry, setHistoryEntry] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [historyBusy, setHistoryBusy] = useState(false);
  const [downloadingId, setDownloadingId] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(EMPTY_PAGINATION);
  const [knownOwners, setKnownOwners] = useState(() => new Set(["Admin"]));
  const [videoPreviews, setVideoPreviews] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);

  const owners = useMemo(
    () => ["All owners", ...Array.from(knownOwners).sort((a, b) => a.localeCompare(b))],
    [knownOwners],
  );

  const loadPreviews = useCallback(async () => {
    try {
      const [videos, images] = await Promise.all([
        adminListMediaAssets(null, { page: 1, limit: 8, type: "video" }),
        adminListMediaAssets(null, { page: 1, limit: 8, type: "image" }),
      ]);
      setVideoPreviews(videos.items || []);
      setImagePreviews(images.items || []);
    } catch {
      /* keep last previews */
    }
  }, []);

  const loadMedia = useCallback(async (pageOverride) => {
    const nextPage = pageOverride ?? page;
    setLoading(true);
    try {
      const result = await adminListMediaAssets(null, {
        page: nextPage,
        limit: GALLERY_PAGE_SIZE,
        search: query || undefined,
        owner: owner === "All owners" ? undefined : owner,
        type: requestType(activeTab, typeFilter),
        status: requestStatus(activeTab),
        from: fromDate || undefined,
        to: toDate || undefined,
      });
      const items = result.items || [];
      setMedia(items);
      setPagination({
        page: Number(result.pagination?.page) || nextPage,
        limit: Number(result.pagination?.limit) || GALLERY_PAGE_SIZE,
        total: Number(result.pagination?.total) || items.length,
        pages: Number(result.pagination?.pages) || 1,
      });
      setKnownOwners((prev) => {
        const next = new Set(prev);
        for (const item of items) {
          if (item.owner) next.add(item.owner);
        }
        return next;
      });
      onLiveChange?.(items.some((entry) => entry.live));
    } catch (err) {
      setMedia([]);
      setPagination(EMPTY_PAGINATION);
      onToast?.(err?.message || "Failed to load gallery");
    } finally {
      setLoading(false);
    }
  }, [page, query, owner, typeFilter, fromDate, toDate, activeTab, setMedia, onToast, onLiveChange]);

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(search.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [query, owner, typeFilter, fromDate, toDate, activeTab]);

  useEffect(() => {
    loadMedia();
  }, [loadMedia]);

  useEffect(() => {
    loadPreviews();
  }, [loadPreviews]);

  useEffect(() => {
    if (!loading && page > pagination.pages) setPage(pagination.pages);
  }, [loading, page, pagination.pages]);

  useEffect(() => {
    setSelected([]);
  }, [activeTab, query, owner, typeFilter, fromDate, toDate]);

  const tabs = useMemo(
    () => [
      { id: "all", label: "All assets" },
      { id: "image", label: "Images" },
      { id: "video", label: "Videos" },
      { id: "audio", label: "Audio" },
      { id: "live", label: "Live" },
    ],
    [],
  );

  async function openHistory(entry) {
    setHistoryBusy(true);
    try {
      const full = await adminGetMediaAsset(null, entry.id);
      setHistoryEntry(full || entry);
    } catch (err) {
      setHistoryEntry(entry);
      onToast?.(err?.message || "Could not load history");
    } finally {
      setHistoryBusy(false);
    }
  }

  async function downloadAsset(asset, filename) {
    if (!asset?.url) {
      onToast?.("No file available to download");
      return;
    }
    const key = asset.id || asset.url;
    setDownloadingId(key);
    try {
      await downloadMediaAsset(asset, filename || asset.title);
      onToast?.("Download started");
    } catch (err) {
      onToast?.(err?.message || "Failed to download file");
    } finally {
      setDownloadingId("");
    }
  }

  function downloadHistoryRow(row) {
    downloadAsset(
      {
        id: `${historyEntry?.id || "history"}-${row.n}`,
        url: row.url,
        title: `${historyEntry?.title || "media"}-v${row.n}`,
        type: historyEntry?.type,
      },
      `${historyEntry?.title || "media"}-v${row.n}`
    );
  }

  async function restoreHistoryRow(row) {
    if (!historyEntry?.id || !row?.n) return;
    setHistoryBusy(true);
    try {
      const updated = await adminRestoreMediaAssetVersion(null, historyEntry.id, row.n);
      setMedia((prev) => {
        const next = prev.map((item) => (item.id === updated.id ? updated : item));
        onLiveChange?.(next.some((item) => item.live));
        return next;
      });
      setHistoryEntry(updated);
      onToast?.(`Restored version ${row.n}`);
    } catch (err) {
      onToast?.(err?.message || "Failed to restore version");
    } finally {
      setHistoryBusy(false);
    }
  }

  function toggleSelect(id) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((entry) => entry !== id) : [...prev, id]));
  }

  async function toggleLive(id) {
    const entry = media.find((item) => item.id === id);
    if (!entry) return;
    setBusyId(id);
    try {
      const updated = await adminUpdateMediaAsset(null, id, { live: !entry.live });
      if (activeTab === "live") {
        await loadMedia();
      } else {
        const next = media.map((item) => (item.id === id ? updated : item));
        setMedia(next);
        onLiveChange?.(next.some((item) => item.live));
      }
      onToast?.(updated.live ? "Asset marked live" : "Asset unmarked");
    } catch (err) {
      onToast?.(err?.message || "Failed to update live status");
    } finally {
      setBusyId("");
    }
  }

  function assetKindLabel(entry) {
    if (entry?.type === "video") return "video";
    if (entry?.type === "audio") return "audio";
    return "image";
  }

  function requestDeleteItem(entry) {
    if (!entry || entry.live) {
      onToast?.("Unmark live assets before delete");
      return;
    }
    setPendingDelete({ ids: [entry.id], title: entry.title, kind: assetKindLabel(entry) });
  }

  function requestDeleteSelected() {
    const ids = selected.filter((id) => {
      const entry = media.find((item) => item.id === id);
      return entry && !entry.live;
    });
    if (!ids.length) {
      onToast?.("Unmark live assets before delete");
      return;
    }
    setPendingDelete({ ids, title: null, kind: "asset" });
  }

  async function confirmDelete() {
    if (!pendingDelete?.ids?.length) return;
    const ids = pendingDelete.ids;
    const single = ids.length === 1;
    setPendingDelete(null);
    if (single) setBusyId(ids[0]);
    try {
      for (const id of ids) {
        await adminDeleteMediaAsset(null, id);
      }
      const remaining = Math.max(0, pagination.total - ids.length);
      const lastPage = Math.max(1, Math.ceil(remaining / GALLERY_PAGE_SIZE));
      const nextPage = Math.min(page, lastPage);
      setPage(nextPage);
      setSelected([]);
      onToast?.(single ? "Asset deleted" : "Deleted selected items");
      await loadMedia(nextPage);
      await loadPreviews();
    } catch (err) {
      onToast?.(err?.message || (single ? "Failed to delete asset" : "Failed to delete some assets"));
      await loadMedia();
      await loadPreviews();
    } finally {
      setBusyId("");
    }
  }

  return (
    <>
      <Panel
        className="ua-cfg-gl"
        title="Gallery"
        subtitle="Assets uploaded for this section — filter by owner or date, reuse, download or delete. Live assets must be unmarked first."
        actions={
          <button
            type="button"
            className="ua-cfg-btn ua-cfg-btn--primary ua-cfg-btn--sm"
            onClick={() => setPickerOpen(true)}
          >
            + Upload media
          </button>
        }
      >
        <div className="ua-cfg-gl-tabs" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`ua-cfg-gl-tabs__tab${activeTab === tab.id ? " is-active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
              {tab.id === activeTab ? ` · ${pagination.total.toLocaleString("en-IN")}` : ""}
            </button>
          ))}
        </div>

        {(activeTab === "all" || activeTab === "video") && (
          <div className="ua-cfg-gl-section">
            <h4 className="ua-cfg-gl-section__title">Videos</h4>
            <p className="ua-cfg-gl-section__sub">Recent video assets in the media library.</p>
            <div className="ua-cfg-gl-videos">
              {videoPreviews.length ? (
                videoPreviews.map((entry) => (
                  <article key={entry.id} className="ua-cfg-gl-video">
                    <div className="ua-cfg-gl-video__thumb" aria-hidden="true">
                      {entry.url ? (
                        <video
                          className="ua-cfg-gl-video__preview"
                          src={entry.url.includes("#") ? entry.url : `${entry.url}#t=0.1`}
                          muted
                          playsInline
                          preload="metadata"
                        />
                      ) : (
                        <span className="ua-cfg-gl-card__icon-tile is-video">
                          <MediaTypeIcon type="video" />
                        </span>
                      )}
                    </div>
                    <strong>{entry.title}</strong>
                    <div className="ua-cfg-gl-video__meta">
                      <span className="ua-cfg-gl-video__tag">{entry.type.toUpperCase()}</span>
                      <span>{entry.duration || entry.date || "—"}</span>
                    </div>
                  </article>
                ))
              ) : (
                <p className="ua-cfg-gl-section__empty">No videos yet.</p>
              )}
            </div>
          </div>
        )}

        {(activeTab === "all" || activeTab === "image") && (
          <div className="ua-cfg-gl-section">
            <h4 className="ua-cfg-gl-section__title">Images</h4>
            <p className="ua-cfg-gl-section__sub">Recent image assets in the media library.</p>
            <div className="ua-cfg-gl-images">
              {imagePreviews.length ? (
                imagePreviews.map((entry) => (
                  <article key={entry.id} className="ua-cfg-gl-image" title={entry.title}>
                    <div className="ua-cfg-gl-image__thumb">
                      {entry.url ? (
                        <img src={entry.url} alt="" />
                      ) : (
                        <span className="ua-cfg-gl-card__icon-tile is-image" aria-hidden="true">
                          <MediaTypeIcon type="image" />
                        </span>
                      )}
                    </div>
                    <strong>{entry.title}</strong>
                    <span>{entry.category || entry.date || "Image"}</span>
                  </article>
                ))
              ) : (
                <p className="ua-cfg-gl-section__empty">No images yet.</p>
              )}
            </div>
          </div>
        )}

        <div className="ua-cfg-gl-section ua-cfg-gl-section--library">
          <h4 className="ua-cfg-gl-section__title">Media library</h4>
          <p className="ua-cfg-gl-section__sub">
            Search and filter every asset. Select items to delete, or toggle live status.
          </p>

          <div className="ua-cfg-mv-gallery__filters">
            <input
              type="search"
              className="ua-cfg-mv-gallery__search"
              placeholder="Search media by name"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <select
              className="ua-cfg-mv-gallery__select"
              value={owner}
              onChange={(event) => setOwner(event.target.value)}
            >
              {owners.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </select>
            <select
              className="ua-cfg-mv-gallery__select"
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
            >
              <option value="all">All types</option>
              <option value="image">Images</option>
              <option value="video">Videos</option>
              <option value="audio">Audio</option>
            </select>
            <input
              type="date"
              className="ua-cfg-mv-gallery__date"
              aria-label="From date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
            />
            <input
              type="date"
              className="ua-cfg-mv-gallery__date"
              aria-label="To date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
            />
          </div>

          <div className="ua-cfg-mv-gallery__bar">
            <span>
              {loading
                ? "Loading…"
                : pagination.total
                  ? `${pagination.total.toLocaleString("en-IN")} total`
                  : "No items"}
            </span>
            {selected.length ? (
              <div className="ua-cfg-mv-gallery__selection">
                <span>{selected.length} selected</span>
                <button
                  type="button"
                  className="ua-cfg-btn ua-cfg-btn--ghost ua-cfg-btn--sm"
                  onClick={requestDeleteSelected}
                >
                  Delete
                </button>
                <button
                  type="button"
                  className="ua-cfg-icon-btn"
                  aria-label="Clear selection"
                  onClick={() => setSelected([])}
                >
                  ×
                </button>
              </div>
            ) : null}
          </div>

          <div className={`ua-cfg-mv-gallery__grid${loading ? " is-loading" : ""}`}>
            {media.map((entry) => {
              const isSelected = selected.includes(entry.id);
              return (
                <article key={entry.id} className={`ua-cfg-gl-card${isSelected ? " is-selected" : ""}`}>
                  <div className={`ua-cfg-gl-card__thumb is-${entry.type}`}>
                    <label className="ua-cfg-gl-card__check">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(entry.id)}
                      />
                    </label>
                    <MediaThumb entry={entry} />
                  </div>
                  <div className="ua-cfg-gl-card__body">
                    <strong>{entry.title}</strong>
                    <span>
                      {entry.owner} · {entry.date}
                    </span>
                    <span>
                      {entry.size || "—"} · {galleryVersionLabel(entry.versions)}
                    </span>
                  </div>
                  <div className={`ua-cfg-gl-card__live${entry.live ? " is-live" : ""}`}>
                    <span className={`ua-cfg-gl-card__status${entry.live ? " is-live" : ""}`}>
                      {entry.live ? "Live" : "Not live"}
                    </span>
                    <button
                      type="button"
                      className={`ua-toggle ua-toggle--sm${entry.live ? " ua-toggle--on" : ""}`}
                      aria-pressed={entry.live}
                      disabled={busyId === entry.id}
                      onClick={() => toggleLive(entry.id)}
                    >
                      <span className="ua-toggle__knob" />
                    </button>
                  </div>
                  <div className="ua-cfg-gl-card__actions">
                    <button
                      type="button"
                      className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm"
                      disabled={historyBusy && historyEntry?.id === entry.id}
                      onClick={() => openHistory(entry)}
                    >
                      History
                    </button>
                    <button
                      type="button"
                      className="ua-cfg-icon-btn ua-cfg-gl-card__download"
                      aria-label="Download"
                      disabled={!entry.url || downloadingId === entry.id}
                      onClick={() => downloadAsset(entry)}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="ua-cfg-icon-btn ua-cfg-gl-card__delete"
                      aria-label="Delete"
                      disabled={entry.live || busyId === entry.id}
                      onClick={() => requestDeleteItem(entry)}
                    >
                      🗑
                    </button>
                  </div>
                </article>
              );
            })}
            {!loading && !media.length ? (
              <p className="ua-cfg-gl-section__empty">
                {query || owner !== "All owners" || typeFilter !== "all" || fromDate || toDate || activeTab !== "all"
                  ? "No media assets match your filters."
                  : "No media assets yet. Upload to get started."}
              </p>
            ) : null}
          </div>

          <ListPagination
            page={pagination.page}
            pages={pagination.pages}
            total={pagination.total}
            pageSize={GALLERY_PAGE_SIZE}
            onPageChange={(nextPage) => {
              setSelected([]);
              setPage(nextPage);
            }}
            label="Gallery pagination"
          />
        </div>
      </Panel>

      <HistoryModal
        entry={historyEntry}
        busy={historyBusy || Boolean(downloadingId)}
        onClose={() => setHistoryEntry(null)}
        onDownload={downloadHistoryRow}
        onRestore={restoreHistoryRow}
      />

      <MediaPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        accept="mixed"
        multiple
        title="Upload or choose media"
        onConfirm={(assets) => {
          const ids = assets.map((asset) => asset.id);
          setSelected(ids);
          setPage(1);
          onToast?.(`${assets.length} asset${assets.length === 1 ? "" : "s"} ready`);
          loadMedia(1);
          loadPreviews();
        }}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        tag="Gallery"
        title={
          pendingDelete?.ids?.length === 1
            ? `Delete ${pendingDelete.title ? `“${pendingDelete.title}”` : `this ${pendingDelete.kind}`}?`
            : `Delete ${pendingDelete?.ids?.length || 0} selected items?`
        }
        body={
          pendingDelete?.ids?.length === 1
            ? `This permanently removes the ${pendingDelete.kind} from the gallery.`
            : "This permanently removes the selected items from the gallery."
        }
        confirmLabel="Delete"
        confirmTone="danger"
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}
