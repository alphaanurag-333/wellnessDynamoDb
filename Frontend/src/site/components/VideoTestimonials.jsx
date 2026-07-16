import { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import { FaPlay } from "react-icons/fa";

import "swiper/css";

import { DEFAULT_IMAGE_SRC, handleMediaImageError, mediaUrl } from "../../media.js";
import { fetchVideoTestimonials } from "../api/publicMisc.js";

function youtubeEmbedUrl(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";

  if (raw.includes("/embed/")) {
    try {
      const parsed = new URL(raw);
      const parts = parsed.pathname.split("/").filter(Boolean);
      const embedIndex = parts.indexOf("embed");
      if (embedIndex >= 0 && parts[embedIndex + 1]) {
        return `https://www.youtube.com/embed/${parts[embedIndex + 1]}`;
      }
    } catch {
      return raw;
    }
    return raw;
  }

  try {
    const parsed = new URL(raw);
    if (parsed.hostname.includes("youtube.com")) {
      const videoId = parsed.searchParams.get("v");
      if (videoId) return `https://www.youtube.com/embed/${videoId}`;
    }
    if (parsed.hostname === "youtu.be") {
      const videoId = parsed.pathname.replace(/^\//, "");
      if (videoId) return `https://www.youtube.com/embed/${videoId}`;
    }
  } catch {
    return "";
  }

  return "";
}

function mapVideoTestimonial(row) {
  if (!row) return null;

  const id = row.id || row._id;
  const type = row.type === "video" ? "video" : "link";
  const name = String(row.name || "").trim() || "Video testimonial";
  const image = row.profileImage ? mediaUrl(row.profileImage) : DEFAULT_IMAGE_SRC;

  let playUrl = "";
  if (type === "video" && row.video) {
    playUrl = mediaUrl(row.video);
  } else if (type === "link" && row.ytLink) {
    playUrl = youtubeEmbedUrl(row.ytLink);
  }

  if (!id || !playUrl) return null;

  return { id, name, type, image, playUrl };
}

export default function VideoTestimonials() {
  const [items, setItems] = useState(null);
  const [activeItem, setActiveItem] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await fetchVideoTestimonials({ page: 1, limit: 24 });
        if (cancelled) return;
        const rows = Array.isArray(data?.videoTestimonials) ? data.videoTestimonials : [];
        setItems(rows.map(mapVideoTestimonial).filter(Boolean));
      } catch {
        if (!cancelled) setItems([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!activeItem) return undefined;

    const onKeyDown = (e) => {
      if (e.key === "Escape") setActiveItem(null);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeItem]);

  if (items === null) {
    return (
      <section
        className="video-slider-section"
        aria-busy="true"
        aria-label="Loading video testimonials"
      >
        <div className="container">
          <h2 className="voice-title">Voice of Healing : Unfiltered</h2>
          <p className="site-testimonials__loading">Loading video testimonials…</p>
        </div>
      </section>
    );
  }

  if (items.length === 0) {
    return null;
  }

  const enableLoop = items.length > 3;

  return (
    <>
      <section className="video-slider-section" aria-label="Video testimonials">
        <div className="container">
          <h2 className="voice-title">Voice of Healing : Unfiltered</h2>
          <Swiper
            modules={[Autoplay]}
            slidesPerView={3}
            spaceBetween={20}
            loop={enableLoop}
            autoplay={
              enableLoop
                ? {
                    delay: 3000,
                    disableOnInteraction: false,
                    pauseOnMouseEnter: true,
                  }
                : false
            }
            breakpoints={{
              0: {
                slidesPerView: 1,
                spaceBetween: 12,
              },
              576: {
                slidesPerView: 2,
                spaceBetween: 14,
              },
              992: {
                slidesPerView: 4,
                spaceBetween: 18,
              },
            }}
            className="videoTestimonialsSwiper"
          >
            {items.map((item) => (
              <SwiperSlide key={item.id}>
                <article className="video-card-wrap">
                  <button
                    type="button"
                    className="video-card"
                    onClick={() => setActiveItem(item)}
                    aria-label={`Play video testimonial from ${item.name}`}
                  >
                    <img
                      src={item.image || DEFAULT_IMAGE_SRC}
                      alt=""
                      loading="lazy"
                      onError={handleMediaImageError}
                    />

                    <span className="play-btn" aria-hidden>
                      <FaPlay />
                    </span>
                  </button>
                  <p className="video-card__name">{item.name}</p>
                </article>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </section>

      {activeItem ? (
        <div
          className="video-modal"
          onClick={() => setActiveItem(null)}
          role="dialog"
          aria-modal="true"
          aria-label={activeItem.name}
        >
          <div className="video-modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="close-btn"
              onClick={() => setActiveItem(null)}
              aria-label="Close video"
            >
              ×
            </button>

            {activeItem.type === "video" ? (
              <video
                src={activeItem.playUrl}
                controls
                autoPlay
                playsInline
                className="video-modal-player"
              />
            ) : (
              <iframe
                src={`${activeItem.playUrl}?autoplay=1`}
                title={activeItem.name}
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
