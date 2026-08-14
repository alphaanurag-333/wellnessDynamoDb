import { useEffect, useState } from "react";

const CROP_RATIOS = ["Original", "1:1", "4:3", "3:4", "16:9"];

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

function cropAspect(ratio) {
  if (ratio === "Original") return "240 / 64";
  return ratio.replace(":", " / ");
}

function UploadConfirmModal({ open, label, onClose, onConfirm }) {
  const [ratio, setRatio] = useState("Original");
  const [zoom, setZoom] = useState(100);

  useEffect(() => {
    if (!open) return undefined;
    setRatio("Original");
    setZoom(100);
    return undefined;
  }, [open]);

  if (!open) return null;

  return (
    <div className="ua-cp-modal-backdrop ua-cp-modal-backdrop--drawer" onClick={onClose} role="presentation">
      <div
        className="ua-cfg-mv-upload-modal ua-cfg-pt-upload-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="ua-cfg-mv-upload-modal__head">
          <div>
            <h3 className="ua-cfg-mv-upload-modal__title">
              <span aria-hidden="true">✂</span> Confirm upload
            </h3>
            <p className="ua-cfg-mv-upload-modal__sub">
              {label} · set the crop, ratio and zoom before it is attached
            </p>
          </div>
          <button type="button" className="ua-cfg-mv-upload-modal__close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="ua-cfg-mv-upload-modal__ratios">
          {CROP_RATIOS.map((entry) => (
            <button
              key={entry}
              type="button"
              className={`ua-cfg-mv-upload-modal__ratio${ratio === entry ? " is-active" : ""}`}
              onClick={() => setRatio(entry)}
            >
              {entry}
            </button>
          ))}
        </div>

        <div className="ua-cfg-mv-upload-modal__crop">
          <div
            className="ua-cfg-mv-upload-modal__crop-inner ua-cfg-pt-crop"
            style={{ transform: `scale(${zoom / 100})`, aspectRatio: cropAspect(ratio) }}
          >
            <span className="ua-cfg-mv-upload-modal__grid" aria-hidden="true" />
          </div>
        </div>

        <div className="ua-cfg-mv-upload-modal__frameworks">
          <span className="ua-cfg-mv-upload-modal__frameworks-label">How it will sit in your frameworks</span>
          <div className="ua-cfg-mv-upload-modal__frameworks-row">
            <div className="ua-cfg-mv-upload-modal__framework ua-cfg-mv-upload-modal__framework--web">
              <span>Web</span>
              <div />
            </div>
            <div className="ua-cfg-mv-upload-modal__framework ua-cfg-mv-upload-modal__framework--app is-active">
              <span>App</span>
              <div />
            </div>
          </div>
        </div>

        <div className="ua-cfg-mv-upload-modal__zoom">
          <button
            type="button"
            className="ua-cfg-mv-upload-modal__zoom-btn"
            onClick={() => setZoom((value) => Math.max(50, value - 10))}
          >
            −
          </button>
          <input
            type="range"
            min={50}
            max={150}
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
          />
          <button
            type="button"
            className="ua-cfg-mv-upload-modal__zoom-btn"
            onClick={() => setZoom((value) => Math.min(150, value + 10))}
          >
            +
          </button>
          <span className="ua-cfg-mv-upload-modal__zoom-value">{zoom}%</span>
          <button
            type="button"
            className="ua-cfg-btn ua-cfg-btn--ghost ua-cfg-btn--sm"
            onClick={() => {
              setRatio("Original");
              setZoom(100);
            }}
          >
            Reset
          </button>
        </div>

        <div className="ua-cfg-mv-upload-modal__foot">
          <button type="button" className="ua-cfg-btn ua-cfg-btn--outline" onClick={onClose}>
            Discard
          </button>
          <button type="button" className="ua-cfg-btn ua-cfg-btn--primary" onClick={onConfirm}>
            Confirm &amp; attach
          </button>
        </div>
      </div>
    </div>
  );
}

function LogoSlotCard({ slot, onUpload, onRemove }) {
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
            <span className="ua-cfg-lg-slot__thumb" aria-hidden="true">IR</span>
            <div className="ua-cfg-lg-slot__actions">
              <button type="button" className="ua-cfg-btn ua-cfg-btn--ghost ua-cfg-btn--sm" onClick={onUpload}>
                Replace
              </button>
              <button type="button" className="ua-cfg-icon-btn" aria-label={`Remove ${slot.title}`} onClick={onRemove}>
                ×
              </button>
            </div>
          </>
        ) : (
          <button type="button" className="ua-cfg-btn ua-cfg-btn--primary ua-cfg-btn--sm" onClick={onUpload}>
            <span aria-hidden="true">🏷</span> Upload
          </button>
        )}
      </div>
    </article>
  );
}

export function LogoSlotsSection({ slots, setSlots, onToast }) {
  const [uploadId, setUploadId] = useState(null);
  const uploadSlot = slots.find((entry) => entry.id === uploadId) ?? null;

  function setUploaded(id, uploaded) {
    setSlots((prev) => prev.map((entry) => (entry.id === id ? { ...entry, uploaded } : entry)));
  }

  return (
    <>
      <Panel
        title="Logo slots"
        subtitle="Upload a variant for each placement — the header, footer, browser tab and app launcher."
      >
        <div className="ua-cfg-lg-grid">
          {slots.map((slot) => (
            <LogoSlotCard
              key={slot.id}
              slot={slot}
              onUpload={() => setUploadId(slot.id)}
              onRemove={() => {
                setUploaded(slot.id, false);
                onToast(`${slot.title} removed`);
              }}
            />
          ))}
        </div>
      </Panel>

      <UploadConfirmModal
        open={Boolean(uploadSlot)}
        label={uploadSlot?.title?.toLowerCase() ?? "logo"}
        onClose={() => setUploadId(null)}
        onConfirm={() => {
          if (!uploadSlot) return;
          setUploaded(uploadSlot.id, true);
          setUploadId(null);
          onToast(`${uploadSlot.title} attached`);
        }}
      />
    </>
  );
}
