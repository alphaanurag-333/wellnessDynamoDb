import { AdminMediaImage } from "./AdminMediaImage.jsx";

const DEFAULT_MAX_HEIGHT = 320;

/**
 * Full-width banner / notification image for admin detail pages.
 * Matches website hero crop aspect (1920×640).
 */
export function AdminDetailBannerImage({
  path,
  src,
  alt = "Banner",
  maxHeight = DEFAULT_MAX_HEIGHT,
  radius = 8,
  hideWhenMissing = false,
}) {
  if (hideWhenMissing && !path && !src) return null;

  return (
    <div
      className="admin-detail-media admin-detail-media--banner"
      style={{
        width: "100%",
        maxWidth: 960,
        aspectRatio: "1920 / 640",
        maxHeight,
        borderRadius: radius,
        overflow: "hidden",
        background: "#111",
      }}
    >
      <AdminMediaImage
        path={path}
        src={src}
        height={maxHeight}
        radius={0}
        alt={alt}
        objectFit="cover"
        responsive
        style={{ width: "100%", height: "100%", maxHeight: "none", objectFit: "cover" }}
      />
    </div>
  );
}
