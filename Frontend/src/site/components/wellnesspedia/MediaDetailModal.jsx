import { useEffect, useMemo, useState } from "react";
import { Play } from "lucide-react";
import { handleMediaImageError, mediaUrl } from "../../../media.js";
import { youtubeEmbedUrl } from "../../../utils/youtubeEmbed.js";
import WellnesspediaModal from "./WellnesspediaModal.jsx";

function resolveSpecs(item) {
  if (Array.isArray(item?.specifications) && item.specifications.length) {
    return item.specifications.map((s) => String(s || "").trim()).filter(Boolean);
  }
  if (Array.isArray(item?.videoSpecification) && item.videoSpecification.length) {
    return item.videoSpecification
      .map((s) => {
        if (typeof s === "string") return s.trim();
        if (!s || typeof s !== "object") return "";
        return [s.label, s.value, s.text].filter(Boolean).join(" ").trim();
      })
      .filter(Boolean);
  }
  if (item?.badge) return [String(item.badge)];
  return [];
}

export default function MediaDetailModal({ open, onClose, item }) {
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    setPlaying(false);
  }, [item?.id, open]);

  const thumbnail = item?.thumbnail ? mediaUrl(item.thumbnail) || item.thumbnail : "";
  const videoSrc = item?.video ? mediaUrl(item.video) || item.video : "";
  const embedUrl = useMemo(() => youtubeEmbedUrl(item?.ytLink), [item?.ytLink]);
  const canPlay = Boolean(embedUrl || videoSrc);
  const specs = useMemo(() => resolveSpecs(item), [item]);

  if (!open || !item) return null;

  return (
    <WellnesspediaModal
      open={open}
      onClose={() => {
        setPlaying(false);
        onClose?.();
      }}
      className={`wp-media-modal${playing ? " is-playing" : ""}`}
    >
      <div className="wp-media-modal__shell">
        <div className="wp-media-modal__media">
          {playing && canPlay ? (
            embedUrl ? (
              <iframe
                key={`yt-${item.id}`}
                title={item.title || "Video"}
                src={`${embedUrl}?autoplay=1`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="wp-media-modal__player"
              />
            ) : (
              <video
                key={`vid-${item.id}`}
                className="wp-media-modal__player"
                src={videoSrc}
                controls
                playsInline
                autoPlay
                preload="metadata"
              />
            )
          ) : (
            <>
              {thumbnail ? (
                <img
                  src={thumbnail}
                  alt={item.title || ""}
                  onError={handleMediaImageError}
                />
              ) : (
                <div className="wp-media-modal__placeholder" />
              )}
              {canPlay ? (
                <button
                  type="button"
                  className="wp-media-modal__play"
                  aria-label="Play video"
                  onClick={() => setPlaying(true)}
                >
                  <Play size={28} fill="currentColor" />
                </button>
              ) : null}
            </>
          )}
        </div>

        <div className="wp-media-modal__content">
          <h3 id="wp-media-modal-title" className="wp-media-modal__title">
            {item.title}
          </h3>

          {specs.length ? (
            <ul className="wp-media-modal__specs" aria-label="Specifications">
              {specs.map((spec, index) => (
                <li key={`${spec}-${index}`}>
                  <span className="wp-chip-badge">{spec}</span>
                </li>
              ))}
            </ul>
          ) : null}

          {item.description ? (
            <p className="wp-media-modal__desc">{item.description}</p>
          ) : null}
        </div>
      </div>
    </WellnesspediaModal>
  );
}
