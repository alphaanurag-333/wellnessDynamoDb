import { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination, EffectCreative } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import { handleMediaImageError, mediaUrl } from "../../media.js";
import { fetchActiveBanners } from "../api/publicMisc.js";

export function SiteHero() {
  const [slides, setSlides] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await fetchActiveBanners({ page: 1, limit: 20 });
        if (cancelled) return;

        const banners = Array.isArray(data?.banners) ? data.banners : [];
        setSlides(
          banners
            .filter((banner) => banner?.image)
            .map((banner) => ({
              id: banner.id || banner._id,
              title: banner.title || "",
              description: banner.description || "",
              image: mediaUrl(banner.image) || banner.image,
            }))
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
      <section className="swiper heroSwiper heroSwiper--loading" aria-busy="true" aria-label="Loading banners" />
    );
  }

  if (slides.length === 0) {
    return null;
  }

  return (
    <Swiper
      key={`hero-${slides.length}`}
      spaceBetween={30}
      speed={1800}
      effect="creative"
      creativeEffect={{
        prev: {
          opacity: 0,
          scale: 1.15,
        },
        next: {
          opacity: 0,
          scale: 1.25,
        },
      }}
      centeredSlides
      loop={slides.length > 1}
      autoplay={{
        delay: 2500,
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
      modules={[Autoplay, Pagination, EffectCreative]}
      className="heroSwiper"
    >
      {slides.map((slide) => (
        <SwiperSlide key={slide.id}>
          <div className="slide-flash" />
          <div className="hero-bg">
            <img
              src={slide.image}
              alt={slide.title || "Banner"}
              className="hero-bg-image"
              onError={handleMediaImageError}
            />
          </div>
          <div className="hero-overlay" />
          <div className="hero-content">
            {/* <span className="hero-label">PREMIUM COLLECTION</span> */}
            <h1 className="hero-title">{slide.title}</h1>
            {slide.description ? <p className="hero-description">{slide.description}</p> : null}
          </div>
        </SwiperSlide>
      ))}
    </Swiper>
  );
}
