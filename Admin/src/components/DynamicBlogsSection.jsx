import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { asCopyString } from "../data/bannerConfigData.js";
import { validateRecipeImage, formatRecipeDate } from "../data/recipesConfigData.js";
import { galleryOwnersFromMedia } from "../data/blogsConfigData.js";
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
  adminUpdateBlogMedia,
  adminUpdateBlogPost,
} from "../api/blogApi.js";
import { ConfirmDialog } from "./ConfirmDialog.jsx";
import { ImageCropModal } from "./ImageCropModal.jsx";
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

function postLabel(index) {
  return index === 0 ? "Featured" : `Post ${index + 1}`;
}

function sortOrderForPosition(position, count) {
  if (position === "featured") return 1;
  if (position === "2") return Math.min(2, count + 1);
  if (position === "3") return Math.min(3, count + 1);
  return count + 1;
}

function BlogPostViewModal({ entry, positionLabel, onClose, onEdit }) {
  if (!entry) return null;
  const cover = entry.coverImage;
  return (
    <div className="ua-cp-modal-backdrop ua-cp-modal-backdrop--drawer" onClick={onClose} role="presentation">
      <div className="ua-cfg-rc-view" onClick={(event) => event.stopPropagation()} role="dialog" aria-labelledby="bl-view-title">
        <div className="ua-cfg-rc-view__head">
          <div>
            <p className="ua-cfg-rc-view__tag">Blog post</p>
            <h3 id="bl-view-title">{asCopyString(entry.title) || "Untitled post"}</h3>
            <p>{positionLabel || "Post"} · {entry.live ? "Live" : "Hidden"}</p>
          </div>
          <button type="button" className="ua-cfg-mv-upload-modal__close" aria-label="Close" onClick={onClose}>×</button>
        </div>
        <div className="ua-cfg-rc-view__media ua-cfg-rc-view__media--photo">
          {cover ? <img src={cover} alt="" /> : <div className="ua-cfg-rc-view__media-empty">No cover image</div>}
        </div>
        {entry.description ? <p className="ua-cfg-rc-view__copy">{asCopyString(entry.description)}</p> : null}
        <dl className="ua-cfg-rc-view__meta">
          <div>
            <dt>Position</dt>
            <dd>{positionLabel || "—"}</dd>
          </div>
          <div>
            <dt>Sort order</dt>
            <dd>{entry.sortOrder || "—"}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{entry.live ? "Live" : "Hidden"}</dd>
          </div>
          <div>
            <dt>Cover</dt>
            <dd>{cover ? "Attached" : "Not set"}</dd>
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

function HistoryModal({ entry, onClose, onToast }) {
  if (!entry) return null;
  const rows = [
    {
      badge: "CURRENT",
      title: "Live version",
      author: entry.owner,
      date: entry.date,
      size: entry.size,
      current: true,
    },
  ];
  for (let n = (entry.versions || 1) - 1; n >= 1; n -= 1) {
    rows.push({
      badge: `V${n}`,
      title: `Version ${n}`,
      author: entry.owner,
      date: entry.date,
      size: entry.size,
      current: false,
    });
  }
  return (
    <div className="ua-cp-modal-backdrop" onClick={onClose} role="presentation">
      <div className="ua-cfg-rc-history" onClick={(event) => event.stopPropagation()} role="dialog">
        <div className="ua-cfg-rc-history__head">
          <div>
            <h3>{asCopyString(entry.title)}</h3>
            <p>Blog · owned by {asCopyString(entry.owner)} · newest first</p>
          </div>
          <button type="button" className="ua-cfg-mv-upload-modal__close" aria-label="Close" onClick={onClose}>×</button>
        </div>
        {rows.map((row) => (
          <div key={row.badge} className={`ua-cfg-rc-history__row${row.current ? " is-current" : ""}`}>
            <span className={row.current ? "is-current" : "is-old"}>{row.badge}</span>
            <div>
              <strong>{row.title}</strong>
              <p>Uploaded by {asCopyString(row.author)} · {asCopyString(row.date)} · {asCopyString(row.size)}</p>
            </div>
            <div className="ua-cfg-rc-history__actions">
              <button type="button" className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm" onClick={() => onToast("Download started")}>Download</button>
              {row.current ? null : (
                <button type="button" className="ua-cfg-btn ua-cfg-btn--ghost ua-cfg-btn--sm" onClick={() => onToast("Version restored")}>Restore</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DynamicBlogsSection({ editor, setEditor, posts, setPosts, gallery, setGallery, onToast }) {
  const POSTS_PAGE_SIZE = 20;
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewingId, setViewingId] = useState(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: POSTS_PAGE_SIZE, total: 0, pages: 1 });
  const [history, setHistory] = useState(null);
  const [draft, setDraft] = useState({ title: "", description: "", coverFile: null, coverPreview: "", position: "last" });
  const [search, setSearch] = useState("");
  const [owner, setOwner] = useState("All owners");
  const [selected, setSelected] = useState([]);
  const [cropPending, setCropPending] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const coverInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const postCoverInputRef = useRef(null);
  const postCoverTargetRef = useRef(null);

  const galleryOwners = useMemo(() => galleryOwnersFromMedia(gallery), [gallery]);

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
    setViewingId((current) => ((result?.items || []).some((entry) => entry.id === current) ? current : null));
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
      }, draft.coverFile ? { coverFile: draft.coverFile } : {});
      if (!created) throw new Error("Failed to add post");
      setPage(1);
      await loadPosts(1);
      if (draft.coverPreview?.startsWith("blob:")) URL.revokeObjectURL(draft.coverPreview);
      setDraft({ title: "", description: "", coverFile: null, coverPreview: "", position: "last" });
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
      const saved = await persistPost(target.id, {}, { coverFile: file }, "Cover attached");
      if (!saved) return;
    }
  }

  async function toggleGalleryLive(entry) {
    const live = !entry.live;
    setGallery((prev) => prev.map((row) => (row.id === entry.id ? { ...row, live } : row)));
    setBusy(true);
    try {
      const saved = await adminUpdateBlogMedia(null, entry.id, { live });
      if (saved) {
        setGallery((prev) => prev.map((row) => (row.id === entry.id ? saved : row)));
      }
    } catch (error) {
      setGallery((prev) => prev.map((row) => (row.id === entry.id ? { ...row, live: entry.live } : row)));
      onToast(error?.message || "Could not update media");
    } finally {
      setBusy(false);
    }
  }

  async function deleteGalleryEntry(entry) {
    setBusy(true);
    try {
      await adminDeleteBlogMedia(null, entry.id);
      setGallery((prev) => prev.filter((row) => row.id !== entry.id));
      setSelected((prev) => prev.filter((id) => id !== entry.id));
      onToast("Asset deleted");
    } catch (error) {
      onToast(error?.message || "Could not delete media");
    } finally {
      setBusy(false);
    }
  }

  const liveCount = posts.filter((entry) => entry.live).length;
  const viewing = posts.find((entry) => entry.id === viewingId) || null;
  const viewingIndex = viewing ? posts.findIndex((entry) => entry.id === viewing.id) : -1;
  const filtered = useMemo(() => gallery.filter((entry) => {
    const matchesSearch = asCopyString(entry.title).toLowerCase().includes(search.trim().toLowerCase());
    const matchesOwner = owner === "All owners" || entry.owner === owner;
    return matchesSearch && matchesOwner;
  }), [gallery, owner, search]);

  if (loading) {
    return <Panel title="Blogs" subtitle="Loading posts and gallery…" />;
  }

  return (
    <div className="ua-cfg-bl">
      <Panel title="Where this is live" subtitle="Turn it on for the app, the website, or both.">
        <div className="ua-cfg-bn-surfaces">
          <div className={`ua-cfg-bn-surface ua-cfg-bn-surface--app${editor.appOn ? " is-on" : ""}`}>
            <span>App {editor.appOn ? "Enabled" : "Disabled"}</span>
            <button type="button" className={`ua-toggle ua-toggle--sm${editor.appOn ? " ua-toggle--on" : ""}`} aria-pressed={editor.appOn} disabled={busy} onClick={() => patchConfig({ appOn: !editor.appOn })}>
              <span className="ua-toggle__knob" />
            </button>
          </div>
          <div className={`ua-cfg-bn-surface ua-cfg-bn-surface--web${editor.webOn ? " is-on" : ""}`}>
            <span>Web {editor.webOn ? "Enabled" : "Disabled"}</span>
            <button type="button" className={`ua-toggle ua-toggle--sm${editor.webOn ? " ua-toggle--on" : ""}`} aria-pressed={editor.webOn} disabled={busy} onClick={() => patchConfig({ webOn: !editor.webOn })}>
              <span className="ua-toggle__knob" />
            </button>
          </div>
        </div>
      </Panel>

      <Panel
        title="Posts"
        subtitle={`Page ${pagination.page} · ${pagination.total} total · ${liveCount} of ${posts.length} live on this page`}
        actions={<button type="button" className="ua-cfg-rc-add" disabled={busy} onClick={() => setCreating(true)}>+ Add post</button>}
      >
        {creating ? (
          <section className="ua-cfg-rc-new">
            <div className="ua-cfg-rc-new__head">
              <strong><span aria-hidden="true">✎</span> New post</strong>
              <button type="button" className="ua-cfg-icon-btn" aria-label="Close" onClick={() => setCreating(false)}>×</button>
            </div>
            <div className="ua-cfg-rc-new__grid">
              <div className={`ua-cfg-vh-drop ua-cfg-vh-drop--cover${draft.coverPreview ? " is-on" : ""}`}>
                {draft.coverPreview ? <img className="ua-cfg-rc-drop-preview" src={draft.coverPreview} alt="" /> : <span aria-hidden="true">🖼</span>}
                <button type="button" className="ua-cfg-btn ua-cfg-btn--ghost ua-cfg-btn--sm" disabled={busy} onClick={() => coverInputRef.current?.click()}>
                  {draft.coverPreview ? "Replace cover" : "Cover image"}
                </button>
                <input ref={coverInputRef} type="file" accept="image/*" hidden onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) openCrop(file, { type: "draft" });
                }} />
              </div>
              <div className="ua-cfg-rc-new__fields">
                <input className="ua-cfg-vh-input" placeholder="Headline · e.g. What your HbA1c really tells you" value={asCopyString(draft.title)} disabled={busy} onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))} />
                <textarea className="ua-cfg-tf-story" rows={3} placeholder="Short description shown under the headline..." value={asCopyString(draft.description)} disabled={busy} onChange={(event) => setDraft((prev) => ({ ...prev, description: event.target.value }))} />
              </div>
              <div className="ua-cfg-bl-new-foot">
                <select className="ua-cfg-vh-input ua-cfg-bl-pos" value={draft.position} disabled={busy} onChange={(event) => setDraft((prev) => ({ ...prev, position: event.target.value }))}>
                  <option value="featured">Featured (top)</option>
                  <option value="2">Position 2</option>
                  <option value="3">Position 3</option>
                  <option value="last">Last</option>
                </select>
                <button type="button" className="ua-cfg-btn ua-cfg-btn--primary" disabled={busy} onClick={addPost}>Add post</button>
              </div>
            </div>
          </section>
        ) : null}

        <div className="ua-cfg-rc-list">
          {posts.map((entry, index) => {
            const editing = editingId === entry.id;
            return (
              <article key={entry.id} className="ua-cfg-rc-item">
                <button type="button" className={`ua-cfg-rc-cover${entry.cover ? " is-on" : ""}`} disabled={busy} onClick={() => {
                  postCoverTargetRef.current = entry.id;
                  postCoverInputRef.current?.click();
                }}>
                  {entry.coverImage ? <img className="ua-cfg-rc-drop-preview" src={entry.coverImage} alt="" /> : <span aria-hidden="true">🖼</span>}
                  <em>Cover</em>
                </button>
                <div className="ua-cfg-rc-item__body">
                  <div className="ua-cfg-rc-item__row">
                    <span className="ua-cfg-bn-live__handle" aria-hidden="true">⠿</span>
                    <span className="ua-cfg-rc-pill ua-cfg-bl-flag">{postLabel(index)}</span>
                    {editing ? (
                      <input className="ua-cfg-vh-input ua-cfg-rc-title" value={asCopyString(entry.title)} disabled={busy} onChange={(event) => updateLocalPost(entry.id, { title: event.target.value })} />
                    ) : (
                      <strong>{asCopyString(entry.title)}</strong>
                    )}
                    <span className={`ua-cfg-faq__shown${entry.live ? " is-on" : ""}`}>{entry.live ? "LIVE" : "HIDDEN"}</span>
                    <button type="button" className={`ua-toggle ua-toggle--sm${entry.live ? " ua-toggle--on" : ""}`} aria-pressed={entry.live} disabled={busy} onClick={() => togglePostLive(entry)}>
                      <span className="ua-toggle__knob" />
                    </button>
                    <button type="button" className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm" disabled={busy} onClick={() => setViewingId(entry.id)}>View</button>
                    {editing ? (
                      <button type="button" className="ua-cfg-btn ua-cfg-btn--primary ua-cfg-btn--sm" disabled={busy} onClick={() => saveEditedPost(entry)}>Save</button>
                    ) : (
                      <button type="button" className="ua-cfg-cr-link ua-cfg-cr-link--modify" disabled={busy} onClick={() => { setViewingId(null); setEditingId(entry.id); }}>Edit</button>
                    )}
                    <button type="button" className="ua-cfg-icon-btn" aria-label="Move up" disabled={busy || index === 0} onClick={() => movePost(index, -1)}>↑</button>
                    <button type="button" className="ua-cfg-icon-btn" aria-label="Move down" disabled={busy || index === posts.length - 1} onClick={() => movePost(index, 1)}>↓</button>
                    <button type="button" className="ua-cfg-icon-btn" aria-label="Delete" disabled={busy} onClick={() => setPendingDelete({ kind: "post", entry })}>×</button>
                  </div>
                  {editing ? (
                    <textarea className="ua-cfg-tf-story" rows={2} value={asCopyString(entry.description)} disabled={busy} onChange={(event) => updateLocalPost(entry.id, { description: event.target.value })} />
                  ) : (
                    <p>{asCopyString(entry.description)}</p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
        <ListPagination
          page={pagination.page}
          pages={pagination.pages}
          total={pagination.total}
          pageSize={POSTS_PAGE_SIZE}
          onPageChange={setPage}
          label="Blog posts pagination"
        />
      </Panel>

      <input ref={galleryInputRef} type="file" accept="image/*" hidden onChange={(event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (file) openCrop(file, { type: "gallery" });
      }} />
      <input ref={postCoverInputRef} type="file" accept="image/*" hidden onChange={(event) => {
        const file = event.target.files?.[0];
        const id = postCoverTargetRef.current;
        event.target.value = "";
        if (file && id) openCrop(file, { type: "post", id });
      }} />

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
      <BlogPostViewModal
        entry={viewing}
        positionLabel={viewingIndex >= 0 ? postLabel(viewingIndex) : ""}
        onClose={() => setViewingId(null)}
        onEdit={(id) => {
          setCreating(false);
          setEditingId(id);
        }}
      />
      <HistoryModal entry={history} onClose={() => setHistory(null)} onToast={onToast} />
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
