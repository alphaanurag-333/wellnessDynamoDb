import { useCallback, useEffect, useRef, useState } from "react";
import { asCopyString } from "../data/bannerConfigData.js";
import { formatRecipeDate, validateRecipeImage } from "../data/recipesConfigData.js";
import {
  adminCreateBlogMedia,
  adminCreateBlogPost,
  adminDeleteBlogMedia,
  adminDeleteBlogPost,
  adminEnsureBlogConfig,
  adminListBlogMedia,
  adminListBlogPosts,
  adminReorderBlogPosts,
  adminUpdateBlogConfig,
  adminUpdateBlogPost,
} from "../api/blogApi.js";
import { ConfirmDialog } from "./ConfirmDialog.jsx";
import { SectionSurfaceToggles } from "./SectionSurfaceToggles.jsx";
import { ImageCropModal } from "./ImageCropModal.jsx";
import { CfgSelect, ListPagination } from "./shared.jsx";

const POSITION_OPTIONS = [
  { value: "featured", label: "Featured (top)" },
  { value: "2", label: "Position 2" },
  { value: "3", label: "Position 3" },
  { value: "last", label: "Last" },
];

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

function postLabel(index) {
  return index === 0 ? "Featured" : `Post ${index + 1}`;
}

function sortOrderForPosition(position, count) {
  if (position === "featured") return 1;
  if (position === "2") return Math.min(2, count + 1);
  if (position === "3") return Math.min(3, count + 1);
  return count + 1;
}

function CoverPick({ previewUrl, disabled, compact, onPick }) {
  const inputRef = useRef(null);
  const filled = Boolean(previewUrl);

  function pick() {
    if (!disabled) inputRef.current?.click();
  }

  return (
    <div
      className={`ua-cfg-bl-cover${compact ? " ua-cfg-bl-cover--row" : ""}${filled ? " is-on" : ""}`}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={filled ? "Replace cover image" : "Add cover image"}
      aria-disabled={disabled}
      onClick={pick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          pick();
        }
      }}
    >
      {filled ? <img src={previewUrl} alt="" /> : <span aria-hidden="true">🖼️</span>}
      <em>{filled ? "Replace" : "Cover image"}</em>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        disabled={disabled}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onPick(file);
        }}
      />
    </div>
  );
}

function BlogViewModal({ entry, onClose, onEdit }) {
  if (!entry) return null;
  return (
    <div className="ua-cp-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="ua-cfg-rc-view ua-cfg-rc-view--sheet ua-cfg-bl-view"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-labelledby="bl-view-title"
      >
        <div className="ua-cfg-rc-view__head">
          <div className="ua-cfg-bl-view__intro">
            <p className="ua-cfg-rc-view__tag">Blog post</p>
            <h3 id="bl-view-title">{asCopyString(entry.title) || "Untitled post"}</h3>
            <p className="ua-cfg-bl-view__meta">
              <span>{formatRecipeDate(entry.updatedAt || entry.createdAt)}</span>
              <span className={`ua-cfg-tf-view__status${entry.webVisible !== false ? " is-live" : ""}`}>
                Web {entry.webVisible !== false ? "Visible" : "Hidden"}
              </span>
              <span className={`ua-cfg-tf-view__status${entry.appVisible !== false ? " is-live" : ""}`}>
                App {entry.appVisible !== false ? "Visible" : "Hidden"}
              </span>
              <span className={`ua-cfg-tf-view__status${entry.live ? " is-live" : ""}`}>
                {entry.live ? "Live" : "Hidden"}
              </span>
            </p>
          </div>
          <button type="button" className="ua-cfg-icon-btn" aria-label="Close" onClick={onClose}>×</button>
        </div>
        <div className="ua-cfg-bl-view__body">
          {entry.coverImage ? (
            <div className="ua-cfg-rc-view__media ua-cfg-rc-view__media--photo">
              <img src={entry.coverImage} alt="" />
            </div>
          ) : (
            <div className="ua-cfg-rc-view__media">
              <div className="ua-cfg-rc-view__media-empty">No cover image</div>
            </div>
          )}
          {asCopyString(entry.description) ? (
            <p className="ua-cfg-rc-view__copy">{asCopyString(entry.description)}</p>
          ) : (
            <p className="ua-cfg-rc-view__copy ua-cfg-bl-view__empty">No description yet.</p>
          )}
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
            Edit post
          </button>
        </div>
      </div>
    </div>
  );
}

export function DynamicBlogsSection({ editor, setEditor, posts, setPosts, gallery, setGallery, summary, onToast }) {
  const POSTS_PAGE_SIZE = 20;
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewingId, setViewingId] = useState(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: POSTS_PAGE_SIZE, total: 0, pages: 1 });
  const [draft, setDraft] = useState({
    title: "",
    description: "",
    coverFile: null,
    coverPreview: "",
    position: "last",
    webVisible: true,
    appVisible: true,
  });
  const [cropPending, setCropPending] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  const loadPosts = useCallback(async (pageOverride) => {
    const nextPage = pageOverride ?? page;
    const result = await adminListBlogPosts(null, { page: nextPage, limit: POSTS_PAGE_SIZE });
    setPosts(result?.items || []);
    setPagination({
      page: Number(result?.pagination?.page) || nextPage,
      limit: Number(result?.pagination?.limit) || POSTS_PAGE_SIZE,
      total: Number(result?.pagination?.total) || 0,
      pages: Number(result?.pagination?.pages) || 1,
    });
    setViewingId((current) => ((result?.items || []).some((row) => row.id === current) ? current : null));
  }, [page, setPosts]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const config = await adminEnsureBlogConfig(null);
      const [, mediaResult] = await Promise.all([
        loadPosts(),
        adminListBlogMedia(null, { page: 1, limit: 100 }),
      ]);
      setEditor({
        appOn: config?.appOn !== false,
        webOn: config?.webOn !== false,
      });
      setGallery(mediaResult?.items || []);
    } catch (error) {
      onToast(error?.message || "Could not load blogs");
      setPosts([]);
      setGallery([]);
    } finally {
      setLoading(false);
    }
  }, [loadPosts, onToast, setEditor, setGallery, setPosts]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (page === 1) return;
    loadPosts();
  }, [loadPosts, page]);

  useEffect(() => () => {
    if (draft.coverPreview?.startsWith("blob:")) URL.revokeObjectURL(draft.coverPreview);
  }, [draft.coverPreview]);

  useEffect(() => () => {
    if (cropPending?.previewUrl) URL.revokeObjectURL(cropPending.previewUrl);
  }, [cropPending?.previewUrl]);

  async function patchConfig(next) {
    const merged = { ...editor, ...next };
    setEditor(merged);
    setBusy(true);
    try {
      const saved = await adminUpdateBlogConfig(null, merged);
      if (saved) setEditor({ appOn: saved.appOn, webOn: saved.webOn });
    } catch (error) {
      setEditor(editor);
      onToast(error?.message || "Could not save blog settings");
    } finally {
      setBusy(false);
    }
  }

  function updateLocalPost(id, next) {
    setPosts((prev) => prev.map((entry) => (entry.id === id ? { ...entry, ...next } : entry)));
  }

  async function persistPost(id, fields, files, successMessage) {
    setBusy(true);
    try {
      const updated = await adminUpdateBlogPost(null, id, fields, files);
      if (!updated) throw new Error("Failed to save post");
      updateLocalPost(id, updated);
      if (successMessage) onToast(successMessage);
      return updated;
    } catch (error) {
      onToast(error?.message || "Failed to save post");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function movePost(index, direction) {
    const next = index + direction;
    if (next < 0 || next >= posts.length) return;
    const reordered = [...posts];
    const [row] = reordered.splice(index, 1);
    reordered.splice(next, 0, row);
    setPosts(reordered);
    setBusy(true);
    try {
      const saved = await adminReorderBlogPosts(null, reordered.map((entry) => entry.id));
      if (saved?.length) setPosts(saved);
      onToast("Order updated");
    } catch (error) {
      await loadAll();
      onToast(error?.message || "Could not reorder posts");
    } finally {
      setBusy(false);
    }
  }

  async function addPost() {
    const title = asCopyString(draft.title).trim();
    const description = asCopyString(draft.description).trim();
    if (!title || !description) {
      onToast("Add a headline and description");
      return;
    }
    setBusy(true);
    try {
      const created = await adminCreateBlogPost(null, {
        title,
        description,
        live: true,
        sortOrder: sortOrderForPosition(draft.position, pagination.total),
        webVisible: draft.webVisible !== false,
        appVisible: draft.appVisible !== false,
      }, draft.coverFile ? { coverFile: draft.coverFile } : {});
      if (!created) throw new Error("Failed to add post");
      setPage(1);
      await loadPosts(1);
      if (draft.coverPreview?.startsWith("blob:")) URL.revokeObjectURL(draft.coverPreview);
      setDraft({
        title: "",
        description: "",
        coverFile: null,
        coverPreview: "",
        position: "last",
        webVisible: true,
        appVisible: true,
      });
      setCreating(false);
      onToast("Post added");
    } catch (error) {
      onToast(error?.message || "Failed to add post");
    } finally {
      setBusy(false);
    }
  }

  async function togglePostLive(entry) {
    const live = !entry.live;
    updateLocalPost(entry.id, { live });
    const saved = await persistPost(entry.id, { live }, {}, live ? "Post is live" : "Post hidden");
    if (!saved) updateLocalPost(entry.id, { live: entry.live });
  }

  async function togglePostSurface(entry, field) {
    if (busy || (field !== "webVisible" && field !== "appVisible")) return;
    const nextValue = !entry[field];
    updateLocalPost(entry.id, { [field]: nextValue });
    const saved = await persistPost(
      entry.id,
      { [field]: nextValue },
      {},
      `${field === "webVisible" ? "Web" : "App"} ${nextValue ? "visible" : "hidden"}`,
    );
    if (!saved) updateLocalPost(entry.id, { [field]: entry[field] });
  }

  async function saveEditedPost(entry) {
    setEditingId(null);
    await persistPost(entry.id, {
      title: entry.title,
      description: entry.description,
    }, {}, "Post saved");
  }

  async function deletePost(entry) {
    setBusy(true);
    try {
      await adminDeleteBlogPost(null, entry.id);
      const nextTotal = Math.max(0, pagination.total - 1);
      const nextPages = Math.max(1, Math.ceil(nextTotal / POSTS_PAGE_SIZE));
      const nextPage = Math.min(page, nextPages);
      if (nextPage !== page) setPage(nextPage);
      await loadPosts(nextPage);
      onToast("Post removed");
    } catch (error) {
      onToast(error?.message || "Failed to delete post");
    } finally {
      setBusy(false);
      setPendingDelete(null);
    }
  }

  function openCrop(file, target) {
    const error = validateRecipeImage(file);
    if (error) {
      onToast(error);
      return;
    }
    if (cropPending?.previewUrl) URL.revokeObjectURL(cropPending.previewUrl);
    setCropPending({
      file,
      previewUrl: URL.createObjectURL(file),
      target,
    });
  }

  async function applyCrop(file) {
    const target = cropPending?.target;
    if (!target) return;
    if (target.type === "draft") {
      if (draft.coverPreview?.startsWith("blob:")) URL.revokeObjectURL(draft.coverPreview);
      setDraft((prev) => ({
        ...prev,
        coverFile: file,
        coverPreview: URL.createObjectURL(file),
      }));
      onToast("Cover attached");
      return;
    }
    if (target.type === "gallery") {
      setBusy(true);
      try {
        const created = await adminCreateBlogMedia(null, {
          title: file.name?.replace(/\.[^.]+$/, "") || "Blog cover",
          live: false,
        }, { file });
        if (created) setGallery((prev) => [created, ...prev]);
        onToast("Media uploaded");
      } catch (error) {
        onToast(error?.message || "Upload failed");
      } finally {
        setBusy(false);
      }
      return;
    }
    if (target.type === "post") {
      await persistPost(target.id, {}, { coverFile: file }, "Cover attached");
    }
  }

  async function deleteGalleryEntry(entry) {
    setBusy(true);
    try {
      await adminDeleteBlogMedia(null, entry.id);
      setGallery((prev) => prev.filter((row) => row.id !== entry.id));
      onToast("Asset deleted");
    } catch (error) {
      onToast(error?.message || "Could not delete media");
    } finally {
      setBusy(false);
    }
  }

  const liveCount = posts.filter((entry) => entry.live).length;
  const totalCount = pagination.total || posts.length;
  const viewing = posts.find((entry) => entry.id === viewingId) || null;

  return (
    <div className="ua-cfg-bl">
      <Panel
        title="Where this is live"
        subtitle="Turn it on for the app, the website, or both."
        actions={(
          <SectionSurfaceToggles
            appOn={editor?.appOn !== false}
            webOn={editor?.webOn !== false}
            busy={busy}
            onPatch={patchConfig}
          />
        )}
      />

      {summary}

      <Panel
        title="Posts"
        subtitle={
          loading
            ? "Loading posts…"
            : `Drag to reorder · ${liveCount} of ${posts.length || totalCount} live`
        }
        actions={(
          <button
            type="button"
            className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-tf-add-btn"
            disabled={busy}
            onClick={() => {
              setCreating(true);
              setEditingId(null);
              setViewingId(null);
            }}
          >
            + Add post
          </button>
        )}
      >
        {creating ? (
          <section className="ua-cfg-rc-new">
            <div className="ua-cfg-rc-new__head">
              <strong><span aria-hidden="true">📝</span> New post</strong>
              <button type="button" className="ua-cfg-icon-btn" aria-label="Close" onClick={() => setCreating(false)}>×</button>
            </div>
            <div className="ua-cfg-bl-new__grid">
              <CoverPick
                previewUrl={draft.coverPreview}
                disabled={busy}
                onPick={(file) => openCrop(file, { type: "draft" })}
              />
              <div className="ua-cfg-rc-new__fields">
                <input
                  className="ua-cfg-vh-input"
                  placeholder="Headline · e.g. What your HbA1c really tells you"
                  value={asCopyString(draft.title)}
                  disabled={busy}
                  onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
                />
                <textarea
                  className="ua-cfg-tf-story ua-cfg-bl-edit__desc"
                  rows={3}
                  placeholder="Short description shown under the headline..."
                  value={asCopyString(draft.description)}
                  disabled={busy}
                  onChange={(event) => setDraft((prev) => ({ ...prev, description: event.target.value }))}
                />
                <div className="ua-cfg-bn-surfaces ua-cfg-bl-new__surfaces">
                  <div className={`ua-cfg-bn-surface ua-cfg-bn-surface--web${draft.webVisible !== false ? " is-on" : ""}`}>
                    <span>Web {draft.webVisible !== false ? "Visible" : "Hidden"}</span>
                    <button
                      type="button"
                      className={`ua-toggle ua-toggle--sm${draft.webVisible !== false ? " ua-toggle--on" : ""}`}
                      aria-pressed={draft.webVisible !== false}
                      disabled={busy}
                      onClick={() => setDraft((prev) => ({ ...prev, webVisible: !(prev.webVisible !== false) }))}
                    >
                      <span className="ua-toggle__knob" />
                    </button>
                  </div>
                  <div className={`ua-cfg-bn-surface ua-cfg-bn-surface--app${draft.appVisible !== false ? " is-on" : ""}`}>
                    <span>App {draft.appVisible !== false ? "Visible" : "Hidden"}</span>
                    <button
                      type="button"
                      className={`ua-toggle ua-toggle--sm${draft.appVisible !== false ? " ua-toggle--on" : ""}`}
                      aria-pressed={draft.appVisible !== false}
                      disabled={busy}
                      onClick={() => setDraft((prev) => ({ ...prev, appVisible: !(prev.appVisible !== false) }))}
                    >
                      <span className="ua-toggle__knob" />
                    </button>
                  </div>
                </div>
                <div className="ua-cfg-bl-new-foot">
                  <CfgSelect
                    className="ua-cfg-bl-pos"
                    options={POSITION_OPTIONS}
                    value={draft.position}
                    disabled={busy}
                    onChange={(value) => setDraft((prev) => ({ ...prev, position: value }))}
                    ariaLabel="Post position"
                    placeholder="Position"
                  />
                  <button type="button" className="ua-cfg-btn ua-cfg-btn--primary" disabled={busy} onClick={addPost}>
                    {busy && creating ? "Saving…" : "Add post"}
                  </button>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {loading && !posts.length ? (
          <p className="ua-cfg-panel__sub">Fetching posts…</p>
        ) : posts.length ? (
          <div className="ua-cfg-rc-list">
            {posts.map((entry, index) => {
              const editing = editingId === entry.id;
              return (
                <article key={entry.id} className={`ua-cfg-rc-item ua-cfg-bl-item${editing ? " is-editing" : ""}`}>
                  <span className="ua-cfg-bl-handle" aria-hidden="true">⠿</span>
                  <CoverPick
                    previewUrl={entry.coverImage}
                    disabled={busy}
                    compact
                    onPick={(file) => openCrop(file, { type: "post", id: entry.id })}
                  />
                  <div className="ua-cfg-rc-item__body">
                    <div className="ua-cfg-bl-item__head">
                      <div className="ua-cfg-bl-item__identity">
                        <div className="ua-cfg-bl-item__meta">
                          <span className="ua-cfg-rc-pill ua-cfg-bl-flag">{postLabel(index)}</span>
                        </div>
                        {editing ? (
                          <input
                            className="ua-cfg-vh-input ua-cfg-rc-title"
                            value={asCopyString(entry.title)}
                            disabled={busy}
                            onChange={(event) => updateLocalPost(entry.id, { title: event.target.value })}
                          />
                        ) : (
                          <strong>{asCopyString(entry.title)}</strong>
                        )}
                        {editing ? (
                          <textarea
                            className="ua-cfg-tf-story ua-cfg-bl-edit__desc"
                            rows={2}
                            value={asCopyString(entry.description)}
                            disabled={busy}
                            onChange={(event) => updateLocalPost(entry.id, { description: event.target.value })}
                          />
                        ) : (
                          <p>{asCopyString(entry.description)}</p>
                        )}
                      </div>
                      <div className="ua-cfg-bl-item__actions">
                        <div className="ua-cfg-bl-item__surfaces">
                          <div className="ua-cfg-bl-item__live">
                            <span className={`ua-cfg-faq__shown${entry.webVisible !== false ? " is-on" : ""}`}>WEB</span>
                            <button
                              type="button"
                              className={`ua-toggle ua-toggle--sm${entry.webVisible !== false ? " ua-toggle--on" : ""}`}
                              aria-pressed={entry.webVisible !== false}
                              aria-label={entry.webVisible !== false ? "Hide on web" : "Show on web"}
                              disabled={busy}
                              onClick={() => togglePostSurface(entry, "webVisible")}
                            >
                              <span className="ua-toggle__knob" />
                            </button>
                          </div>
                          <div className="ua-cfg-bl-item__live">
                            <span className={`ua-cfg-faq__shown${entry.appVisible !== false ? " is-on" : ""}`}>APP</span>
                            <button
                              type="button"
                              className={`ua-toggle ua-toggle--sm${entry.appVisible !== false ? " ua-toggle--on" : ""}`}
                              aria-pressed={entry.appVisible !== false}
                              aria-label={entry.appVisible !== false ? "Hide on app" : "Show on app"}
                              disabled={busy}
                              onClick={() => togglePostSurface(entry, "appVisible")}
                            >
                              <span className="ua-toggle__knob" />
                            </button>
                          </div>
                          <div className="ua-cfg-bl-item__live">
                            <span className={`ua-cfg-faq__shown${entry.live ? " is-on" : ""}`}>{entry.live ? "LIVE" : "HIDDEN"}</span>
                            <button
                              type="button"
                              className={`ua-toggle ua-toggle--sm${entry.live ? " ua-toggle--on" : ""}`}
                              aria-pressed={entry.live}
                              disabled={busy}
                              onClick={() => togglePostLive(entry)}
                            >
                              <span className="ua-toggle__knob" />
                            </button>
                          </div>
                        </div>
                        <div className="ua-cfg-bl-item__btns">
                          <button
                            type="button"
                            className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm"
                            disabled={busy}
                            onClick={() => setViewingId(entry.id)}
                          >
                            View
                          </button>
                          {editing ? (
                            <>
                              <button type="button" className="ua-cfg-btn ua-cfg-btn--primary ua-cfg-btn--sm" disabled={busy} onClick={() => saveEditedPost(entry)}>Save</button>
                              <button type="button" className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm" disabled={busy} onClick={() => setEditingId(null)}>Cancel</button>
                            </>
                          ) : (
                            <button
                              type="button"
                              className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm"
                              disabled={busy}
                              onClick={() => {
                                setCreating(false);
                                setViewingId(null);
                                setEditingId(entry.id);
                              }}
                            >
                              Edit
                            </button>
                          )}
                          <button type="button" className="ua-cfg-icon-btn" aria-label="Move up" disabled={busy || index === 0} onClick={() => movePost(index, -1)}>↑</button>
                          <button type="button" className="ua-cfg-icon-btn" aria-label="Move down" disabled={busy || index === posts.length - 1} onClick={() => movePost(index, 1)}>↓</button>
                          <button type="button" className="ua-cfg-icon-btn" aria-label="Delete" disabled={busy} onClick={() => setPendingDelete({ kind: "post", entry })}>×</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="ua-cfg-panel__sub">No posts yet.</p>
        )}
        <ListPagination
          page={pagination.page}
          pages={pagination.pages}
          total={pagination.total}
          pageSize={POSTS_PAGE_SIZE}
          onPageChange={setPage}
          label="Blog posts pagination"
        />
      </Panel>

      <BlogViewModal
        entry={viewing}
        onClose={() => setViewingId(null)}
        onEdit={(id) => {
          setCreating(false);
          setEditingId(id);
        }}
      />

      <ImageCropModal
        open={Boolean(cropPending)}
        file={cropPending?.file}
        previewUrl={cropPending?.previewUrl || ""}
        busy={busy}
        defaultRatio="16:9"
        label="blogcover"
        onClose={() => {
          if (cropPending?.previewUrl) URL.revokeObjectURL(cropPending.previewUrl);
          setCropPending(null);
        }}
        onConfirm={async (file) => {
          await applyCrop(file);
          if (cropPending?.previewUrl) URL.revokeObjectURL(cropPending.previewUrl);
          setCropPending(null);
        }}
      />
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={pendingDelete?.kind === "post" ? "Delete blog post?" : "Delete gallery asset?"}
        body={pendingDelete?.kind === "post"
          ? "This removes the post from the blogs section."
          : "This permanently deletes the uploaded asset."}
        confirmLabel="Delete"
        confirmTone="danger"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete?.kind === "post") deletePost(pendingDelete.entry);
          else if (pendingDelete?.kind === "media") deleteGalleryEntry(pendingDelete.entry);
        }}
      />
    </div>
  );
}
