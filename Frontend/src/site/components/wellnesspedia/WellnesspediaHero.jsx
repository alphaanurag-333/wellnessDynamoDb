import { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination, EffectFade } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/effect-fade";
import { handleMediaImageError, mediaUrl } from "../../../media.js";
import { fetchActiveBanners } from "../../api/publicMisc.js";

function isWebVisibleBanner(banner) {
  if (!banner) return false;
  if (String(banner.status || "active").toLowerCase() !== "active") return false;
  if (banner.webOn === false || banner.webOn === "false" || banner.webOn === 0) return false;
  return Boolean(banner.image || banner.mobileImage);
}

function toHeroSlide(banner) {
  const desktop = mediaUrl(banner.image) || banner.image || "";
  const fallback = mediaUrl(banner.mobileImage) || banner.mobileImage || "";
  return {
    id: banner.id || banner._id,
    title: banner.title || "",
    description: banner.description || "",
    image: desktop || fallback,
  };
}

export default function WellnesspediaHero() {
  const [slides, setSlides] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await fetchActiveBanners({
          page: 1,
          limit: 20,
          bannerType: "wellnesspedia",
          platform: "web",
        });
        if (cancelled) return;

        const banners = Array.isArray(data?.banners) ? data.banners : [];
        setSlides(
          banners
            .filter(isWebVisibleBanner)
            .map(toHeroSlide)
            .filter((slide) => slide.image)
        );
      } catch {
        if (!cancelled) setSlides([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (slides === null) {
    return (
      <section
        className="swiper heroSwiper heroSwiper--loading wellnesspedia-hero"
        aria-busy="true"
        aria-label="Loading Wellnesspedia banners"
      />
    );
  }

  if (slides.length === 0) {
    return null;
  }

  return (
    <Swiper
      key={`wellnesspedia-hero-${slides.length}`}
      spaceBetween={0}
      speed={900}
      effect="fade"
      fadeEffect={{ crossFade: true }}
      centeredSlides
      loop={slides.length > 1}
      autoplay={{
        delay: 3500,
        disableOnInteraction: false,
      }}
      pagination={{
        clickable: true,
        renderBullet: (index, className) => `
        <span class="${className}">
          <svg class="bullet-progress" viewBox="0 0 36 36">
            <circle class="bullet-ring" cx="18" cy="18" r="15"></circle>
          </svg>
        </span>
      `,
      }}
      modules={[Autoplay, Pagination, EffectFade]}
      className="heroSwiper wellnesspedia-hero"
    >
      {slides.map((slide) => (
        <SwiperSlide key={slide.id}>
          <div className="slide-flash" />
          <div className="hero-bg">
            <img
              src={slide.image}
              alt={slide.title || "Wellnesspedia banner"}
              className="hero-bg-image"
              onError={handleMediaImageError}
            />
          </div>
          <div className="hero-overlay" />
        </SwiperSlide>
      ))}
    </Swiper>
  );
}
