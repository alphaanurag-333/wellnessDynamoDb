import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  adminCreateCofounderMessage,
  adminGetCofounderMessage,
  adminUpdateCofounderMessage,
  editorFromCofounder,
  mapCofounderMessage,
} from "../api/cofounderMessageApi.js";
import { formatRecipeDate, youtubeEmbedUrl } from "../data/recipesConfigData.js";
import { ImageCropModal } from "./ImageCropModal.jsx";
import { CfgSelect } from "./shared.jsx";

const EMPTY_DRAFT = {
  name: "",
  message: "",
  type: "none",
  ytLink: "",
};

const VIDEO_TYPE_OPTIONS = [
  { value: "none", label: "No video" },
  { value: "link", label: "YouTube link" },
  { value: "video", label: "Uploaded video" },
];

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

function PortraitPicker({ previewUrl, disabled, onPick, onRemove }) {
  const inputRef = useRef(null);
  return (
    <div className="ua-cfg-cf-portrait-wrap">
      <div className="ua-cfg-rc-cover-drop-wrap">
        <div className="ua-cfg-rc-cover-drop-frame">
          <button
            type="button"
            className={`ua-cfg-rc-cover-drop ua-cfg-cf-portrait-drop${previewUrl ? " is-on" : ""}`}
            disabled={disabled}
            aria-label={previewUrl ? "Replace portrait photo" : "Add portrait photo"}
            onClick={() => inputRef.current?.click()}
          >
            {previewUrl ? <img className="ua-cfg-rc-drop-preview" src={previewUrl} alt="" /> : <span aria-hidden="true">👤</span>}
            <em>{previewUrl ? "Replace" : "Add photo"}</em>
          </button>
          {previewUrl && onRemove ? (
            <button type="button" className="ua-cfg-rc-media-x" aria-label="Remove portrait photo" disabled={disabled} onClick={onRemove}>×</button>
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
    </div>
  );
}

export function DynamicCofounderSection({ record, setRecord, onToast, onOpenPreview }) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [exists, setExists] = useState(false);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [videoFile, setVideoFile] = useState(null);
  const [videoName, setVideoName] = useState("");
  const [cropPending, setCropPending] = useState(null);
  const videoInputRef = useRef(null);

  const syncDraft = useCallback((row) => {
    const mapped = mapCofounderMessage(row);
    if (!mapped) {
      setDraft(EMPTY_DRAFT);
      setExists(false);
      return;
    }
    setExists(true);
    setDraft({
      name: mapped.name,
      message: mapped.message,
      type: mapped.type,
      ytLink: mapped.ytLink,
    });
  }, []);

  function mapRow(row) {
    return row ? editorFromCofounder(row) : null;
  }

  const loadRecord = useCallback(async () => {
    setLoading(true);
    try {
      const next = await adminGetCofounderMessage(null);
      setRecord(next);
      setExists(Boolean(next));
      syncDraft(next);
      setImagePreview(next?.profileImage || "");
      setImageFile(null);
      setVideoFile(null);
      setVideoName("");
    } catch (error) {
      setRecord(null);
      setExists(false);
      setDraft(EMPTY_DRAFT);
      onToast(error?.message || "Could not load cofounder message");
    } finally {
      setLoading(false);
    }
  }, [onToast, setRecord, syncDraft]);

  useEffect(() => {
    loadRecord();
  }, [loadRecord]);

  useEffect(() => () => {
    if (imagePreview?.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
  }, [imagePreview]);

  useEffect(() => () => {
    if (cropPending?.previewUrl) URL.revokeObjectURL(cropPending.previewUrl);
  }, [cropPending?.previewUrl]);

  const mapped = useMemo(() => mapRow(record), [record]);
  const photo = imagePreview || mapped?.profileImage || "";
  const embed = youtubeEmbedUrl(draft.ytLink);
  const dirty = mapped ? (
    draft.name !== mapped.name
    || draft.message !== (mapped.description || "")
    || draft.type !== mapped.type
    || draft.ytLink !== (mapped.videoLink || "")
    || imageFile instanceof File
    || videoFile instanceof File
  ) : (
    Boolean(draft.name.trim())
    || Boolean(draft.message.trim())
    || draft.type !== "none"
    || Boolean(draft.ytLink.trim())
    || imageFile instanceof File
    || videoFile instanceof File
  );

  function closeCrop() {
    if (cropPending?.previewUrl) URL.revokeObjectURL(cropPending.previewUrl);
    setCropPending(null);
  }

  function openCrop(file) {
    if (!String(file.type || "").startsWith("image/")) {
      onToast("Choose an image file");
      return;
    }
    if (cropPending?.previewUrl) URL.revokeObjectURL(cropPending.previewUrl);
    setCropPending({ file, previewUrl: URL.createObjectURL(file) });
  }

  function clearDraftPhoto() {
    if (imagePreview?.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(mapped?.profileImage || "");
  }

  async function confirmCrop(croppedFile, cropError) {
    if (cropError) {
      onToast(cropError.message || "Failed to crop image");
      return;
    }
    if (!croppedFile) return;
    closeCrop();
    if (imagePreview?.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    setImageFile(croppedFile);
    setImagePreview(URL.createObjectURL(croppedFile));
    onToast("Portrait cropped — save to publish");
  }

  async function saveRecord() {
    const name = draft.name.trim();
    const message = draft.message.trim();
    if (!name) {
      onToast("Add the co-founder name");
      return null;
    }
    if (!message) {
      onToast("Add the co-founder message");
      return null;
    }
    const profile = imageFile instanceof File ? imageFile : mapped?.profileImage;
    if (!profile) {
      onToast("Add a portrait photo");
      return null;
    }
    if (draft.type === "link" && !draft.ytLink.trim()) {
      onToast("Add a YouTube link or switch video type");
      return null;
    }
    if (draft.type === "video" && !(videoFile instanceof File) && !mapped?.video) {
      onToast("Upload a video file or switch video type");
      return null;
    }

    const fields = {
      name,
      message,
      type: draft.type,
      ytLink: draft.type === "link" ? draft.ytLink.trim() : "",
    };

    const files = {};
    if (imageFile instanceof File) files.profileImage = imageFile;
    if (videoFile instanceof File) files.videoFile = videoFile;

    setBusy(true);
    try {
      const saved = exists
        ? await adminUpdateCofounderMessage(null, fields, files)
        : await adminCreateCofounderMessage(null, { ...fields, live: true, status: "active" }, files);
      setRecord(saved);
      setExists(true);
      syncDraft(saved);
      setImageFile(null);
      setVideoFile(null);
      setVideoName("");
      if (saved?.profileImage) setImagePreview(saved.profileImage);
      onToast("Co-founder message saved");
      return saved;
    } catch (error) {
      onToast(error?.message || "Could not save cofounder message");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function toggleLive() {
    if (!exists) {
      onToast("Save the cofounder message first");
      return;
    }
    const nextLive = !mapped?.live;
    setBusy(true);
    try {
      const saved = await adminUpdateCofounderMessage(null, { live: nextLive });
      setRecord(saved);
      syncDraft(saved);
      onToast(nextLive ? "Co-founder message is live" : "Co-founder message hidden");
    } catch (error) {
      onToast(error?.message || "Could not update status");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ua-cfg-cf">
      <Panel
        title="Co-Founder message"
        subtitle={loading ? "Loading…" : exists ? `Last updated ${formatRecipeDate(mapped?.updatedAt)}` : "No cofounder message yet — fill in the details below and save"}
        actions={(
          <div className="ua-cfg-panel__actions" style={{ display: "flex", gap: 8 }}>
            {onOpenPreview ? (
              <button type="button" className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm" disabled={loading || busy} onClick={onOpenPreview}>
                Preview
              </button>
            ) : null}
            <button type="button" className="ua-cfg-btn ua-cfg-btn--primary ua-cfg-btn--sm" disabled={loading || busy || !dirty} onClick={() => saveRecord()}>
              {busy ? "Saving…" : exists ? "Save changes" : "Create message"}
            </button>
          </div>
        )}
      >
        <div className="ua-cfg-bn-surfaces">
          <div className={`ua-cfg-bn-surface ua-cfg-bn-surface--app${mapped?.live ? " is-on" : ""}`}>
            <span>{mapped?.live ? "Live on site" : "Hidden"}</span>
            <button
              type="button"
              className={`ua-toggle ua-toggle--sm${mapped?.live ? " ua-toggle--on" : ""}`}
              aria-pressed={Boolean(mapped?.live)}
              disabled={loading || busy || !exists}
              onClick={toggleLive}
            >
              <span className="ua-toggle__knob" />
            </button>
          </div>
          <span className="ua-cfg-panel__sub">Shown on the About page when status is live.</span>
        </div>
      </Panel>

      <Panel title="Profile" subtitle="Portrait sits beside the message on the About page, shown at its original aspect ratio.">
        <div className="ua-cfg-cf-photo">
          <PortraitPicker
            previewUrl={photo}
            disabled={loading || busy}
            onPick={openCrop}
            onRemove={imageFile instanceof File ? clearDraftPhoto : null}
          />
          <div className="ua-cfg-cf-details">
            <label className="ua-cfg-cf-label" htmlFor="cf-name">Name</label>
            <input
              id="cf-name"
              className="ua-cfg-vh-input"
              value={draft.name}
              disabled={loading || busy}
              onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
            />
            <label className="ua-cfg-cf-label" htmlFor="cf-message">Message</label>
            <textarea
              id="cf-message"
              className="ua-cfg-tf-story"
              rows={10}
              value={draft.message}
              disabled={loading || busy}
              onChange={(event) => setDraft((prev) => ({ ...prev, message: event.target.value }))}
            />
          </div>
        </div>
      </Panel>

      <Panel title="Video" subtitle="Optional welcome video — YouTube link or uploaded file.">
        <div className="ua-cfg-cf-video-box">
          <label className="ua-cfg-cf-label">Video type</label>
          <CfgSelect
            options={VIDEO_TYPE_OPTIONS}
            value={draft.type}
            disabled={loading || busy}
            ariaLabel="Video type"
            onChange={(value) => setDraft((prev) => ({
              ...prev,
              type: value,
              ytLink: value === "link" ? prev.ytLink : "",
            }))}
          />
          {draft.type === "link" ? (
            <>
              <label className="ua-cfg-cf-label" htmlFor="cf-yt">YouTube link</label>
              <input
                id="cf-yt"
                type="url"
                className="ua-cfg-vh-input"
                placeholder="https://youtube.com/watch?v=…"
                value={draft.ytLink}
                disabled={loading || busy}
                onChange={(event) => setDraft((prev) => ({ ...prev, ytLink: event.target.value }))}
              />
              {embed ? (
                <div className="ua-cfg-rc-view__embed">
                  <iframe title="Co-founder video preview" src={embed} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                </div>
              ) : null}
            </>
          ) : null}
          {draft.type === "video" ? (
            <>
              <div className="ua-cfg-cf-video-row">
                <span className="ua-cfg-vh-thumb" aria-hidden="true">▶</span>
                <strong>{videoName || (mapped?.video ? "Current video attached" : "No video yet")}</strong>
                <button type="button" className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm" disabled={loading || busy} onClick={() => videoInputRef.current?.click()}>
                  {mapped?.video || videoFile ? "Replace video" : "Upload video"}
                </button>
              </div>
              {mapped?.video && !videoFile ? (
                <video className="ua-cfg-rc-view__player" src={mapped.video} controls preload="metadata" />
              ) : null}
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                hidden
                disabled={loading || busy}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file) return;
                  setVideoFile(file);
                  setVideoName(file.name);
                  onToast("Video attached — save to publish");
                }}
              />
            </>
          ) : null}
        </div>
      </Panel>

      <ImageCropModal
        open={Boolean(cropPending)}
        label="co-founder portrait"
        file={cropPending?.file}
        previewUrl={cropPending?.previewUrl || ""}
        busy={busy}
        defaultRatio="Original"
        originalAspectCss="auto"
        originalAspectNumber={0}
        onClose={closeCrop}
        onConfirm={confirmCrop}
      />
    </div>
  );
}
