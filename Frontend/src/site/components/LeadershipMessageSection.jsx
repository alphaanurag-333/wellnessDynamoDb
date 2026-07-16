import { useEffect, useRef, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import { ArrowRight, ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { mediaUrl } from "../../media.js";
import { youtubeEmbedUrl } from "../../utils/youtubeEmbed.js";
import { fetchLeadershipNotes } from "../api/publicMisc.js";

import "swiper/css";
import "swiper/css/navigation";

function messageParagraphs(text) {
  return String(text || "")
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function LeadershipVideo({ videoType = "none", ytLink = "", video = "", className = "" }) {
  const type = videoType === "video" ? "video" : videoType === "link" ? "link" : "none";

  if (type === "link") {
    const embedUrl = youtubeEmbedUrl(ytLink);
    if (!embedUrl) return null;
    return (
      <div className={`leadership__video leadership__video--embed${className ? ` ${className}` : ""}`}>
        <iframe
          src={embedUrl}
          title="Co-founder message video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  if (type === "video" && video) {
    return (
      <div className={`leadership__video leadership__video--upload${className ? ` ${className}` : ""}`}>
        <video src={mediaUrl(video)} controls playsInline preload="metadata" />
      </div>
    );
  }

  return null;
}

function LeadershipNoteCard({
  badge = "A NOTE FROM LEADERSHIP",
  title,
  name,
  designation,
  message,
  profileImage = "",
  videoType = "none",
  ytLink = "",
  video = "",
  onExpandChange,
}) {
  const [expanded, setExpanded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [needsToggle, setNeedsToggle] = useState(false);
  const descriptionRef = useRef(null);

  const paragraphs = messageParagraphs(message);
  const imageSrc = profileImage ? mediaUrl(profileImage) : "";
  const showImage = Boolean(imageSrc) && !imageError;
  const heading = String(title || designation || "").trim();
  const hasVideo =
    (videoType === "link" && String(ytLink || "").trim()) ||
    (videoType === "video" && String(video || "").trim());

  useEffect(() => {
    setImageError(false);
    setExpanded(false);
  }, [imageSrc, message]);

  useEffect(() => {
    const el = descriptionRef.current;
    if (!el || expanded) return undefined;

    const measure = () => setNeedsToggle(el.scrollHeight > el.clientHeight + 1);
    measure();

    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    observer?.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [message, expanded]);

  if (!name || paragraphs.length === 0) return null;

  const toggleExpanded = () => {
    setExpanded((prev) => {
      const next = !prev;
      queueMicrotask(() => onExpandChange?.());
      return next;
    });
  };

  return (
    <div
      className={`p-3 leadership__card${showImage ? "" : " leadership__card--no-image"}${
        hasVideo ? " leadership__card--with-video" : ""
      }`}
    >
      {showImage ? (
        <div className="leadership__image">
          <div className="leadership__image-frame">
            <img
              src={imageSrc}
              alt={name}
              onError={() => setImageError(true)}
              onLoad={() => onExpandChange?.()}
            />
          </div>
        </div>
      ) : null}

      <div className="leadership__content">
        {/* {badge ? <span className="leadership__badge">{badge}</span> : null} */}
        {heading ? <h2 className="leadership__title">{heading}</h2> : null}

        <div className="leadership__author">
          <h4>{name}</h4>
          {designation ? <span>{designation}</span> : null}
        </div>

        <div
          ref={descriptionRef}
          className={`leadership__description${expanded ? " expanded" : ""}`}
        >
          {paragraphs.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>

        <div className="leadership__link-slot">
          {needsToggle || expanded ? (
            <button type="button" className="leadership__link" onClick={toggleExpanded}>
              {expanded ? "Read Less" : "Read More"}
              {expanded ? <ArrowUpRight size={18} /> : <ArrowRight size={18} />}
            </button>
          ) : null}
        </div>
      </div>

      {hasVideo ? (
        <div className="leadership__video-wrap">
          <LeadershipVideo videoType={videoType} ytLink={ytLink} video={video} />
        </div>
      ) : null}
    </div>
  );
}

/** Legacy single-note section (kept for fallback / reuse). */
export function LeadershipMessageSection({
  badge = "A NOTE FROM LEADERSHIP",
  title,
  name,
  designation,
  message,
  profileImage = "",
  videoType = "none",
  ytLink = "",
  video = "",
  className = "",
}) {
  return (
    <section className={`pt-2 leadership${className ? ` ${className}` : ""}`}>
      <div className="site-container">
        <LeadershipNoteCard
          badge={badge}
          title={title}
          name={name}
          designation={designation}
          message={message}
          profileImage={profileImage}
          videoType={videoType}
          ytLink={ytLink}
          video={video}
        />
      </div>
    </section>
  );
}

function equalizeSlideHeights(swiper) {
  if (!swiper?.slides?.length) return;

  const slides = Array.from(swiper.slides);
  slides.forEach((slide) => {
    slide.style.height = "auto";
  });

  const maxHeight = Math.max(0, ...slides.map((slide) => slide.offsetHeight));
  if (maxHeight <= 0) return;

  slides.forEach((slide) => {
    slide.style.height = `${maxHeight}px`;
  });
}

export function LeadershipNotesSlider({ notes = [], loading = false }) {
  const swiperRef = useRef(null);
  const prevRef = useRef(null);
  const nextRef = useRef(null);

  const items = (Array.isArray(notes) ? notes : []).filter(
    (note) => note?.name && String(note?.message || "").trim()
  );
  const showNav = items.length > 1;

  const syncHeights = () => {
    requestAnimationFrame(() => equalizeSlideHeights(swiperRef.current));
  };

  useEffect(() => {
    syncHeights();
    window.addEventListener("resize", syncHeights);
    return () => window.removeEventListener("resize", syncHeights);
  }, [items.length]);

  if (loading) {
    return (
      <section className="leadership leadership-slider" aria-label="Leadership notes">
        <div className="site-container">
          <p className="leadership-slider__loading">Loading leadership notes…</p>
        </div>
      </section>
    );
  }

  if (items.length === 0) return null;

  return (
    <section className="leadership leadership-slider pt-2 pb-0" aria-label="Leadership notes">
      
      <div className="site-container">
         <div className="transformation-header mb-2">
          <div className="header-left">
            <h2>Notes from Leadership</h2>
            <p>Guiding our vision with transparency, purpose, and commitment</p>
          </div>
         
        {showNav ? (
          <div className="leadership-slider__nav">
            <button ref={prevRef} type="button" className="leadership-slider__navBtn" aria-label="Previous note">
              <ChevronLeft size={22} />
            </button>
            <button ref={nextRef} type="button" className="leadership-slider__navBtn" aria-label="Next note">
              <ChevronRight size={22} />
            </button>
          </div>
        ) : null}
 </div>
        <Swiper
          modules={[Navigation]}
          slidesPerView={2}
           breakpoints={{
    0: {
      slidesPerView: 1,
    },
    768: {
      slidesPerView: 2,
    },
  }}
          spaceBetween={24}
          speed={700}
          watchOverflow
          navigation={
            showNav
              ? {
                  prevEl: prevRef.current,
                  nextEl: nextRef.current,
                }
              : false
          }
          onSwiper={(swiper) => {
            swiperRef.current = swiper;
            syncHeights();
            if (!showNav) return;
            setTimeout(() => {
              swiper.params.navigation.prevEl = prevRef.current;
              swiper.params.navigation.nextEl = nextRef.current;
              swiper.navigation.destroy();
              swiper.navigation.init();
              swiper.navigation.update();
              syncHeights();
            });
          }}
          onSlideChange={syncHeights}
          className="leadership-slider__swiper"
        >
          {items.map((note) => (
            <SwiperSlide key={note.id || note._id}>
              <LeadershipNoteCard
                badge={note.badge || "A NOTE FROM LEADERSHIP"}
                title={note.title || note.designation}
                name={note.name}
                designation={note.designation}
                message={note.message}
                profileImage={note.profileImage || ""}
                onExpandChange={syncHeights}
              />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
}

export function LeadershipNotesSection() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const response = await fetchLeadershipNotes({ page: 1, limit: 50, platform: "web" });
        if (!cancelled) {
          setNotes(Array.isArray(response?.leadershipNotes) ? response.leadershipNotes : []);
        }
      } catch {
        if (!cancelled) setNotes([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return <LeadershipNotesSlider notes={notes} loading={loading} />;
}
