import { useEffect, useMemo, useState } from "react";
import { mediaUrl } from "../../media.js";
import defaultImageAsset from "../../assets/defaultImg/defaultImg.png";

export const DEFAULT_IMAGE_SRC =
  typeof defaultImageAsset === "string" ? defaultImageAsset : defaultImageAsset?.src || String(defaultImageAsset);

export function resolveMediaImageSrc(path, directSrc) {
  if (directSrc) return directSrc;
  if (!path) return DEFAULT_IMAGE_SRC;
  return mediaUrl(path) || DEFAULT_IMAGE_SRC;
}

export function handleMediaImageError(e) {
  e.currentTarget.onerror = null;
  e.currentTarget.src = DEFAULT_IMAGE_SRC;
}

/**
 * Admin upload / list / preview image with default fallback on missing URL or load error.
 * @param {string} [path] - stored media path (passed to mediaUrl)
 * @param {string} [src] - full URL, blob URL, or preview (overrides path)
 */
export function AdminMediaImage({
  path,
  src: directSrc,
  alt = "",
  width = 44,
  height = 44,
  round = false,
  radius = 8,
  className = "",
  style = {},
  hideUntilSrc = false,
  objectFit,
  responsive = false,
}) {
  const resolvedSrc = useMemo(() => resolveMediaImageSrc(path, directSrc), [path, directSrc]);
  const isMissing = !path && !directSrc;
  const [imgSrc, setImgSrc] = useState(resolvedSrc);
  const [useFallback, setUseFallback] = useState(isMissing);

  useEffect(() => {
    setImgSrc(resolvedSrc);
    setUseFallback(isMissing);
  }, [resolvedSrc, isMissing]);

  const onError = () => {
    setImgSrc(DEFAULT_IMAGE_SRC);
    setUseFallback(true);
  };

  if (hideUntilSrc && isMissing) return null;

  if (round) {
    const size = width || height || 46;
    return (
      <span
        className={`admin-profile-thumb${useFallback ? " admin-profile-thumb--fallback" : ""}${className ? ` ${className}` : ""}`}
        style={{ width: size, height: size, ...style }}
      >
        <img src={imgSrc} alt={alt} onError={onError} loading="lazy" decoding="async" />
      </span>
    );
  }

  const w = width ?? 44;
  const h = height ?? 44;
  const fit = objectFit ?? (useFallback ? "contain" : "cover");
  const imgStyle = responsive
    ? {
        width: "100%",
        height: "auto",
        maxHeight: h,
        objectFit: fit,
        borderRadius: radius,
        ...style,
      }
    : {
        width: w,
        height: h,
        objectFit: fit,
        borderRadius: radius,
        ...style,
      };

  return (
    <img
      src={imgSrc}
      alt={alt}
      width={responsive ? undefined : w}
      height={responsive ? undefined : h}
      loading="lazy"
      decoding="async"
      className={`admin-media-thumb${useFallback ? " admin-media-thumb--fallback" : ""}${responsive ? " admin-media-thumb--responsive" : ""}${className ? ` ${className}` : ""}`}
      style={imgStyle}
      onError={onError}
    />
  );
}
