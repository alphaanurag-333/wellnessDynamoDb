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

function videoPreviewSrc(url) {
  const src = String(url || "").trim();
  if (!src) return "";
  // Seek slightly so browsers paint a visible frame instead of a blank poster.
  return src.includes("#") ? src : `${src}#t=0.1`;
}

function VideoThumb({ url, className = "ua-media-picker__video" }) {
  const [failed, setFailed] = useState(false);
  const src = videoPreviewSrc(url);

  if (!src || failed) {
    return (
      <span className="ua-cfg-gl-card__icon-tile is-video" aria-hidden="true">
        <MediaTypeIcon type="video" />
      </span>
    );
  }

  return (
    <video
      className={className}
      src={src}
      muted
      playsInline
      preload="metadata"
      onError={() => setFailed(true)}
    />
  );
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
        ) : type === "video" && asset.url ? (
          <VideoThumb url={asset.url} />
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
  cropWidth,
  cropHeight,
  showFrameworks = true,
  sizeHint = "",
  /** Saved on new uploads (e.g. "Banner" for banner config gallery). */
  uploadCategory = "",
  /** When set, library tab only lists assets in this category. */
  libraryCategory = "",
}) {
  const fileInputRef = useRef(null);
  const cropPendingRef = useRef(null);
  const confirmingRef = useRef(false);
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
  const [confirming, setConfirming] = useState(false);

  cropPendingRef.current = cropPending;
  confirmingRef.current = confirming;

  const selectedAssets = useMemo(() => {
    const byId = new Map(items.map((item) => [item.id, item]));
    for (const upload of uploads) {
      if (upload.asset) byId.set(upload.asset.id, upload.asset);
    }
    return selected.map((id) => byId.get(id)).filter(Boolean);
  }, [items, uploads, selected]);

  const confirmingLabel = useMemo(() => {
    if (selectedAssets.some((asset) => asset.type === "video")) {
      return "Preparing video…";
    }
    if (selectedAssets.some((asset) => asset.type === "audio")) {
      return "Preparing audio…";
    }
    return "Preparing media…";
  }, [selectedAssets]);

  const showTypeFilter = accept === "mixed" || accept === "all" || Array.isArray(accept);
  const uiLocked = cropBusy || confirming;

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
    setConfirming(false);

    const onKey = (event) => {
      if (event.key !== "Escape") return;
      if (confirmingRef.current) return;
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
          category: String(libraryCategory || "").trim() || undefined,
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
  }, [open, tab, token, search, owner, typeFilter, fromDate, toDate, accept, libraryCategory]);

  function toggleSelect(id) {
    if (confirming) return;
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
          category: String(uploadCategory || "").trim() || undefined,
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
    if (!selectedAssets.length || cropPending || confirming) return;
    const picked = multiple ? selectedAssets : selectedAssets.slice(0, 1);
    setConfirming(true);
    setError("");
    try {
      await onConfirm?.(picked);
      onClose?.();
    } catch (err) {
      setError(err?.message || "Could not use selected media");
      setConfirming(false);
    }
  }

  function requestClose() {
    if (confirming) return;
    onClose?.();
  }

  if (!open) return null;

  return (
    <>
      {cropPending ? null : (
      <div
        className="ua-cp-modal-backdrop ua-cp-modal-backdrop--drawer"
        onClick={requestClose}
        role="presentation"
      >
        <div
          className={`ua-media-picker${confirming ? " is-confirming" : ""}`}
          onClick={(event) => event.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-busy={confirming || undefined}
          aria-label={title}
        >
          {confirming ? (
            <div className="ua-media-picker__busy" role="status" aria-live="polite">
              <span className="ua-media-picker__busy-spinner" aria-hidden="true" />
              <strong>{confirmingLabel}</strong>
              <span>Large files can take a moment — please wait</span>
            </div>
          ) : null}

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
              onClick={requestClose}
              disabled={uiLocked}
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
              disabled={uiLocked}
            >
              Upload files
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "library"}
              className={`ua-media-picker__tab${tab === "library" ? " is-active" : ""}`}
              onClick={() => setTab("library")}
              disabled={uiLocked}
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
                  if (uiLocked) return;
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(event) => {
                  if (uiLocked) {
                    event.preventDefault();
                    return;
                  }
                  onDrop(event);
                }}
              >
                <strong>Drag & drop files here</strong>
                <span>or browse from your device</span>
                {sizeHint ? (
                  <span className="ua-media-picker__size-hint">Recommended size: {sizeHint}</span>
                ) : null}
                <button
                  type="button"
                  className="ua-cfg-btn ua-cfg-btn--primary ua-cfg-btn--sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={Boolean(cropPending) || uiLocked}
                >
                  Browse files
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple={multiple}
                  accept={acceptAttr(accept)}
                  hidden
                  disabled={uiLocked}
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
                  disabled={uiLocked}
                  onChange={(event) => setSearch(event.target.value)}
                />
                <select
                  className="ua-cfg-mv-gallery__select"
                  value={owner}
                  disabled={uiLocked}
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
                    disabled={uiLocked}
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
                  disabled={uiLocked}
                  onChange={(event) => setFromDate(event.target.value)}
                />
                <input
                  type="date"
                  className="ua-cfg-mv-gallery__date"
                  aria-label="To date"
                  value={toDate}
                  disabled={uiLocked}
                  onChange={(event) => setToDate(event.target.value)}
                />
              </div>

              <div className="ua-media-picker__count">
                {loading ? "Loading…" : `${items.length} item${items.length === 1 ? "" : "s"}`}
                {selected.length ? ` · ${selected.length} selected` : ""}
              </div>

              <div className={`ua-media-picker__grid${loading ? " is-loading" : ""}`}>
                {loading && !items.length ? (
                  <div className="ua-media-picker__library-busy" role="status" aria-live="polite">
                    <span className="ua-media-picker__busy-spinner" aria-hidden="true" />
                    <span>Loading media library…</span>
                  </div>
                ) : null}
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
            <button
              type="button"
              className="ua-cfg-btn ua-cfg-btn--outline"
              onClick={requestClose}
              disabled={uiLocked}
            >
              Cancel
            </button>
            <button
              type="button"
              className="ua-cfg-btn ua-cfg-btn--primary"
              disabled={!selectedAssets.length || Boolean(cropPending) || uiLocked}
              onClick={handleConfirm}
            >
              {confirming
                ? confirmingLabel
                : `Use selected${selectedAssets.length ? ` (${selectedAssets.length})` : ""}`}
            </button>
          </div>
        </div>
      </div>
      )}

      <ImageCropModal
        open={Boolean(cropPending)}
        label="gallery image"
        file={cropPending?.file}
        previewUrl={cropPending?.previewUrl || ""}
        busy={cropBusy}
        showFrameworks={showFrameworks && !cropWidth}
        backdropClassName={cropWidth ? "ua-cfg-tf-crop-modal ua-media-picker-crop-backdrop" : "ua-media-picker-crop-backdrop"}
        defaultRatio={cropWidth && cropHeight ? (cropWidth === cropHeight ? "1:1" : "4:5") : "Original"}
        originalAspectCss={cropWidth && cropHeight ? `${cropWidth} / ${cropHeight}` : "4 / 3"}
        originalAspectNumber={cropWidth && cropHeight ? cropWidth / cropHeight : 4 / 3}
        cropWidth={cropWidth}
        cropHeight={cropHeight}
        onClose={discardCurrentCrop}
        onConfirm={confirmCroppedUpload}
      />
    </>
  );
}
