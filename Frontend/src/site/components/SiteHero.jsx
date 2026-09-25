import { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination, EffectFade } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/effect-fade";
import { handleMediaImageError, mediaUrl } from "../../media.js";
import { fetchActiveBanners } from "../api/publicMisc.js";

function isWebVisibleBanner(banner) {
  if (!banner) return false;
  if (String(banner.status || "active").toLowerCase() !== "active") return false;
  if (banner.webOn === false || banner.webOn === "false" || banner.webOn === 0) return false;
  // Website always uses the desktop/web asset (never the app/mobile crop).
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

export function SiteHero() {
  const [slides, setSlides] = useState(null);
  const [swiperInstance, setSwiperInstance] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await fetchActiveBanners({
          page: 1,
          limit: 20,
          bannerType: "main",
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

  // Pause autoplay when the hero is off-screen (helps INP / main-thread work).
  useEffect(() => {
    if (!swiperInstance || typeof IntersectionObserver === "undefined") return undefined;

    const el = swiperInstance.el;
    if (!el) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!swiperInstance.autoplay) return;
        if (entry?.isIntersecting) {
          swiperInstance.autoplay.start();
        } else {
          swiperInstance.autoplay.stop();
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [swiperInstance]);

  if (slides === null) {
    return (
      <section className="swiper heroSwiper heroSwiper--loading" aria-busy="true" aria-label="Loading banners" />
    );
  }

  if (slides.length === 0) {
    return null;
  }

  return (
    <Swiper
      key={`hero-${slides.length}`}
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
        renderBullet: (index, className) => {
          return `
        <span class="${className}">
          <svg class="bullet-progress" viewBox="0 0 36 36">
            <circle class="bullet-ring" cx="18" cy="18" r="15"></circle>
          </svg>
        </span>
      `;
        },
      }}
      modules={[Autoplay, Pagination, EffectFade]}
      className="heroSwiper"
      onSwiper={setSwiperInstance}
    >
      {slides.map((slide, index) => (
        <SwiperSlide key={slide.id}>
          <div className="slide-flash" />
          <div className="hero-bg">
            <img
              src={slide.image}
              alt={slide.title || "Banner"}
              className="hero-bg-image"
              width={1905}
              height={640}
              decoding={index === 0 ? "sync" : "async"}
              loading={index === 0 ? "eager" : "lazy"}
              ref={
                index === 0
                  ? (el) => {
                      if (el) el.setAttribute("fetchpriority", "high");
                    }
                  : undefined
              }
              onError={handleMediaImageError}
            />
          </div>
          <div className="hero-overlay" />
        </SwiperSlide>
      ))}
    </Swiper>
  );
}
