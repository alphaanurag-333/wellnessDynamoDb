import { useEffect, useMemo, useRef, useState } from "react";
import {
  adminCreateMediaAsset,
  adminListMediaAssets,
  galleryOwnersFromAssets,
} from "../api/mediaAssetApi.js";
import { MediaTypeIcon } from "./GalleryMediaIcons.jsx";
import { ImageCropModal } from "./ImageCropModal.jsx";

function acceptAttr(accept) {
  if (accept === "image") return "image/*";
  if (accept === "video") return "video/*";
  if (accept === "audio") return "audio/*";
  return "image/*,video/*,audio/*";
}

function typeFromFile(file) {
  const mime = String(file?.type || "");
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("image/")) return "image";
  return "image";
}

function fileMatchesAccept(file, accept) {
  if (!accept || accept === "mixed" || accept === "all") return true;
  const type = typeFromFile(file);
  if (Array.isArray(accept)) return accept.includes(type);
  return type === accept;
}

function galleryCategoryClass(category) {
  return String(category || "media")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "media";
}

function MediaCard({ asset, selected, onToggle }) {
  const type = asset.type === "audio" || asset.type === "video" ? asset.type : "image";
  return (
    <article className={`ua-media-picker__card${selected ? " is-selected" : ""}`}>
      <div className={`ua-media-picker__thumb is-${type}`}>
        <label className="ua-media-picker__check">
          <input type="checkbox" checked={selected} onChange={onToggle} />
        </label>
        {type === "image" && asset.url ? (
          <img src={asset.url} alt="" />
        ) : (
          <span className={`ua-cfg-gl-card__icon-tile is-${type}`} aria-hidden="true">
            <MediaTypeIcon type={type} />
          </span>
        )}
        {asset.category ? (
          <span className={`ua-media-picker__badge is-${galleryCategoryClass(asset.category)}`}>
            {asset.category}
          </span>
        ) : (
          <span className={`ua-media-picker__badge is-${type}`}>{type}</span>
        )}
      </div>
      <div className="ua-media-picker__body">
        <strong>{asset.title}</strong>
        <span>
          {asset.owner} · {asset.date}
        </span>
        <span>
          {asset.size || "—"}
          {asset.duration ? ` · ${asset.duration}` : ""}
        </span>
      </div>
    </article>
  );
}

function makeUploadRow(file) {
  return {
    id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
    name: file.name,
    progress: 0,
    status: "uploading",
    asset: null,
    error: "",
  };
}

export function MediaPickerModal({
  open,
  onClose,
  onConfirm,
  accept = "mixed",
  multiple = false,
  title = "Choose media",
  token = null,
  cropImages = true,
}) {
  const fileInputRef = useRef(null);
  const cropPendingRef = useRef(null);
  const [tab, setTab] = useState("upload");
  const [search, setSearch] = useState("");
  const [owner, setOwner] = useState("All owners");
  const [typeFilter, setTypeFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [items, setItems] = useState([]);
  const [owners, setOwners] = useState(["All owners"]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState([]);
  const [uploads, setUploads] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const [cropQueue, setCropQueue] = useState([]);
  const [cropPending, setCropPending] = useState(null);
  const [cropBusy, setCropBusy] = useState(false);

  cropPendingRef.current = cropPending;

  const selectedAssets = useMemo(() => {
    const byId = new Map(items.map((item) => [item.id, item]));
    for (const upload of uploads) {
      if (upload.asset) byId.set(upload.asset.id, upload.asset);
    }
    return selected.map((id) => byId.get(id)).filter(Boolean);
  }, [items, uploads, selected]);

  const showTypeFilter = accept === "mixed" || accept === "all" || Array.isArray(accept);

  function openNextCrop(queue) {
    const next = queue[0];
    if (!next) {
      setCropPending(null);
      setCropQueue([]);
      return;
    }
    setCropQueue(queue);
    setCropPending({
      file: next.file,
      rowId: next.rowId,
      previewUrl: URL.createObjectURL(next.file),
    });
  }

  function discardCurrentCrop() {
    const pending = cropPendingRef.current;
    if (pending?.previewUrl) URL.revokeObjectURL(pending.previewUrl);
    if (pending?.rowId) {
      setUploads((prev) =>
        prev.map((row) =>
          row.id === pending.rowId
            ? { ...row, progress: 100, status: "error", error: "Crop discarded" }
            : row
        )
      );
    }
    setCropQueue((queue) => {
      const rest = queue.slice(1);
      if (!rest.length) {
        setCropPending(null);
        return [];
      }
      setCropPending({
        file: rest[0].file,
        rowId: rest[0].rowId,
        previewUrl: URL.createObjectURL(rest[0].file),
      });
      return rest;
    });
  }

  useEffect(() => {
    if (!open) return undefined;
    setTab("upload");
    setSearch("");
    setOwner("All owners");
    setTypeFilter("all");
    setFromDate("");
    setToDate("");
    setSelected([]);
    setUploads([]);
    setError("");
    setDragOver(false);
    if (cropPendingRef.current?.previewUrl) {
      URL.revokeObjectURL(cropPendingRef.current.previewUrl);
    }
    setCropPending(null);
    setCropQueue([]);
    setCropBusy(false);

    const onKey = (event) => {
      if (event.key !== "Escape") return;
      if (cropPendingRef.current) {
        discardCurrentCrop();
        return;
      }
      onClose?.();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open || tab !== "library") return undefined;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const effectiveType =
          typeFilter !== "all"
            ? typeFilter
            : accept === "image" || accept === "video" || accept === "audio"
              ? accept
              : undefined;
        const { items: rows } = await adminListMediaAssets(token, {
          page: 1,
          limit: 100,
          search: search.trim() || undefined,
          owner: owner === "All owners" ? undefined : owner,
          type: effectiveType,
          from: fromDate || undefined,
          to: toDate || undefined,
        });
        if (cancelled) return;
        setItems(rows);
        setOwners(galleryOwnersFromAssets(rows));
      } catch (err) {
        if (!cancelled) setError(err?.message || "Failed to load media library");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    const timer = setTimeout(load, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, tab, token, search, owner, typeFilter, fromDate, toDate, accept]);

  function toggleSelect(id) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((entry) => entry !== id);
      if (!multiple) return [id];
      return [...prev, id];
    });
  }

  async function uploadOneFile(file, rowId) {
    setUploads((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, progress: 35, status: "uploading" } : row))
    );
    try {
      const asset = await adminCreateMediaAsset(
        token,
        {
          title: file.name.replace(/\.[^.]+$/, "") || file.name,
          type: typeFromFile(file),
          live: false,
        },
        { file }
      );
      setUploads((prev) =>
        prev.map((row) =>
          row.id === rowId ? { ...row, progress: 100, status: "done", asset } : row
        )
      );
      setItems((prev) => [asset, ...prev.filter((entry) => entry.id !== asset.id)]);
      setSelected((prev) => {
        if (!multiple) return [asset.id];
        return prev.includes(asset.id) ? prev : [asset.id, ...prev];
      });
      return asset;
    } catch (err) {
      setUploads((prev) =>
        prev.map((row) =>
          row.id === rowId
            ? { ...row, progress: 100, status: "error", error: err?.message || "Upload failed" }
            : row
        )
      );
      throw err;
    }
  }

  async function confirmCroppedUpload(croppedFile, cropError) {
    if (cropError) {
      setError(cropError.message || "Failed to crop image");
      return;
    }
    if (!croppedFile || !cropPending) return;
    const { rowId, previewUrl, file } = cropPending;
    setCropBusy(true);
    try {
      const namedFile = new File(
        [croppedFile],
        file?.name || croppedFile.name || "image.jpg",
        { type: croppedFile.type || "image/jpeg" }
      );
      await uploadOneFile(namedFile, rowId);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      const rest = cropQueue.slice(1);
      setCropPending(null);
      openNextCrop(rest);
    } catch (err) {
      setError(err?.message || "Upload failed");
    } finally {
      setCropBusy(false);
    }
  }

  async function uploadFiles(fileList) {
    const files = Array.from(fileList || []).filter((file) => fileMatchesAccept(file, accept));
    if (!files.length) {
      setError("No supported files selected");
      return;
    }
    setError("");

    const imageFiles = [];
    const directFiles = [];
    for (const file of files) {
      if (cropImages && typeFromFile(file) === "image") imageFiles.push(file);
      else directFiles.push(file);
    }

    const directRows = directFiles.map((file) => makeUploadRow(file));
    const imageRows = imageFiles.map((file) => ({
      ...makeUploadRow(file),
      status: "pending",
      progress: 0,
    }));
    if (directRows.length || imageRows.length) {
      setUploads((prev) => [...imageRows, ...directRows, ...prev]);
    }

    for (let i = 0; i < directFiles.length; i += 1) {
      try {
        await uploadOneFile(directFiles[i], directRows[i].id);
      } catch {
        /* row already marked */
      }
    }

    if (imageFiles.length) {
      const queue = imageFiles.map((file, index) => ({
        file,
        rowId: imageRows[index].id,
      }));
      openNextCrop(queue);
    }
  }

  function onDrop(event) {
    event.preventDefault();
    setDragOver(false);
    uploadFiles(event.dataTransfer?.files);
  }

  async function handleConfirm() {
    if (!selectedAssets.length || cropPending) return;
    const picked = multiple ? selectedAssets : selectedAssets.slice(0, 1);
    try {
      await onConfirm?.(picked);
      onClose?.();
    } catch (err) {
      setError(err?.message || "Could not use selected media");
    }
  }

  if (!open) return null;

  return (
    <>
      <div
        className="ua-cp-modal-backdrop ua-cp-modal-backdrop--drawer"
        onClick={cropPending ? undefined : onClose}
        role="presentation"
      >
        <div
          className="ua-media-picker"
          onClick={(event) => event.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <div className="ua-media-picker__head">
            <div>
              <h3 className="ua-media-picker__title">{title}</h3>
              <p className="ua-media-picker__sub">
                Upload new files or pick existing assets from the media library
              </p>
            </div>
            <button
              type="button"
              className="ua-media-picker__close"
              aria-label="Close"
              onClick={onClose}
              disabled={cropBusy}
            >
              ×
            </button>
          </div>

          <div className="ua-media-picker__tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "upload"}
              className={`ua-media-picker__tab${tab === "upload" ? " is-active" : ""}`}
              onClick={() => setTab("upload")}
            >
              Upload files
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "library"}
              className={`ua-media-picker__tab${tab === "library" ? " is-active" : ""}`}
              onClick={() => setTab("library")}
            >
              Media Library
            </button>
          </div>

          {error ? <p className="ua-media-picker__error">{error}</p> : null}

          {tab === "upload" ? (
            <div className="ua-media-picker__upload">
              <div
                className={`ua-media-picker__drop${dragOver ? " is-over" : ""}`}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
              >
                <strong>Drag & drop files here</strong>
                <span>or browse from your device</span>
                <button
                  type="button"
                  className="ua-cfg-btn ua-cfg-btn--primary ua-cfg-btn--sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={Boolean(cropPending) || cropBusy}
                >
                  Browse files
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple={multiple}
                  accept={acceptAttr(accept)}
                  hidden
                  onChange={(event) => {
                    uploadFiles(event.target.files);
                    event.target.value = "";
                  }}
                />
              </div>

              {uploads.length ? (
                <ul className="ua-media-picker__progress-list">
                  {uploads.map((row) => (
                    <li key={row.id} className={`ua-media-picker__progress-item is-${row.status}`}>
                      <div className="ua-media-picker__progress-meta">
                        <strong>{row.name}</strong>
                        <span>
                          {row.status === "done"
                            ? "Uploaded"
                            : row.status === "error"
                              ? row.error || "Failed"
                              : row.status === "pending"
                                ? "Waiting for crop…"
                                : `${row.progress}%`}
                        </span>
                      </div>
                      <div className="ua-media-picker__progress-bar">
                        <span style={{ width: `${row.progress}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : (
            <div className="ua-media-picker__library">
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
                {showTypeFilter ? (
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
                ) : null}
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

              <div className="ua-media-picker__count">
                {loading ? "Loading…" : `${items.length} item${items.length === 1 ? "" : "s"}`}
                {selected.length ? ` · ${selected.length} selected` : ""}
              </div>

              <div className="ua-media-picker__grid">
                {items.map((asset) => (
                  <MediaCard
                    key={asset.id}
                    asset={asset}
                    selected={selected.includes(asset.id)}
                    onToggle={() => toggleSelect(asset.id)}
                  />
                ))}
                {!loading && !items.length ? (
                  <p className="ua-media-picker__empty">No media found. Try uploading files first.</p>
                ) : null}
              </div>
            </div>
          )}

          <div className="ua-media-picker__foot">
            <button type="button" className="ua-cfg-btn ua-cfg-btn--outline" onClick={onClose} disabled={cropBusy}>
              Cancel
            </button>
            <button
              type="button"
              className="ua-cfg-btn ua-cfg-btn--primary"
              disabled={!selectedAssets.length || Boolean(cropPending) || cropBusy}
              onClick={handleConfirm}
            >
              Use selected{selectedAssets.length ? ` (${selectedAssets.length})` : ""}
            </button>
          </div>
        </div>
      </div>

      <ImageCropModal
        open={Boolean(cropPending)}
        label="gallery image"
        file={cropPending?.file}
        previewUrl={cropPending?.previewUrl || ""}
        busy={cropBusy}
        showFrameworks
        backdropClassName="ua-media-picker-crop-backdrop"
        defaultRatio="Original"
        originalAspectCss="4 / 3"
        originalAspectNumber={4 / 3}
        onClose={discardCurrentCrop}
        onConfirm={confirmCroppedUpload}
      />
    </>
  );
}
