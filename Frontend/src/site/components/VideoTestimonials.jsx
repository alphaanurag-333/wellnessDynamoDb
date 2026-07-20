import { useEffect, useRef, useState } from "react";
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

function VideoTestimonialCard({ item, isPlaying, onPlay }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (!isPlaying || item.type !== "video") return undefined;
    const el = videoRef.current;
    if (!el) return undefined;
    const playPromise = el.play?.();
    if (playPromise?.catch) playPromise.catch(() => {});
    return () => {
      el.pause?.();
    };
  }, [isPlaying, item.type]);

  if (isPlaying) {
    return (
      <article className="video-card-wrap">
        <div className="video-card video-card--playing" aria-label={`Playing video from ${item.name}`}>
          {item.type === "video" ? (
            <video
              ref={videoRef}
              src={item.playUrl}
              controls
              autoPlay
              playsInline
              className="video-card__player"
            />
          ) : (
            <iframe
              src={`${item.playUrl}?autoplay=1`}
              title={item.name}
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              className="video-card__player"
            />
          )}
        </div>
        <p className="video-card__name">{item.name}</p>
      </article>
    );
  }

  return (
    <article className="video-card-wrap">
      <button
        type="button"
        className="video-card"
        onClick={() => onPlay(item.id)}
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
  );
}

export default function VideoTestimonials() {
  const [items, setItems] = useState(null);
  const [playingId, setPlayingId] = useState(null);
  const swiperRef = useRef(null);

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

  if (items === null) {
    return (
      <section
        className="video-slider-section pt-3"
        aria-busy="true"
        aria-label="Loading video testimonials"
      >
        
        <div className="transformation-header">
          <div className="header-left">
            <h2>Voice of Healing : Unfiltered</h2>
           <p className="site-testimonials__loading">Loading video testimonials…</p>
          </div>
           </div>
        {/* <div className="container">
          <h2 className="voice-title">Voice of Healing : Unfiltered</h2>
          <p className="site-testimonials__loading">Loading video testimonials…</p>
        </div> */}
      </section>
    );
  }

  if (items.length === 0) {
    return null;
  }

  const enableLoop = items.length > 3 && !playingId;

  return (
    <section className="video-slider-section pt-3" aria-label="Video testimonials">
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
          onSwiper={(swiper) => {
            swiperRef.current = swiper;
          }}
          onSlideChange={() => {
            if (playingId) setPlayingId(null);
          }}
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
              <VideoTestimonialCard
                item={item}
                isPlaying={playingId === item.id}
                onPlay={(id) => {
                  setPlayingId(id);
                  swiperRef.current?.autoplay?.stop?.();
                }}
              />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
}
