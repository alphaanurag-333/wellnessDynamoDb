import { useCallback, useEffect, useRef, useState } from "react";
import {
  adminCreateWellnessLibraryItem,
  adminDeleteWellnessLibraryItem,
  adminListWellnessLibrary,
  adminPreviewYoutubeDuration,
  adminUpdateWellnessLibraryItem,
} from "../api/wellnessLibraryApi.js";
import { formatRecipeDate, youtubeEmbedUrl } from "../data/recipesConfigData.js";
import {
  WELLNESS_LIBRARY_KINDS,
  WELLNESS_LIBRARY_PAGE_SIZE,
  WELLNESS_LIBRARY_TYPES,
  WELLNESS_VIDEO_ACCEPT,
  WELLNESS_VIDEO_MAX_MB,
  displayTypeLabel,
  emptyWellnessDraft,
  isBareNumber,
  isValidDuration,
  isValidYoutubeUrl,
  readVideoFileDuration,
  resolveLibraryType,
  sanitizeTimeInput,
} from "../data/wellnessLibraryData.js";
import { CfgSelect, ListPagination } from "./shared.jsx";
import { ConfirmDialog } from "./ConfirmDialog.jsx";

const IMAGE_ACCEPT = "image/jpeg,image/png,image/gif,image/webp,image/jpg";
const TIME_HINT = "Enter time as 5:12 (minutes:seconds), not a number";
const SEARCH_DEBOUNCE_MS = 400;
const TYPE_FILTERS = [
  { value: "", label: "All types" },
  { value: "ytlink", label: "YouTube" },
  { value: "video", label: "Uploaded video" },
];

function snapshotItem(item) {
  return {
    title: String(item?.title || "").trim(),
    type: resolveLibraryType(item?.type),
    ytLink: String(item?.ytLink || "").trim(),
    duration: String(item?.duration || "").trim(),
    status: item?.status === "inactive" ? "inactive" : "active",
    hasFile: Boolean(item?.hasFile),
  };
}

function sameSnapshot(a, b) {
  return (
    a.title === b.title &&
    a.type === b.type &&
    a.ytLink === b.ytLink &&
    a.duration === b.duration &&
    a.status === b.status
  );
}

function revokeBlobUrl(url) {
  if (url && String(url).startsWith("blob:")) URL.revokeObjectURL(url);
}

function LibraryViewModal({ entry, viewTag, itemNoun, onClose, onEdit }) {
  if (!entry) return null;
  const isVideo = resolveLibraryType(entry.type) === "video";
  const embed = !isVideo ? youtubeEmbedUrl(entry.ytLink) : "";
  const videoSrc = isVideo ? entry.fileUrl : "";
  return (
    <div className="ua-cp-modal-backdrop" onClick={onClose} role="presentation">
      <div className="ua-cfg-rc-view ua-cfg-rc-view--sheet ua-cfg-lib-view" onClick={(event) => event.stopPropagation()} role="dialog" aria-labelledby="library-view-title">
        <div className="ua-cfg-rc-view__head">
          <div>
            <p className="ua-cfg-rc-view__tag">{viewTag}</p>
            <h3 id="library-view-title">{entry.title || `Untitled ${itemNoun}`}</h3>
            <p>{displayTypeLabel(entry.type)}{entry.duration ? ` · ${entry.duration}` : ""} · {entry.live ? "Live" : "Hidden"}</p>
          </div>
          <button type="button" className="ua-cfg-icon-btn" aria-label="Close" onClick={onClose}>×</button>
        </div>
        <div className="ua-cfg-rc-view__body">
          <div className="ua-cfg-rc-view__media">
            {entry.thumbnail ? <img src={entry.thumbnail} alt="" /> : <div className="ua-cfg-rc-view__media-empty">No cover</div>}
          </div>
          <dl className="ua-cfg-rc-view__meta">
            <div>
              <dt>Type</dt>
              <dd>{isVideo ? "Uploaded video" : "YouTube link"}</dd>
            </div>
            <div>
              <dt>{isVideo ? "Video" : "YouTube"}</dt>
              <dd>
                {isVideo && videoSrc ? (
                  <a href={videoSrc} target="_blank" rel="noreferrer">{videoSrc}</a>
                ) : entry.ytLink ? (
                  <a href={entry.ytLink} target="_blank" rel="noreferrer">{entry.ytLink}</a>
                ) : "—"}
              </dd>
            </div>
            <div>
              <dt>Time</dt>
              <dd>{entry.duration || "—"}</dd>
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
          {embed ? (
            <div className="ua-cfg-rc-view__embed">
              <iframe
                title={entry.title || `${itemNoun} video`}
                src={embed}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : videoSrc ? (
            <video className="ua-cfg-rc-view__player" src={videoSrc} controls preload="metadata" />
          ) : null}
        </div>
        <div className="ua-cfg-rc-view__foot">
          <button type="button" className="ua-cfg-btn ua-cfg-btn--outline" onClick={onClose}>Close</button>
          <button
            type="button"
            className="ua-cfg-btn ua-cfg-btn--primary"
            onClick={() => {
              onEdit(entry.id);
              onClose();
            }}
          >
            Edit {itemNoun}
          </button>
        </div>
      </div>
    </div>
  );
}

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

function CoverDrop({ previewUrl, disabled, label = "Cover photo", onPick, onRemove }) {
  const inputRef = useRef(null);
  const filled = Boolean(previewUrl);

  return (
    <div className={`ua-cfg-tf-drop ua-cfg-tf-drop--before ua-cfg-rc-dropbox${filled ? " is-on" : ""}`}>
      {filled ? <img className="ua-cfg-tf-drop__img" src={previewUrl} alt="" /> : null}
      <span className="ua-cfg-tf-drop__icon" aria-hidden="true">🖼</span>
      <p className="ua-cfg-tf-drop__label">{label}</p>
      <button
        type="button"
        className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm ua-cfg-tf-drop__btn"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        {filled ? "Replace photo" : "Upload photo"}
      </button>
      {filled && onRemove ? (
        <button type="button" className="ua-cfg-rc-media-x" aria-label="Remove cover" disabled={disabled} onClick={onRemove}>×</button>
      ) : null}
      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        hidden
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0] || null;
          event.target.value = "";
          if (file) onPick(file);
        }}
      />
    </div>
  );
}

function VideoDrop({ previewUrl, embedUrl, fileName, disabled, onPick, onRemove }) {
  const inputRef = useRef(null);
  const filled = Boolean(previewUrl || embedUrl || fileName);

  return (
    <div className={`ua-cfg-tf-drop ua-cfg-tf-drop--after ua-cfg-rc-dropbox${filled ? " is-on" : ""}`}>
      {previewUrl ? (
        <video className="ua-cfg-tf-drop__img ua-cfg-rc-video-preview" src={previewUrl} controls preload="metadata" />
      ) : embedUrl ? (
        <iframe
          className="ua-cfg-tf-drop__img ua-cfg-rc-video-preview"
          title="YouTube preview"
          src={embedUrl}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : null}
      <span className="ua-cfg-tf-drop__icon" aria-hidden="true">▶</span>
      <p className="ua-cfg-tf-drop__label">{fileName || "Video file"}</p>
      <button
        type="button"
        className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm ua-cfg-tf-drop__btn"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        {previewUrl || fileName ? "Replace video" : "Upload video"}
      </button>
      {filled && onRemove ? (
        <button type="button" className="ua-cfg-rc-media-x" aria-label="Remove video" disabled={disabled} onClick={onRemove}>×</button>
      ) : null}
      <input
        ref={inputRef}
        type="file"
        accept={WELLNESS_VIDEO_ACCEPT}
        hidden
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0] || null;
          event.target.value = "";
          if (file) onPick(file);
        }}
      />
    </div>
  );
}

function TimeInput({ value, disabled, detecting, onChange, onBlur, ariaLabel }) {
  return (
    <input
      type="text"
      className="ua-cfg-vh-input"
      value={detecting ? "" : value}
      placeholder={detecting ? "Detecting…" : "5:12"}
      disabled={disabled || detecting}
      aria-label={ariaLabel}
      autoComplete="off"
      onChange={(event) => onChange(sanitizeTimeInput(event.target.value))}
      onBlur={onBlur}
    />
  );
}

export function WellnessLibrarySection({ kind, onToast }) {
  const meta = WELLNESS_LIBRARY_KINDS[kind] || WELLNESS_LIBRARY_KINDS.mental;
  const [items, setItems] = useState([]);
  const [draft, setDraft] = useState(emptyWellnessDraft);
  const [draftThumb, setDraftThumb] = useState(null);
  const [draftPreview, setDraftPreview] = useState("");
  const [draftVideo, setDraftVideo] = useState(null);
  const [draftVideoPreview, setDraftVideoPreview] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [viewingId, setViewingId] = useState("");
  const [listQuery, setListQuery] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: WELLNESS_LIBRARY_PAGE_SIZE,
    total: 0,
    pages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [detecting, setDetecting] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);
  const savedRef = useRef({});
  const itemsRef = useRef(items);
  const editFilesRef = useRef({});
  const coverInputRefs = useRef({});

  const rememberSaved = useCallback((rows) => {
    savedRef.current = Object.fromEntries((rows || []).map((row) => [row.id, snapshotItem(row)]));
  }, []);

  const loadItems = useCallback(async (pageOverride) => {
    const nextPage = pageOverride ?? page;
    setLoading(true);
    try {
      const { items: rows, pagination: nextPagination } = await adminListWellnessLibrary(kind, null, {
        page: nextPage,
        limit: WELLNESS_LIBRARY_PAGE_SIZE,
        search,
        type: typeFilter || undefined,
      });
      const next = rows || [];
      setItems(next);
      itemsRef.current = next;
      rememberSaved(next);
      setPagination({
        page: Number(nextPagination?.page) || nextPage,
        limit: Number(nextPagination?.limit) || WELLNESS_LIBRARY_PAGE_SIZE,
        total: Number(nextPagination?.total) || next.length,
        pages: Number(nextPagination?.pages) || 1,
      });
    } catch (error) {
      onToast(error?.message || `Failed to load ${meta.title}`);
      setItems([]);
      itemsRef.current = [];
      rememberSaved([]);
      setPagination({ page: 1, limit: WELLNESS_LIBRARY_PAGE_SIZE, total: 0, pages: 1 });
    } finally {
      setLoading(false);
    }
  }, [kind, meta.title, onToast, page, rememberSaved, search, typeFilter]);

  useEffect(() => {
    setPage(1);
    setListQuery("");
    setSearch("");
    setTypeFilter("");
    setCreating(false);
    setEditingId("");
    setViewingId("");
    setDraft(emptyWellnessDraft());
    setDraftThumb(null);
    setDraftVideo(null);
    setDraftPreview((prev) => {
      revokeBlobUrl(prev);
      return "";
    });
    setDraftVideoPreview((prev) => {
      revokeBlobUrl(prev);
      return "";
    });
    editFilesRef.current = {};
  }, [kind]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = listQuery.trim();
      setSearch((prev) => {
        if (prev === next) return prev;
        setPage(1);
        return next;
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [listQuery]);

  useEffect(() => {
    if (!loading && page > pagination.pages) setPage(pagination.pages);
  }, [loading, page, pagination.pages]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => () => {
    revokeBlobUrl(draftPreview);
    revokeBlobUrl(draftVideoPreview);
  }, [draftPreview, draftVideoPreview]);

  function updateItem(id, patch) {
    setItems((prev) => {
      const next = prev.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry));
      itemsRef.current = next;
      return next;
    });
  }

  function assertVideoFile(file) {
    if (!(file instanceof File)) return false;
    if (file.size > WELLNESS_VIDEO_MAX_MB * 1024 * 1024) {
      onToast(`Video must be ${WELLNESS_VIDEO_MAX_MB} MB or smaller`);
      return false;
    }
    return true;
  }

  async function detectYoutubeTime(url) {
    if (!isValidYoutubeUrl(url)) return "";
    try {
      return (await adminPreviewYoutubeDuration(kind, url)) || "";
    } catch (error) {
      onToast(error?.message || "Could not detect video time from this YouTube link");
      return "";
    }
  }

  async function persistItem(id, fields, files, successMessage) {
    setBusy(true);
    try {
      const updated = await adminUpdateWellnessLibraryItem(kind, null, id, fields, files || {});
      if (!updated) throw new Error("Failed to save item");
      setItems((prev) => {
        const next = prev.map((entry) => (entry.id === id ? { ...entry, ...updated } : entry));
        itemsRef.current = next;
        return next;
      });
      savedRef.current[id] = snapshotItem(updated);
      if (successMessage) onToast(successMessage);
      return true;
    } catch (error) {
      onToast(error?.message || "Failed to save item");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function resolveDuration(item, next) {
    if (next.duration && (isBareNumber(next.duration) || !isValidDuration(next.duration))) {
      onToast(TIME_HINT);
      return "";
    }
    if (next.type === "ytlink") {
      if (!isValidYoutubeUrl(next.ytLink)) {
        onToast("A valid YouTube URL is required");
        return "";
      }
      if (isValidDuration(next.duration)) return next.duration;
      setDetecting(item.id);
      const detected = await detectYoutubeTime(next.ytLink);
      setDetecting("");
      if (!detected) {
        onToast(TIME_HINT);
        return "";
      }
      updateItem(item.id, { duration: detected });
      return detected;
    }
    const staged = editFilesRef.current[item.id]?.videoFile;
    if (!item.hasFile && !(staged instanceof File)) {
      onToast("Upload a video file");
      return "";
    }
    if (isValidDuration(next.duration)) return next.duration;
    onToast(TIME_HINT);
    return "";
  }

  async function saveEditedItem(item) {
    if (!item?.id || busy) return;
    const next = snapshotItem(item);
    if (!next.title) {
      onToast("Title is required");
      return;
    }
    const duration = await resolveDuration(item, next);
    if (!duration) return;
    next.duration = duration;
    const staged = editFilesRef.current[item.id] || {};
    const files = {};
    if (staged.videoFile instanceof File) files.videoFile = staged.videoFile;
    const saved = savedRef.current[item.id] || next;
    if (sameSnapshot(saved, next) && !files.videoFile) {
      setEditingId("");
      return;
    }
    const ok = await persistItem(
      item.id,
      {
        title: next.title,
        type: next.type,
        ytLink: next.type === "ytlink" ? next.ytLink : "",
        duration: next.duration,
      },
      files,
      `${next.title} saved`,
    );
    if (ok) {
      delete editFilesRef.current[item.id];
      setEditingId("");
    } else {
      updateItem(item.id, saved);
    }
  }

  function cancelEdit(item) {
    const saved = savedRef.current[item.id];
    if (saved) updateItem(item.id, saved);
    delete editFilesRef.current[item.id];
    setEditingId("");
  }

  async function toggleLive(item) {
    if (busy) return;
    const live = !item.live;
    updateItem(item.id, { live, status: live ? "active" : "inactive" });
    const ok = await persistItem(item.id, { live });
    if (!ok) updateItem(item.id, savedRef.current[item.id] || snapshotItem(item));
  }

  async function changeImage(item, file) {
    if (!(file instanceof File) || busy) return;
    await persistItem(item.id, {}, { thumbnailFile: file }, "Cover updated");
  }

  async function pickEditVideo(item, file) {
    if (!assertVideoFile(file) || busy) return;
    setDetecting(item.id);
    const duration = await readVideoFileDuration(file);
    setDetecting("");
    editFilesRef.current[item.id] = { ...(editFilesRef.current[item.id] || {}), videoFile: file };
    updateItem(item.id, {
      type: "video",
      ytLink: "",
      duration: duration || item.duration,
      hasFile: true,
      fileUrl: URL.createObjectURL(file),
    });
    if (!duration) onToast("Could not detect video time. Enter time as 5:12");
  }

  function pickDraftImage(file) {
    revokeBlobUrl(draftPreview);
    setDraftThumb(file instanceof File ? file : null);
    setDraftPreview(file instanceof File ? URL.createObjectURL(file) : "");
  }

  async function pickDraftVideo(file) {
    if (!assertVideoFile(file)) return;
    revokeBlobUrl(draftVideoPreview);
    setDraftVideo(file);
    setDraftVideoPreview(URL.createObjectURL(file));
    setDetecting("draft");
    const duration = await readVideoFileDuration(file);
    setDetecting("");
    setDraft((prev) => ({ ...prev, type: "video", duration: duration || "", ytLink: "" }));
    if (!duration) onToast("Could not detect video time. Enter time as 5:12");
  }

  function clearDraftVideo() {
    revokeBlobUrl(draftVideoPreview);
    setDraftVideo(null);
    setDraftVideoPreview("");
    setDraft((prev) => ({ ...prev, type: "ytlink", duration: prev.ytLink ? prev.duration : "" }));
  }

  async function detectDraftYoutube(url) {
    if (!isValidYoutubeUrl(url)) return;
    setDetecting("draft");
    const duration = await detectYoutubeTime(url);
    setDetecting("");
    if (duration) setDraft((prev) => ({ ...prev, duration }));
  }

  function changeDraftType(type) {
    const nextType = resolveLibraryType(type);
    setDraft((prev) => ({
      ...prev,
      type: nextType,
      duration: "",
      ytLink: nextType === "ytlink" ? prev.ytLink : "",
    }));
    if (nextType !== "video") clearDraftVideo();
  }

  function commitDraftTime() {
    const raw = String(draft.duration || "").trim();
    if (!raw) return;
    if (isBareNumber(raw) || !isValidDuration(raw)) {
      setDraft((prev) => ({ ...prev, duration: "" }));
      onToast(TIME_HINT);
    }
  }

  function resetDraft() {
    revokeBlobUrl(draftPreview);
    revokeBlobUrl(draftVideoPreview);
    setDraft(emptyWellnessDraft());
    setDraftThumb(null);
    setDraftPreview("");
    setDraftVideo(null);
    setDraftVideoPreview("");
  }

  async function addItem() {
    const title = draft.title.trim();
    const type = resolveLibraryType(draft.type);
    const ytLink = draft.ytLink.trim();
    let duration = draft.duration.trim();

    if (!title || !(draftThumb instanceof File)) {
      onToast("Title and cover photo are required");
      return;
    }
    if (duration && (isBareNumber(duration) || !isValidDuration(duration))) {
      onToast(TIME_HINT);
      return;
    }

    if (type === "ytlink") {
      if (!isValidYoutubeUrl(ytLink)) {
        onToast("Paste a valid YouTube URL");
        return;
      }
      if (!isValidDuration(duration)) {
        setDetecting("draft");
        duration = await detectYoutubeTime(ytLink);
        setDetecting("");
        if (duration) setDraft((prev) => ({ ...prev, duration }));
      }
    } else if (!(draftVideo instanceof File)) {
      onToast("Upload a video file");
      return;
    }

    if (!isValidDuration(duration)) {
      onToast("Could not detect video time. Enter time as 5:12");
      return;
    }

    setBusy(true);
    try {
      const created = await adminCreateWellnessLibraryItem(
        kind,
        null,
        {
          title,
          type,
          ytLink: type === "ytlink" ? ytLink : "",
          duration,
          live: true,
        },
        {
          thumbnailFile: draftThumb,
          videoFile: type === "video" ? draftVideo : undefined,
        },
      );
      if (!created) throw new Error("Failed to add item");
      resetDraft();
      setCreating(false);
      onToast(`${title} added to the library`);
      setPage(1);
      await loadItems(1);
    } catch (error) {
      onToast(error?.message || "Failed to add item");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete || busy) return;
    const item = pendingDelete;
    setPendingDelete(null);
    setBusy(true);
    try {
      await adminDeleteWellnessLibraryItem(kind, null, item.id);
      onToast(`${item.title} removed`);
      if (editingId === item.id) setEditingId("");
      const remaining = itemsRef.current.filter((entry) => entry.id !== item.id).length;
      if (remaining === 0 && page > 1) {
        const nextPage = page - 1;
        setPage(nextPage);
        await loadItems(nextPage);
      } else {
        await loadItems(page);
      }
    } catch (error) {
      onToast(error?.message || "Failed to delete item");
    } finally {
      setBusy(false);
    }
  }

  function clearFilters() {
    setListQuery("");
    setSearch("");
    setTypeFilter("");
    setPage(1);
  }

  const locked = busy || loading;
  const liveCount = items.filter((entry) => entry.live).length;
  const hasFilters = Boolean(search || typeFilter);

  return (
    <div className="ua-cfg-rc ua-cfg-lib">
      <Panel
        title={meta.title}
        subtitle={
          loading
            ? `Loading ${meta.title.toLowerCase()}…`
            : `${pagination.total || items.length} ${(pagination.total || items.length) === 1 ? meta.noun : meta.nouns} · ${liveCount} live on this page${hasFilters ? " · filtered" : ""}`
        }
        actions={
          <button
            type="button"
            className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-tf-add-btn"
            disabled={locked}
            onClick={() => {
              setEditingId("");
              setCreating(true);
            }}
          >
            {meta.addLabel}
          </button>
        }
      >
        {creating ? (
          <section className="ua-cfg-rc-new ua-cfg-lib-new">
            <div className="ua-cfg-rc-new__head">
              <strong><span aria-hidden="true">{meta.emoji}</span> {meta.newLabel}</strong>
              <button
                type="button"
                className="ua-cfg-icon-btn"
                aria-label="Close"
                disabled={locked}
                onClick={() => {
                  resetDraft();
                  setCreating(false);
                }}
              >
                ×
              </button>
            </div>
            <div className="ua-cfg-rc-new__grid">
              <div className="ua-cfg-rc-new__media">
                <CoverDrop
                  previewUrl={draftPreview}
                  disabled={locked}
                  onPick={pickDraftImage}
                  onRemove={() => pickDraftImage(null)}
                />
                <VideoDrop
                  previewUrl={draftVideoPreview}
                  embedUrl={draftVideo ? "" : youtubeEmbedUrl(draft.ytLink)}
                  fileName={draftVideo?.name || ""}
                  disabled={locked}
                  onPick={pickDraftVideo}
                  onRemove={clearDraftVideo}
                />
              </div>
              <div className="ua-cfg-rc-new__fields">
                <label className="ua-cfg-rc-field">
                  <span>Title</span>
                  <input
                    className="ua-cfg-vh-input"
                    placeholder="Title"
                    value={draft.title}
                    disabled={locked}
                    onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
                  />
                </label>
                <label className="ua-cfg-rc-field">
                  <span>Type</span>
                  <CfgSelect
                    className="ua-cfg-rc-select"
                    options={WELLNESS_LIBRARY_TYPES}
                    value={resolveLibraryType(draft.type)}
                    disabled={locked}
                    onChange={changeDraftType}
                    ariaLabel="Type"
                    placeholder="Choose type"
                  />
                </label>
                {draft.type === "ytlink" ? (
                  <label className="ua-cfg-rc-field ua-cfg-rc-field--wide">
                    <span>YouTube link</span>
                    <input
                      className="ua-cfg-vh-input"
                      placeholder="https://youtube.com/…"
                      value={draft.ytLink}
                      disabled={locked}
                      onChange={(event) => setDraft((prev) => ({ ...prev, ytLink: event.target.value, type: "ytlink" }))}
                      onBlur={() => detectDraftYoutube(draft.ytLink)}
                    />
                  </label>
                ) : null}
                <label className="ua-cfg-rc-field">
                  <span>Time</span>
                  <TimeInput
                    value={draft.duration}
                    detecting={detecting === "draft"}
                    disabled={locked}
                    ariaLabel="Video time"
                    onChange={(duration) => setDraft((prev) => ({ ...prev, duration }))}
                    onBlur={commitDraftTime}
                  />
                </label>
                <div className="ua-cfg-rc-new__foot">
                  <button type="button" className="ua-cfg-btn ua-cfg-btn--primary" disabled={locked} onClick={addItem}>
                    {busy && creating ? "Saving…" : meta.addLabel.replace(/^\+\s*/, "Add ")}
                  </button>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <div className="ua-cfg-rc-toolbar">
          <input
            type="search"
            className="ua-cfg-dd-search"
            placeholder={meta.search}
            value={listQuery}
            onChange={(event) => setListQuery(event.target.value)}
            aria-label={`Search ${meta.nouns}`}
          />
          <CfgSelect
            className="ua-cfg-rc-select ua-cfg-rc-filter"
            options={TYPE_FILTERS}
            value={typeFilter}
            disabled={locked}
            onChange={(value) => {
              setTypeFilter(value);
              setPage(1);
            }}
            ariaLabel="Filter by type"
            placeholder="All types"
          />
          {hasFilters ? (
            <button type="button" className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm" onClick={clearFilters}>
              Clear
            </button>
          ) : null}
        </div>

        {loading ? (
          <p className="ua-cfg-panel__sub">Fetching library from the server…</p>
        ) : items.length ? (
          <div className={`ua-cfg-rc-list${busy ? " is-loading" : ""}`}>
            {items.map((item) => {
              const editing = editingId === item.id;
              const stagedFile = editFilesRef.current[item.id]?.videoFile;
              return (
                <article
                  key={item.id}
                  className={`ua-cfg-rc-item ua-cfg-rc-item--lib ua-cfg-lib-item${editing ? " is-editing" : ""} is-video`}
                >
                  <div className="ua-cfg-rc-cover-wrap">
                    <button
                      type="button"
                      className="ua-cfg-rc-cover is-video ua-cfg-rc-cover--pick"
                      disabled={locked}
                      onClick={() => coverInputRefs.current[item.id]?.click()}
                    >
                      {item.thumbnail ? (
                        <img className="ua-cfg-rc-cover__img" src={item.thumbnail} alt="" />
                      ) : (
                        <span aria-hidden="true">🖼</span>
                      )}
                      <em>{item.thumbnail ? "Replace" : "Cover"}</em>
                    </button>
                    <input
                      ref={(node) => {
                        coverInputRefs.current[item.id] = node;
                      }}
                      type="file"
                      accept={IMAGE_ACCEPT}
                      hidden
                      disabled={locked}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = "";
                        if (file) changeImage(item, file);
                      }}
                    />
                  </div>
                  <div className="ua-cfg-rc-item__body">
                    <div className="ua-cfg-rc-item__head">
                      <div className="ua-cfg-rc-item__identity">
                        {editing ? (
                          <input
                            className="ua-cfg-vh-input ua-cfg-rc-title"
                            value={item.title}
                            disabled={locked}
                            onChange={(event) => updateItem(item.id, { title: event.target.value })}
                          />
                        ) : (
                          <strong>{item.title}</strong>
                        )}
                        <div className="ua-cfg-rc-item__meta">
                          <span className={`ua-cfg-rc-pill ua-cfg-rc-pill--${item.type === "ytlink" ? "video" : "video"}`}>
                            {displayTypeLabel(item.type)}
                          </span>
                          {item.duration ? (
                            <span className="ua-cfg-rc-pill ua-cfg-rc-pill--cat">{item.duration}</span>
                          ) : null}
                        </div>
                      </div>
                      <div className="ua-cfg-rc-item__actions">
                        <div className="ua-cfg-rc-item__live">
                          <span className={`ua-cfg-faq__shown${item.live ? " is-on" : ""}`}>
                            {item.live ? "LIVE" : "HIDDEN"}
                          </span>
                          <button
                            type="button"
                            className={`ua-toggle ua-toggle--sm${item.live ? " ua-toggle--on" : ""}`}
                            aria-pressed={item.live}
                            aria-label={`${item.title} ${item.live ? "live" : "hidden"}`}
                            disabled={locked}
                            onClick={() => toggleLive(item)}
                          >
                            <span className="ua-toggle__knob" />
                          </button>
                        </div>
                        <div className="ua-cfg-rc-item__btns">
                          <button
                            type="button"
                            className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm"
                            disabled={locked}
                            onClick={() => setViewingId(item.id)}
                          >
                            View
                          </button>
                          {editing ? (
                            <>
                              <button
                                type="button"
                                className="ua-cfg-btn ua-cfg-btn--primary ua-cfg-btn--sm"
                                disabled={locked}
                                onClick={() => saveEditedItem(item)}
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm"
                                disabled={locked}
                                onClick={() => cancelEdit(item)}
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm"
                              disabled={locked}
                              onClick={() => {
                                setCreating(false);
                                setViewingId("");
                                setEditingId(item.id);
                              }}
                            >
                              Edit
                            </button>
                          )}
                          <button
                            type="button"
                            className="ua-cfg-icon-btn"
                            aria-label={`Remove ${item.title}`}
                            disabled={locked}
                            onClick={() => setPendingDelete(item)}
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    </div>
                    {editing ? (
                      <div className="ua-cfg-rc-edit">
                        <div className="ua-cfg-rc-edit__media">
                          <VideoDrop
                            previewUrl={item.fileUrl || ""}
                            embedUrl={item.fileUrl ? "" : youtubeEmbedUrl(item.ytLink)}
                            fileName={stagedFile?.name || (item.hasFile ? "Uploaded video" : "")}
                            disabled={locked}
                            onPick={(file) => pickEditVideo(item, file)}
                            onRemove={() => {
                              delete editFilesRef.current[item.id];
                              updateItem(item.id, { type: "ytlink", fileUrl: "", hasFile: false });
                            }}
                          />
                          <div className="ua-cfg-rc-edit__side">
                            <label className="ua-cfg-rc-field">
                              <span>Type</span>
                              <CfgSelect
                                className="ua-cfg-rc-select"
                                options={WELLNESS_LIBRARY_TYPES}
                                value={resolveLibraryType(item.type)}
                                disabled={locked}
                                onChange={(type) => updateItem(item.id, {
                                  type: resolveLibraryType(type),
                                  ytLink: resolveLibraryType(type) === "ytlink" ? item.ytLink : "",
                                })}
                                ariaLabel={`Type for ${item.title}`}
                                placeholder="Choose type"
                              />
                            </label>
                            {item.type === "ytlink" ? (
                              <input
                                className="ua-cfg-vh-input"
                                placeholder="YouTube link · youtube.com/watch?v=…"
                                value={item.ytLink}
                                disabled={locked}
                                onChange={(event) => updateItem(item.id, { ytLink: event.target.value, type: "ytlink" })}
                              />
                            ) : null}
                            <label className="ua-cfg-rc-field">
                              <span>Time</span>
                              <TimeInput
                                value={item.duration}
                                detecting={detecting === item.id}
                                disabled={locked}
                                ariaLabel={`Video time for ${item.title}`}
                                onChange={(duration) => updateItem(item.id, { duration })}
                              />
                            </label>
                          </div>
                        </div>
                      </div>
                    ) : (
                      item.ytLink ? (
                        <a className="ua-cfg-rc-link" href={item.ytLink} target="_blank" rel="noreferrer">
                          {item.ytLink}
                        </a>
                      ) : null
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="ua-cfg-panel__sub">
            {hasFilters ? `No ${meta.nouns} match your search.` : `No ${meta.nouns} yet. Add one to start the library.`}
          </p>
        )}

        {!loading && pagination.total > 0 ? (
          <ListPagination
            page={pagination.page}
            pages={pagination.pages}
            total={pagination.total}
            pageSize={WELLNESS_LIBRARY_PAGE_SIZE}
            onPageChange={setPage}
            label={`${meta.title} pagination`}
          />
        ) : null}
      </Panel>

      <LibraryViewModal
        entry={items.find((row) => row.id === viewingId) || null}
        viewTag={meta.title}
        itemNoun={meta.noun}
        onClose={() => setViewingId("")}
        onEdit={(id) => {
          setCreating(false);
          setEditingId(id);
        }}
      />

      <ConfirmDialog
        open={!!pendingDelete}
        tag={`Delete ${meta.noun}`}
        title={pendingDelete ? `Remove “${pendingDelete.title}”?` : ""}
        body="This permanently removes it from the private library. Assigned clients will no longer see it."
        cancelLabel="Keep item"
        confirmLabel="Delete"
        confirmTone="danger"
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
