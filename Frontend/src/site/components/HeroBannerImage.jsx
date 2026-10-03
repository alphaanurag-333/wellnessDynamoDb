import { useState } from "react";
import { handleMediaImageError } from "../../media.js";

export const HERO_MOBILE_MEDIA_QUERY = "(max-width: 576px)";

/** Banner image that swaps to the mobile artwork on phones when one is uploaded. */
export function HeroBannerImage({ image, mobileImage, alt, highPriority = false, ...imgProps }) {
  const [mobileFailed, setMobileFailed] = useState(false);
  const mobileSrc = mobileFailed ? "" : mobileImage;

  const handleError = (event) => {
    const usingMobileSource =
      Boolean(mobileSrc) && typeof window !== "undefined" && window.matchMedia(HERO_MOBILE_MEDIA_QUERY).matches;
    if (usingMobileSource) {
      setMobileFailed(true);
      return;
    }
    handleMediaImageError(event);
  };

  // React warns on the camelCase `fetchPriority` prop in older versions, so set it on the DOM node.
  const setPriority = highPriority
    ? (el) => {
        if (el) el.setAttribute("fetchpriority", "high");
      }
    : undefined;

  return (
    <picture>
      {mobileSrc ? <source media={HERO_MOBILE_MEDIA_QUERY} srcSet={mobileSrc} /> : null}
      <img
        {...imgProps}
        ref={setPriority}
        src={image}
        alt={alt}
        className="hero-bg-image"
        onError={handleError}
      />
    </picture>
  );
}
