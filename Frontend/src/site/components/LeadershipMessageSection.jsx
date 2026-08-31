import { useEffect, useRef, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import { ArrowRight, ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { FaPlay } from "react-icons/fa";
import { handleMediaImageError, mediaUrl } from "../../media.js";
import { youtubeEmbedUrl } from "../../utils/youtubeEmbed.js";
import { fetchLeadershipNotes } from "../api/publicMisc.js";
import { SiteLoader } from "./SiteLoader.jsx";

import "swiper/css";
import "swiper/css/navigation";

function messageParagraphs(text) {
  return String(text || "")
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function withYoutubeAutoplay(embedUrl) {
  try {
    const parsed = new URL(embedUrl);
    parsed.searchParams.set("autoplay", "1");
    return parsed.toString();
  } catch {
    return embedUrl.includes("?") ? `${embedUrl}&autoplay=1` : `${embedUrl}?autoplay=1`;
  }
}

function LeadershipVideo({ videoType = "none", ytLink = "", video = "", thumbnail = "", className = "" }) {
  const type = videoType === "video" ? "video" : videoType === "link" ? "link" : "none";
  const poster = thumbnail ? mediaUrl(thumbnail) : "";
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    setPlaying(false);
  }, [videoType, ytLink, video, thumbnail]);

  useEffect(() => {
    if (!playing || type !== "video") return undefined;
    const el = videoRef.current;
    if (!el) return undefined;
    const playPromise = el.play?.();
    if (playPromise?.catch) playPromise.catch(() => {});
    return undefined;
  }, [playing, type]);

  const wrapClass = `leadership__video${
    type === "link" ? " leadership__video--embed" : " leadership__video--upload"
  }${className ? ` ${className}` : ""}`;

  const cover = poster && !playing ? (
    <button
      type="button"
      className="leadership__video-cover"
      onClick={() => setPlaying(true)}
      aria-label="Play video"
    >
      <img src={poster} alt="" onError={handleMediaImageError} />
      <span className="leadership__video-play" aria-hidden>
        <FaPlay />
      </span>
    </button>
  ) : null;

  if (type === "link") {
    const embedUrl = youtubeEmbedUrl(ytLink);
    if (!embedUrl) return null;
    return (
      <div className={wrapClass}>
        {cover}
        {playing || !poster ? (
          <iframe
            src={playing && poster ? withYoutubeAutoplay(embedUrl) : embedUrl}
            title="Co-founder message video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : null}
      </div>
    );
  }

  if (type === "video" && video) {
    return (
      <div className={wrapClass}>
        {cover}
        {playing || !poster ? (
          <video
            ref={videoRef}
            src={mediaUrl(video)}
            poster={poster || undefined}
            controls
            playsInline
            autoPlay={playing}
            preload={poster ? "none" : "metadata"}
          />
        ) : null}
      </div>
    );
  }

  return null;
}

function LeadershipNoteCard({
  title,
  name,
  designation,
  message,
  profileImage = "",
  videoType = "none",
  ytLink = "",
  video = "",
  thumbnail = "",
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
      <div className="leadership__header">
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

        <div className="leadership__meta">
          {heading ? <h2 className="leadership__title">{heading}</h2> : null}
          <div className="leadership__author">
            <h4>{name}</h4>
            {designation ? <span>{designation}</span> : null}
          </div>
        </div>
      </div>

      <div className="leadership__content">
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
          <LeadershipVideo
            videoType={videoType}
            ytLink={ytLink}
            video={video}
            thumbnail={thumbnail || profileImage}
          />
        </div>
      ) : null}
    </div>
  );
}

/** Legacy single-note section (kept for fallback / reuse). */
export function LeadershipMessageSection({
  title,
  name,
  designation,
  message,
  profileImage = "",
  videoType = "none",
  ytLink = "",
  video = "",
  thumbnail = "",
  className = "",
}) {
  return (
    <section className={`pt-2 pb-2 leadership${className ? ` ${className}` : ""}`}>
      <div className="site-container">
        <LeadershipNoteCard
          title={title}
          name={name}
          designation={designation}
          message={message}
          profileImage={profileImage}
          videoType={videoType}
          ytLink={ytLink}
          video={video}
          thumbnail={thumbnail}
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

  // Let each slide size to its content (including video) — do not force a shared height
  // that can clip the video row on tablet widths.
}

export function LeadershipNotesSlider({
  notes = [],
  loading = false,
  label = "Leadership notes",
  heading = "Notes from Leadership",
  subheading = "Guiding our vision with transparency, purpose, and commitment",
  loadingLabel = "Loading leadership notes…",
}) {
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
      <section className="leadership leadership-slider" aria-label={label}>
        <div className="site-container">
          <SiteLoader variant="inline" label={loadingLabel} />
        </div>
      </section>
    );
  }

  if (items.length === 0) return null;

  return (
    <section  className="leadership leadership-slider pt-2 pb-2" aria-label={label}>
      
      <div className="site-container">
         <div className="transformation-header mb-2">
          <div className="header-left">
            <h2>{heading}</h2>
            <p>{subheading}</p>
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
        
        loop={true}
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
                title={note.title || note.designation}
                name={note.name}
                designation={note.designation}
                message={note.message}
                profileImage={note.profileImage || ""}
                videoType={note.videoType || "none"}
                ytLink={note.ytLink || ""}
                video={note.video || ""}
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
