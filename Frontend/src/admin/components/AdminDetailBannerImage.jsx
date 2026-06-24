import { AdminMediaImage } from "./AdminMediaImage.jsx";

const DEFAULT_MAX_HEIGHT = 480;

/**
 * Full-width banner / notification image for admin detail pages.
 * Shows the complete image without cropping (object-fit: contain).
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
    <div className="admin-detail-media">
      <AdminMediaImage
        path={path}
        src={src}
        height={maxHeight}
        radius={radius}
        alt={alt}
        objectFit="contain"
        responsive
      />
    </div>
  );
}
