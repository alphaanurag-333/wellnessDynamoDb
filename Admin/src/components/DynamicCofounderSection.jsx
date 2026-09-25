import { useCallback, useEffect, useMemo, useState } from "react";
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
import { useMediaPicker } from "./useMediaPicker.jsx";

const EMPTY_DRAFT = {
  name: "",
  message: "",
  type: "none",
  ytLink: "",
};

const CF_CROP_WIDTH = 400;
const CF_CROP_HEIGHT = 400;
const CF_CROP_RATIO = "1:1";
const CF_COVER_WIDTH = 840;
const CF_COVER_HEIGHT = 480;
const CF_COVER_RATIO = "16:9";
const CF_COVER_SIZE_LABEL = "Cover: 840×480";

const VIDEO_TYPE_OPTIONS = [
  { value: "none", label: "No video" },
  { value: "link", label: "YouTube link" },
  { value: "video", label: "Uploaded video" },
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

function PortraitPicker({ previewUrl, disabled, onPick, onRemove }) {
  const filled = Boolean(previewUrl);

  return (
    <div className="ua-cfg-cf-portrait-wrap">
      <div className="ua-cfg-rc-cover-drop-wrap">
        <div className="ua-cfg-rc-cover-drop-frame">
          <button
            type="button"
            className={`ua-cfg-rc-cover-drop ua-cfg-cf-portrait-drop${filled ? " is-on" : ""}`}
            disabled={disabled}
            aria-label={filled ? "Replace portrait photo" : "Add portrait photo"}
            onClick={() => onPick?.()}
          >
            {filled ? <img className="ua-cfg-rc-drop-preview" src={previewUrl} alt="" /> : <span aria-hidden="true">👤</span>}
            {!filled ? (
              <>
                <em>Add photo</em>
                <span className="ua-cfg-cf-portrait-drop__size">{CF_CROP_WIDTH}px × {CF_CROP_HEIGHT}px</span>
              </>
            ) : (
              <em>Replace</em>
            )}
          </button>
          {filled && onRemove ? (
            <button type="button" className="ua-cfg-rc-media-x" aria-label="Remove portrait photo" disabled={disabled} onClick={onRemove}>×</button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function CoverDrop({ previewUrl, disabled, onPick, onRemove }) {
  const filled = Boolean(previewUrl);

  return (
    <div className={`ua-cfg-cf-drop ua-cfg-cf-cover-wrap${filled ? " is-on" : ""}`}>
      {filled ? <img className="ua-cfg-cf-drop__img" src={previewUrl} alt="" /> : null}
      {!filled ? (
        <>
          <span className="ua-cfg-cf-drop__icon" aria-hidden="true">📷</span>
          <p className="ua-cfg-cf-drop__label">Cover image</p>
          <span className="ua-cfg-cf-drop__size">{CF_COVER_SIZE_LABEL} · 16:9</span>
        </>
      ) : null}
      <button
        type="button"
        className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm ua-cfg-cf-drop__btn"
        disabled={disabled}
        onClick={() => onPick?.()}
      >
        {filled ? "Replace photo" : "Upload photo"}
      </button>
      {filled && onRemove ? (
        <button type="button" className="ua-cfg-rc-media-x" aria-label="Remove cover image" disabled={disabled} onClick={onRemove}>×</button>
      ) : null}
    </div>
  );
}

function VideoDrop({ fileName, hasExisting, disabled, onPick, onRemove }) {
  const filled = Boolean(fileName || hasExisting);

  return (
    <div className={`ua-cfg-cf-drop ua-cfg-cf-video-drop${filled ? " is-on" : ""}`}>
      <span className="ua-cfg-cf-drop__icon" aria-hidden="true">▶</span>
      <p className="ua-cfg-cf-drop__label">{fileName || (hasExisting ? "Video attached" : "Video file")}</p>
      {!filled ? <span className="ua-cfg-cf-drop__size">Video: 1920×1080</span> : null}
      <button
        type="button"
        className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm ua-cfg-cf-drop__btn"
        disabled={disabled}
        onClick={() => onPick?.()}
      >
        {filled ? "Replace video" : "Upload video"}
      </button>
      {filled && onRemove ? (
        <button type="button" className="ua-cfg-rc-media-x" aria-label="Remove video" disabled={disabled} onClick={onRemove}>×</button>
      ) : null}
    </div>
  );
}

export function DynamicCofounderSection({ record, setRecord, onToast }) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [exists, setExists] = useState(false);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [videoFile, setVideoFile] = useState(null);
  const [videoName, setVideoName] = useState("");
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState("");
  const [cropPending, setCropPending] = useState(null);

  const { openPicker: openImagePicker, mediaPickerModal: imagePickerModal } = useMediaPicker({
    accept: "image",
    title: "Choose portrait photo",
    cropImages: false,
    cropWidth: CF_CROP_WIDTH,
    cropHeight: CF_CROP_HEIGHT,
    showFrameworks: false,
    onFiles: (file) => openCrop(file),
    onError: (error) => onToast?.(error?.message || "Could not attach media"),
  });

  const { openPicker: openCoverPicker, mediaPickerModal: coverPickerModal } = useMediaPicker({
    accept: "image",
    title: "Choose cover image",
    cropImages: false,
    cropWidth: CF_COVER_WIDTH,
    cropHeight: CF_COVER_HEIGHT,
    showFrameworks: false,
    onFiles: (file) => openCrop(file, "cover"),
    onError: (error) => onToast?.(error?.message || "Could not attach media"),
  });

  const { openPicker: openVideoPicker, mediaPickerModal: videoPickerModal } = useMediaPicker({
    accept: "video",
    title: "Choose video",
    onFiles: (file) => {
      if (!file) return;
      setVideoFile(file);
      setVideoName(file.name);
      onToast("Video attached — save to publish");
    },
    onError: (error) => onToast?.(error?.message || "Could not attach media"),
  });

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
      setCoverFile(null);
      setCoverPreview(next?.thumbnail || "");
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
    if (coverPreview?.startsWith("blob:")) URL.revokeObjectURL(coverPreview);
  }, [coverPreview]);

  useEffect(() => () => {
    if (cropPending?.previewUrl) URL.revokeObjectURL(cropPending.previewUrl);
  }, [cropPending?.previewUrl]);

  const mapped = useMemo(() => mapRow(record), [record]);
  const photo = imagePreview || mapped?.profileImage || "";
  const cover = coverPreview || mapped?.thumbnail || "";
  const embed = youtubeEmbedUrl(draft.ytLink);
  const cropIsCover = cropPending?.kind === "cover";
  const dirty = mapped ? (
    draft.name !== mapped.name
    || draft.message !== (mapped.description || "")
    || draft.type !== mapped.type
    || draft.ytLink !== (mapped.videoLink || "")
    || imageFile instanceof File
    || videoFile instanceof File
    || coverFile instanceof File
  ) : (
    Boolean(draft.name.trim())
    || Boolean(draft.message.trim())
    || draft.type !== "none"
    || Boolean(draft.ytLink.trim())
    || imageFile instanceof File
    || videoFile instanceof File
    || coverFile instanceof File
  );

  function closeCrop() {
    if (cropPending?.previewUrl) URL.revokeObjectURL(cropPending.previewUrl);
    setCropPending(null);
  }

  function openCrop(file, kind = "portrait") {
    if (!String(file.type || "").startsWith("image/")) {
      onToast("Choose an image file");
      return;
    }
    if (cropPending?.previewUrl) URL.revokeObjectURL(cropPending.previewUrl);
    setCropPending({ kind, file, previewUrl: URL.createObjectURL(file) });
  }

  function clearDraftPhoto() {
    if (imagePreview?.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(mapped?.profileImage || "");
  }

  function clearDraftCover() {
    if (coverPreview?.startsWith("blob:")) URL.revokeObjectURL(coverPreview);
    setCoverFile(null);
    setCoverPreview(mapped?.thumbnail || "");
  }

  async function confirmCrop(croppedFile, cropError) {
    if (cropError) {
      onToast(cropError.message || "Failed to crop image");
      return;
    }
    if (!croppedFile) return;
    const kind = cropPending?.kind || "portrait";
    closeCrop();
    if (kind === "cover") {
      if (coverPreview?.startsWith("blob:")) URL.revokeObjectURL(coverPreview);
      setCoverFile(croppedFile);
      setCoverPreview(URL.createObjectURL(croppedFile));
      onToast("Cover cropped — save to publish");
      return;
    }
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
    if (coverFile instanceof File) files.thumbnailFile = coverFile;

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
      setCoverFile(null);
      if (saved?.profileImage) setImagePreview(saved.profileImage);
      setCoverPreview(saved?.thumbnail || "");
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
        title="Where this is live"
        subtitle="One switch controls visibility on both the app and website."
        actions={(
          <div className={`ua-cfg-cf-live${mapped?.live ? " is-on" : ""}`}>
            <span>{mapped?.live ? "Live" : "Hidden"}</span>
            <button
              type="button"
              className={`ua-toggle ua-toggle--sm${mapped?.live ? " ua-toggle--on" : ""}`}
              aria-pressed={Boolean(mapped?.live)}
              aria-label={mapped?.live ? "Hide co-founder message" : "Make co-founder message live"}
              disabled={loading || busy || !exists}
              onClick={toggleLive}
            >
              <span className="ua-toggle__knob" />
            </button>
          </div>
        )}
      />

      <div className="ua-cfg-cf-main">
        <Panel
          title="Co-Founder message"
          subtitle={loading ? "Loading…" : exists ? `Last updated ${formatRecipeDate(mapped?.updatedAt)}` : "No cofounder message yet — fill in the details below and save"}
        >
          <div className="ua-cfg-cf-photo">
            <PortraitPicker
              previewUrl={photo}
              disabled={loading || busy}
              onPick={() => openImagePicker()}
              onRemove={imageFile instanceof File ? clearDraftPhoto : null}
            />
            <div className="ua-cfg-cf-details">
              <label className="ua-cfg-cf-label" htmlFor="cf-name">Name</label>
              <input
                id="cf-name"
                className="ua-cfg-vh-input ua-cfg-cf-input"
                value={draft.name}
                disabled={loading || busy}
                onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
              />
              <label className="ua-cfg-cf-label" htmlFor="cf-message">Message</label>
              <textarea
                id="cf-message"
                className="ua-cfg-tf-story ua-cfg-cf-message"
                rows={10}
                value={draft.message}
                disabled={loading || busy}
                onChange={(event) => setDraft((prev) => ({ ...prev, message: event.target.value }))}
              />
            </div>
          </div>
        </Panel>

        <Panel title="Video" subtitle="Optional welcome video — YouTube link or uploaded file, plus a cover image.">
          <div className="ua-cfg-cf-video-box">
            <div className="ua-cfg-cf-video-field">
              <label className="ua-cfg-cf-label">Video type</label>
              <CfgSelect
                className="ua-cfg-cf-select"
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
            </div>

            {draft.type !== "none" ? (
              <div className="ua-cfg-cf-media">
                <div className="ua-cfg-cf-media__cover">
                  <span className="ua-cfg-cf-label">Cover image 840px x 480px</span>
                  <CoverDrop
                    previewUrl={cover}
                    disabled={loading || busy}
                    onPick={() => openCoverPicker()}
                    onRemove={coverFile instanceof File ? clearDraftCover : null}
                  />
                </div>
                <div className="ua-cfg-cf-media__source">
                  {draft.type === "link" ? (
                    <div className="ua-cfg-cf-video-field">
                      <label className="ua-cfg-cf-label" htmlFor="cf-yt">YouTube link</label>
                      <div className="ua-cfg-cf-drop ua-cfg-cf-link-drop">
                        <input
                          id="cf-yt"
                          type="url"
                          className="ua-cfg-vh-input ua-cfg-cf-input"
                          placeholder="https://youtube.com/watch?v=…"
                          value={draft.ytLink}
                          disabled={loading || busy}
                          onChange={(event) => setDraft((prev) => ({ ...prev, ytLink: event.target.value }))}
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <span className="ua-cfg-cf-label">Video file (25mb max)</span>
                      <VideoDrop
                        fileName={videoName}
                        hasExisting={Boolean(mapped?.video)}
                        disabled={loading || busy}
                        onPick={() => openVideoPicker()}
                        onRemove={videoFile instanceof File ? () => { setVideoFile(null); setVideoName(""); } : null}
                      />
                    </>
                  )}
                </div>
                {draft.type === "link" && embed ? (
                  <div className="ua-cfg-cf-video-preview">
                    <iframe title="Co-founder video preview" src={embed} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                  </div>
                ) : null}
                {draft.type === "video" && mapped?.video && !videoFile ? (
                  <div className="ua-cfg-cf-video-preview">
                    <video className="ua-cfg-rc-view__player" src={mapped.video} poster={cover || undefined} controls preload="metadata" />
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </Panel>
      </div>

      <div className="ua-cfg-cf-foot">
        <button
          type="button"
          className="ua-cfg-btn ua-cfg-btn--primary"
          disabled={loading || busy || !dirty}
          onClick={() => saveRecord()}
        >
          {busy ? "Saving…" : exists ? "Save changes" : "Create message"}
        </button>
      </div>

      <ImageCropModal
        open={Boolean(cropPending)}
        label={cropIsCover ? "video cover" : "co-founder portrait"}
        file={cropPending?.file}
        previewUrl={cropPending?.previewUrl || ""}
        busy={busy}
        defaultRatio={cropIsCover ? CF_COVER_RATIO : CF_CROP_RATIO}
        originalAspectCss={cropIsCover ? `${CF_COVER_WIDTH} / ${CF_COVER_HEIGHT}` : `${CF_CROP_WIDTH} / ${CF_CROP_HEIGHT}`}
        originalAspectNumber={cropIsCover ? CF_COVER_WIDTH / CF_COVER_HEIGHT : CF_CROP_WIDTH / CF_CROP_HEIGHT}
        cropWidth={cropIsCover ? CF_COVER_WIDTH : CF_CROP_WIDTH}
        cropHeight={cropIsCover ? CF_COVER_HEIGHT : CF_CROP_HEIGHT}
        backdropClassName="ua-cfg-cf-crop-modal"
        onClose={closeCrop}
        onConfirm={confirmCrop}
      />

      {imagePickerModal}
      {coverPickerModal}
      {videoPickerModal}
    </div>
  );
}
