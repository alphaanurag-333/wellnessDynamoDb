import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  adminCreateVideoTestimonial,
  adminDeleteVideoTestimonial,
  adminListVideoTestimonials,
  adminUpdateVideoTestimonial,
} from "../api/videoTestimonialApi.js";
import { TESTIMONIAL_PAGE_SIZE } from "../data/testimonialDropdownData.js";
import { formatRecipeDate, youtubeEmbedUrl } from "../data/recipesConfigData.js";
import { ConfirmDialog } from "./ConfirmDialog.jsx";
import { ImageCropModal } from "./ImageCropModal.jsx";
import { ListPagination } from "./shared.jsx";

const EMPTY_DRAFT = {
  name: "",
  ytLink: "",
  type: "link",
  imageFile: null,
  imagePreview: "",
  videoFile: null,
  videoName: "",
};

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

function CoverDrop({ previewUrl, disabled, onPick, onRemove }) {
  const inputRef = useRef(null);
  return (
    <div className="ua-cfg-rc-cover-drop-wrap">
      <div className="ua-cfg-rc-cover-drop-frame">
        <button
          type="button"
          className={`ua-cfg-rc-cover-drop${previewUrl ? " is-on" : ""}`}
          disabled={disabled}
          aria-label={previewUrl ? "Replace cover image" : "Add cover image"}
          onClick={() => inputRef.current?.click()}
        >
          {previewUrl ? <img className="ua-cfg-rc-drop-preview" src={previewUrl} alt="" /> : <span aria-hidden="true">🖼</span>}
          <em>{previewUrl ? "Replace" : "Cover image"}</em>
        </button>
        {previewUrl && onRemove ? (
          <button type="button" className="ua-cfg-rc-media-x" aria-label="Remove cover image" disabled={disabled} onClick={onRemove}>×</button>
        ) : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onPick(file);
        }}
      />
    </div>
  );
}

function VoiceViewModal({ entry, onClose, onEdit }) {
  if (!entry) return null;
  const photo = entry.imagePreview || entry.profileImage;
  const embed = youtubeEmbedUrl(entry.ytLink);
  const isVideo = entry.type === "video";
  return (
    <div className="ua-cp-modal-backdrop ua-cp-modal-backdrop--drawer" onClick={onClose} role="presentation">
      <div className="ua-cfg-rc-view" onClick={(event) => event.stopPropagation()} role="dialog" aria-labelledby="vh-view-title">
        <div className="ua-cfg-rc-view__head">
          <div>
            <p className="ua-cfg-rc-view__tag">Voice of Healing</p>
            <h3 id="vh-view-title">{entry.name || "Untitled video"}</h3>
            <p>{isVideo ? "Uploaded video" : "YouTube link"} · {entry.live ? "Live" : "Hidden"}</p>
          </div>
          <button type="button" className="ua-cfg-mv-upload-modal__close" aria-label="Close" onClick={onClose}>×</button>
        </div>
        {photo ? (
          <div className="ua-cfg-rc-view__media">
            <img src={photo} alt="" />
          </div>
        ) : (
          <div className="ua-cfg-rc-view__media"><div className="ua-cfg-rc-view__media-empty">No cover</div></div>
        )}
        <dl className="ua-cfg-rc-view__meta">
          <div>
            <dt>Type</dt>
            <dd>{isVideo ? "Uploaded video" : "YouTube link"}</dd>
          </div>
          <div>
            <dt>{isVideo ? "Video" : "YouTube"}</dt>
            <dd>
              {isVideo && entry.video ? (
                <a href={entry.video} target="_blank" rel="noreferrer">{entry.video}</a>
              ) : entry.ytLink ? (
                <a href={entry.ytLink} target="_blank" rel="noreferrer">{entry.ytLink}</a>
              ) : "—"}
            </dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{entry.live ? "Live" : "Hidden"}</dd>
          </div>
          <div>
            <dt>Updated</dt>
            <dd>{formatRecipeDate(entry.updatedAt)}</dd>
          </div>
        </dl>
        {embed ? (
          <div className="ua-cfg-rc-view__embed">
            <iframe title={entry.name || "Voice of Healing video"} src={embed} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
          </div>
        ) : isVideo && entry.video ? (
          <video className="ua-cfg-rc-view__player" src={entry.video} controls preload="metadata" />
        ) : null}
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
            Edit testimonial
          </button>
        </div>
      </div>
    </div>
  );
}

export function DynamicVoiceOfHealingSection({ items, setItems, onToast }) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewingId, setViewingId] = useState(null);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: TESTIMONIAL_PAGE_SIZE, total: 0, pages: 1 });
  const [pendingDelete, setPendingDelete] = useState(null);
  const [cropPending, setCropPending] = useState(null);
  const coverInputRefs = useRef({});
  const videoInputRef = useRef(null);

  const loadItems = useCallback(async (pageOverride) => {
    const nextPage = pageOverride ?? page;
    setLoading(true);
    try {
      const result = await adminListVideoTestimonials(null, {
        page: nextPage,
        limit: TESTIMONIAL_PAGE_SIZE,
        search: query || undefined,
      });
      const next = result.items || [];
      setItems(next);
      setPagination({
        page: Number(result.pagination?.page) || nextPage,
        limit: Number(result.pagination?.limit) || TESTIMONIAL_PAGE_SIZE,
        total: Number(result.pagination?.total) || next.length,
        pages: Number(result.pagination?.pages) || 1,
      });
      setViewingId((current) => (next.some((row) => row.id === current) ? current : null));
    } catch (error) {
      setItems([]);
      onToast(error?.message || "Could not load voice of healing videos");
    } finally {
      setLoading(false);
    }
  }, [onToast, page, query, setItems]);

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

  useEffect(() => () => {
    if (draft.imagePreview?.startsWith("blob:")) URL.revokeObjectURL(draft.imagePreview);
  }, [draft.imagePreview]);

  useEffect(() => () => {
    if (cropPending?.previewUrl) URL.revokeObjectURL(cropPending.previewUrl);
  }, [cropPending?.previewUrl]);

  function patchItem(id, patch) {
    setItems((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function closeCrop() {
    if (cropPending?.previewUrl) URL.revokeObjectURL(cropPending.previewUrl);
    setCropPending(null);
  }

  function openCrop(file, target) {
    if (!String(file.type || "").startsWith("image/")) {
      onToast("Choose an image file");
      return;
    }
    if (cropPending?.previewUrl) URL.revokeObjectURL(cropPending.previewUrl);
    setCropPending({ file, previewUrl: URL.createObjectURL(file), target });
  }

  function clearDraftPhoto() {
    setDraft((prev) => {
      if (prev.imagePreview?.startsWith("blob:")) URL.revokeObjectURL(prev.imagePreview);
      return { ...prev, imageFile: null, imagePreview: "" };
    });
  }

  async function confirmCrop(croppedFile, cropError) {
    if (cropError) {
      onToast(cropError.message || "Failed to crop image");
      return;
    }
    if (!croppedFile || !cropPending) return;
    const target = cropPending.target;
    closeCrop();
    if (target === "draft") {
      setDraft((prev) => {
        if (prev.imagePreview?.startsWith("blob:")) URL.revokeObjectURL(prev.imagePreview);
        return { ...prev, imageFile: croppedFile, imagePreview: URL.createObjectURL(croppedFile) };
      });
      onToast("Cover image attached");
      return;
    }
    setBusy(true);
    try {
      const saved = await adminUpdateVideoTestimonial(null, target, {}, { profileImage: croppedFile });
      patchItem(target, saved);
      onToast("Cover image updated");
    } catch (error) {
      onToast(error?.message || "Could not update the cover");
    } finally {
      setBusy(false);
    }
  }

  async function addItem() {
    const name = draft.name.trim();
    if (!name) {
      onToast("Add the client or video title");
      return;
    }
    if (!(draft.imageFile instanceof File)) {
      onToast("Add a cover image");
      return;
    }
    const type = draft.videoFile instanceof File ? "video" : "link";
    if (type === "link" && !draft.ytLink.trim()) {
      onToast("Add a YouTube link or upload a video");
      return;
    }
    setBusy(true);
    try {
      await adminCreateVideoTestimonial(null, {
        name,
        ytLink: draft.ytLink.trim(),
        type,
        status: "active",
      }, { profileImage: draft.imageFile, videoFile: draft.videoFile });
      clearDraftPhoto();
      setDraft(EMPTY_DRAFT);
      setCreating(false);
      setPage(1);
      onToast("Voice of Healing video added");
      await loadItems(1);
    } catch (error) {
      onToast(error?.message || "Could not add video");
    } finally {
      setBusy(false);
    }
  }

  async function saveItem(item) {
    const name = String(item.name || "").trim();
    if (!name) {
      onToast("Add the client or video title");
      return;
    }
    if (item.type === "link" && !String(item.ytLink || "").trim()) {
      onToast("YouTube link is required for link videos");
      return;
    }
    setBusy(true);
    try {
      const saved = await adminUpdateVideoTestimonial(null, item.id, {
        name,
        ytLink: item.ytLink,
        type: item.type,
      });
      patchItem(item.id, saved);
      setEditingId(null);
      onToast("Video saved");
    } catch (error) {
      onToast(error?.message || "Could not save video");
    } finally {
      setBusy(false);
    }
  }

  async function toggleLive(item) {
    if (busy) return;
    const live = !item.live;
    patchItem(item.id, { live, status: live ? "active" : "inactive" });
    try {
      const saved = await adminUpdateVideoTestimonial(null, item.id, { live });
      patchItem(item.id, saved);
    } catch (error) {
      patchItem(item.id, { live: item.live, status: item.status });
      onToast(error?.message || "Could not update visibility");
    }
  }

  async function deleteItem() {
    if (!pendingDelete) return;
    const item = pendingDelete;
    setPendingDelete(null);
    setBusy(true);
    try {
      await adminDeleteVideoTestimonial(null, item.id);
      onToast("Video deleted");
      await loadItems();
    } catch (error) {
      onToast(error?.message || "Could not delete video");
    } finally {
      setBusy(false);
    }
  }

  const liveCount = useMemo(() => items.filter((row) => row.live).length, [items]);
  const viewing = items.find((row) => row.id === viewingId) || null;

  return (
    <div className="ua-cfg-vh">
      <Panel
        title="Voice of Healing"
        subtitle={loading ? "Loading videos…" : `${pagination.total} total · ${liveCount} live on this page · cover image plus a YouTube link or uploaded video`}
        actions={(
          <button
            type="button"
            className="ua-cfg-rc-add"
            disabled={busy}
            onClick={() => {
              setCreating(true);
              setEditingId(null);
              setViewingId(null);
              setDraft(EMPTY_DRAFT);
            }}
          >
            + Add video
          </button>
        )}
      >
        {creating ? (
          <section className="ua-cfg-rc-new">
            <div className="ua-cfg-rc-new__head">
              <strong><span aria-hidden="true">▶</span> New video</strong>
              <button type="button" className="ua-cfg-icon-btn" aria-label="Close" onClick={() => setCreating(false)}>×</button>
            </div>
            <div className="ua-cfg-rc-new__grid">
              <div className="ua-cfg-rc-new__media">
                <CoverDrop
                  previewUrl={draft.imagePreview}
                  disabled={busy}
                  onPick={(file) => openCrop(file, "draft")}
                  onRemove={clearDraftPhoto}
                />
              </div>
              <div className="ua-cfg-rc-new__fields">
                <input
                  className="ua-cfg-vh-input"
                  placeholder="Title · e.g. Madhupriya's reversal story"
                  value={draft.name}
                  disabled={busy}
                  onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
                />
                <input
                  className="ua-cfg-vh-input"
                  placeholder="YouTube link"
                  value={draft.ytLink}
                  disabled={busy}
                  onChange={(event) => setDraft((prev) => ({ ...prev, ytLink: event.target.value, type: prev.videoFile ? "video" : "link" }))}
                />
                <button type="button" className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm" disabled={busy} onClick={() => videoInputRef.current?.click()}>
                  {draft.videoName ? `Video: ${draft.videoName}` : "Or upload a video file"}
                </button>
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  hidden
                  disabled={busy}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (!file) return;
                    setDraft((prev) => ({ ...prev, videoFile: file, videoName: file.name, type: "video" }));
                  }}
                />
                <button type="button" className="ua-cfg-btn ua-cfg-btn--primary" disabled={busy} onClick={addItem}>
                  {busy ? "Saving…" : "Add video"}
                </button>
              </div>
            </div>
          </section>
        ) : null}

        <div className="ua-cfg-rc-toolbar">
          <input
            type="search"
            className="ua-cfg-dd-search"
            placeholder="Search by title…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search videos"
          />
        </div>

        {items.length ? (
          <div className={`ua-cfg-rc-list${loading ? " is-loading" : ""}`}>
            {items.map((entry) => {
              const isEditing = editingId === entry.id;
              const photo = entry.imagePreview || entry.profileImage;
              const embed = youtubeEmbedUrl(entry.ytLink);
              return (
                <article key={entry.id} className="ua-cfg-rc-item is-text">
                  <div className="ua-cfg-rc-cover-wrap">
                    <button
                      type="button"
                      className={`ua-cfg-rc-cover ua-cfg-rc-cover--pick${photo ? " is-on" : ""}`}
                      disabled={busy}
                      aria-label={photo ? "Replace cover image" : "Add cover image"}
                      onClick={() => coverInputRefs.current[entry.id]?.click()}
                    >
                      {photo ? <img className="ua-cfg-rc-cover__img" src={photo} alt="" /> : <span aria-hidden="true">🖼</span>}
                      <em>{photo ? "Replace" : "Cover"}</em>
                    </button>
                    <input
                      ref={(node) => {
                        coverInputRefs.current[entry.id] = node;
                      }}
                      type="file"
                      accept="image/*"
                      hidden
                      disabled={busy}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = "";
                        if (file) openCrop(file, entry.id);
                      }}
                    />
                  </div>
                  <div className="ua-cfg-rc-item__body">
                    <div className="ua-cfg-rc-item__row">
                      {isEditing ? (
                        <input className="ua-cfg-vh-input ua-cfg-rc-title" value={entry.name} disabled={busy} onChange={(event) => patchItem(entry.id, { name: event.target.value })} />
                      ) : (
                        <strong>{entry.name}</strong>
                      )}
                      <span className="ua-cfg-rc-pill ua-cfg-rc-pill--cat">{entry.type === "video" ? "Video" : "Link"}</span>
                      <span className={`ua-cfg-faq__shown${entry.live ? " is-on" : ""}`}>{entry.live ? "LIVE" : "HIDDEN"}</span>
                      <button type="button" className={`ua-toggle ua-toggle--sm${entry.live ? " ua-toggle--on" : ""}`} aria-pressed={entry.live} disabled={busy} onClick={() => toggleLive(entry)}>
                        <span className="ua-toggle__knob" />
                      </button>
                      <button type="button" className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm" disabled={busy} onClick={() => setViewingId(entry.id)}>View</button>
                      {isEditing ? (
                        <>
                          <button type="button" className="ua-cfg-btn ua-cfg-btn--primary ua-cfg-btn--sm" disabled={busy} onClick={() => saveItem(entry)}>Save</button>
                          <button type="button" className="ua-cfg-btn ua-cfg-btn--ghost ua-cfg-btn--sm" disabled={busy} onClick={() => { setEditingId(null); loadItems(); }}>Cancel</button>
                        </>
                      ) : (
                        <button type="button" className="ua-cfg-cr-link ua-cfg-cr-link--modify" disabled={busy} onClick={() => { setViewingId(null); setEditingId(entry.id); setCreating(false); }}>Edit</button>
                      )}
                      <button type="button" className="ua-cfg-icon-btn" aria-label={`Delete ${entry.name}`} disabled={busy} onClick={() => setPendingDelete(entry)}>×</button>
                    </div>
                    {isEditing ? (
                      <input
                        className="ua-cfg-vh-input"
                        placeholder="YouTube link"
                        value={entry.ytLink}
                        disabled={busy}
                        onChange={(event) => patchItem(entry.id, { ytLink: event.target.value })}
                      />
                    ) : (
                      <p className="ua-cfg-panel__sub">
                        {entry.type === "video" ? "Uploaded video" : (embed ? "YouTube link" : entry.ytLink || "No link")} · {formatRecipeDate(entry.updatedAt)}
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="ua-cfg-panel__sub">
            {loading ? "Fetching videos…" : query ? "No videos match your search." : "No videos yet."}
          </p>
        )}

        <ListPagination
          page={pagination.page}
          pages={pagination.pages}
          total={pagination.total}
          pageSize={TESTIMONIAL_PAGE_SIZE}
          onPageChange={setPage}
          label="Voice of Healing pagination"
        />
      </Panel>

      <VoiceViewModal
        entry={viewing}
        onClose={() => setViewingId(null)}
        onEdit={(id) => {
          setCreating(false);
          setEditingId(id);
        }}
      />

      <ImageCropModal
        open={Boolean(cropPending)}
        label="cover image"
        file={cropPending?.file}
        previewUrl={cropPending?.previewUrl || ""}
        busy={busy}
        defaultRatio="Original"
        originalAspectCss="16 / 9"
        originalAspectNumber={16 / 9}
        onClose={closeCrop}
        onConfirm={confirmCrop}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        tag="Voice of Healing"
        title={`Delete ${pendingDelete?.name || "this video"}?`}
        body="This permanently removes the video and its cover image."
        confirmLabel="Delete"
        confirmTone="danger"
        onCancel={() => setPendingDelete(null)}
        onConfirm={deleteItem}
      />
    </div>
  );
}
