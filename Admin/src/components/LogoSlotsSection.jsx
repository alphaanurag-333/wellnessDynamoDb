import { useCallback, useEffect, useState } from "react";
import { getAppLogos, saveAppLogo } from "../api/logoApi.js";
import {
  APK_LOGO_CROP_HEIGHT,
  APK_LOGO_CROP_WIDTH,
  createDefaultLogoSlots,
  LOGO_MAX_SIZE_MB,
  validateLogoFile,
} from "../data/logoConfigData.js";
import { ImageCropModal } from "./ImageCropModal.jsx";
import { useMediaPicker } from "./useMediaPicker.jsx";

function isApkLogoField(field) {
  return field === "apk_logo_light" || field === "apk_logo_dark";
}

function originalAspectCss(slot) {
  if (slot?.field === "favicon") return "1 / 1";
  if (isApkLogoField(slot?.field)) return `${APK_LOGO_CROP_WIDTH} / ${APK_LOGO_CROP_HEIGHT}`;
  return "240 / 64";
}

function originalAspectNumber(slot) {
  if (slot?.field === "favicon") return 1;
  if (isApkLogoField(slot?.field)) return APK_LOGO_CROP_WIDTH / APK_LOGO_CROP_HEIGHT;
  return 240 / 64;
}

function apkThumbStyle() {
  return { width: 72, height: Math.round(72 * (APK_LOGO_CROP_HEIGHT / APK_LOGO_CROP_WIDTH)) };
}

function Panel({ title, subtitle, children }) {
  return (
    <section className="ua-cfg-panel">
      <div className="ua-cfg-panel__head">
        <div>
          <h3 className="ua-cfg-panel__title">{title}</h3>
          {subtitle ? <p className="ua-cfg-panel__sub">{subtitle}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function LogoSlotCard({ slot, busy, onPick }) {
  return (
    <article className={`ua-cfg-lg-slot${slot.uploaded ? " is-filled" : ""}`}>
      <div className="ua-cfg-lg-slot__head">
        <div>
          <strong>{slot.title}</strong>
          <p>{slot.note}</p>
        </div>
        <span className="ua-cfg-lg-slot__size">{slot.size}</span>
      </div>
      <div className="ua-cfg-lg-slot__drop">
        {slot.uploaded ? (
          <>
            {slot.url ? (
              <img
                className="ua-cfg-lg-slot__thumb-img"
                src={slot.url}
                alt={slot.title}
                style={isApkLogoField(slot.field) ? apkThumbStyle() : undefined}
              />
            ) : (
              <span className="ua-cfg-lg-slot__thumb" aria-hidden="true">IR</span>
            )}
            <div className="ua-cfg-lg-slot__actions">
              <button
                type="button"
                className="ua-cfg-btn ua-cfg-btn--ghost ua-cfg-btn--sm"
                disabled={busy}
                onClick={() => onPick(slot)}
              >
                Replace
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            className="ua-cfg-btn ua-cfg-btn--primary ua-cfg-btn--sm"
            disabled={busy}
            onClick={() => onPick(slot)}
          >
            <span aria-hidden="true">🏷</span> Upload
          </button>
        )}
      </div>
    </article>
  );
}

export function LogoSlotsSection({ slots, setSlots, onToast }) {
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [pending, setPending] = useState(null);
  const previewUrl = pending?.previewUrl || "";

  const loadLogos = useCallback(async () => {
    setLoading(true);
    try {
      const next = await getAppLogos();
      setSlots(next);
    } catch (error) {
      onToast(error?.message || "Failed to load logos");
      setSlots(createDefaultLogoSlots());
    } finally {
      setLoading(false);
    }
  }, [onToast, setSlots]);

  useEffect(() => {
    loadLogos();
  }, [loadLogos]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function closePending() {
    if (pending?.previewUrl) URL.revokeObjectURL(pending.previewUrl);
    setPending(null);
  }

  function pickFile(slot, file) {
    const error = validateLogoFile(file);
    if (error) {
      onToast(error);
      return;
    }
    if (pending?.previewUrl) URL.revokeObjectURL(pending.previewUrl);
    setPending({
      slot,
      file,
      previewUrl: URL.createObjectURL(file),
    });
  }

  const { openPicker, mediaPickerModal } = useMediaPicker({
    accept: "image",
    title: "Choose logo",
    cropImages: false,
    onFiles: (file, slot) => {
      if (file && slot) pickFile(slot, file);
    },
    onError: (error) => onToast?.(error?.message || "Could not attach media"),
  });

  async function confirmUpload(croppedFile, cropError) {
    if (cropError) {
      onToast(cropError.message || "Failed to crop image");
      return;
    }
    if (!pending || !croppedFile) return;
    const { slot } = pending;
    setBusyId(slot.field);
    try {
      const next = await saveAppLogo(slot.field, croppedFile);
      setSlots(next);
      onToast(`${slot.title} attached`);
      closePending();
    } catch (err) {
      onToast(err?.message || "Failed to save logo");
    } finally {
      setBusyId("");
    }
  }

  return (
    <>
      <Panel
        title="Logo slots"
        subtitle={
          loading
            ? "Loading logos…"
            : `Website, admin, favicon, and APK logos (light & dark) from App Config. Images only, max ${LOGO_MAX_SIZE_MB} MB.`
        }
      >
        {loading ? (
          <p className="ua-cfg-panel__sub">Fetching logos from App Config…</p>
        ) : (
          <div className="ua-cfg-lg-grid">
            {slots.map((slot) => (
              <LogoSlotCard
                key={slot.id}
                slot={slot}
                busy={Boolean(busyId)}
                onPick={(nextSlot) => openPicker(nextSlot)}
              />
            ))}
          </div>
        )}
      </Panel>

      <ImageCropModal
        open={Boolean(pending)}
        label={pending?.slot?.title?.toLowerCase() ?? "logo"}
        file={pending?.file}
        previewUrl={previewUrl}
        busy={Boolean(busyId)}
        originalAspectCss={originalAspectCss(pending?.slot)}
        originalAspectNumber={originalAspectNumber(pending?.slot)}
        cropWidth={isApkLogoField(pending?.slot?.field) ? APK_LOGO_CROP_WIDTH : undefined}
        cropHeight={isApkLogoField(pending?.slot?.field) ? APK_LOGO_CROP_HEIGHT : undefined}
        onClose={closePending}
        onConfirm={confirmUpload}
      />

      {mediaPickerModal}
    </>
  );
}
