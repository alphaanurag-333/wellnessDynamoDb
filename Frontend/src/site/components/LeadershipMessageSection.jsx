import { useEffect, useRef, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation, Pagination } from "swiper/modules";
import { ArrowRight, ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { mediaUrl } from "../../media.js";
import { fetchLeadershipNotes } from "../api/publicMisc.js";

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

function messageParagraphs(text) {
  return String(text || "")
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function LeadershipNoteCard({
  badge = "A NOTE FROM LEADERSHIP",
  title,
  name,
  designation,
  message,
  profileImage = "",
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

  useEffect(() => {
    setImageError(false);
  }, [imageSrc]);

  useEffect(() => {
    setExpanded(false);
  }, [message]);

  useEffect(() => {
    const el = descriptionRef.current;
    if (!el) return undefined;

    const measure = () => {
      if (expanded) return;
      // Slight buffer so rounding / subpixel layout doesn't flash a needless toggle.
      setNeedsToggle(el.scrollHeight > el.clientHeight + 1);
    };

    measure();
    const resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    resizeObserver?.observe(el);
    window.addEventListener("resize", measure);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [message, paragraphs.length, expanded]);

  if (!name || paragraphs.length === 0) {
    return null;
  }

  const toggleExpanded = () => {
    setExpanded((prev) => {
      const next = !prev;
      queueMicrotask(() => onExpandChange?.(next));
      return next;
    });
  };

  return (
    <div className={`leadership__card${showImage ? "" : " leadership__card--no-image"}`}>
      {showImage ? (
        <div className="leadership__image">
          <div className="leadership__image-frame">
            <img src={imageSrc} alt={name} onError={() => setImageError(true)} />
          </div>
        </div>
      ) : null}

      <div className="leadership__content">
        <span className="leadership__badge">{badge}</span>
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

        {needsToggle || expanded ? (
          <button type="button" className="leadership__link" onClick={toggleExpanded}>
            {expanded ? "Read Less" : "Read More"}
            {expanded ? <ArrowUpRight size={18} /> : <ArrowRight size={18} />}
          </button>
        ) : null}
      </div>
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
  className = "",
}) {
  return (
    <section className={`leadership${className ? ` ${className}` : ""}`}>
      <div className="site-container">
        <LeadershipNoteCard
          badge={badge}
          title={title}
          name={name}
          designation={designation}
          message={message}
          profileImage={profileImage}
        />
      </div>
    </section>
  );
}

export function LeadershipNotesSlider({ notes = [], loading = false }) {
  const swiperRef = useRef(null);
  const prevRef = useRef(null);
  const nextRef = useRef(null);

  const updateSlideHeight = () => {
    const swiper = swiperRef.current;
    if (!swiper) return;
    requestAnimationFrame(() => {
      swiper.updateAutoHeight?.(200);
      swiper.update?.();
    });
  };

  if (loading) {
    return (
      <section className="leadership">
        <div className="site-container">
          <p className="leadership-slider__loading">Loading leadership notes…</p>
        </div>
      </section>
    );
  }

  const items = (Array.isArray(notes) ? notes : []).filter(
    (note) => note?.name && String(note?.message || "").trim()
  );

  if (items.length === 0) return null;

  const enableLoop = items.length > 1;

  return (
    <section className="leadership leadership-slider">
      <div className="site-container">
        {enableLoop ? (
          <div className="leadership-slider__nav">
            <button
              ref={prevRef}
              type="button"
              className="leadership-slider__navBtn"
              aria-label="Previous note"
            >
              <ChevronLeft size={22} />
            </button>
            <button
              ref={nextRef}
              type="button"
              className="leadership-slider__navBtn"
              aria-label="Next note"
            >
              <ChevronRight size={22} />
            </button>
          </div>
        ) : null}

        <Swiper
          modules={[Autoplay, Navigation, Pagination]}
          spaceBetween={24}
          slidesPerView={1}
          autoHeight
          observer
          observeParents
          watchOverflow
          onSwiper={(swiper) => {
            swiperRef.current = swiper;
            requestAnimationFrame(() => swiper.updateAutoHeight?.(0));
          }}
          onSlideChange={(swiper) => {
            requestAnimationFrame(() => swiper.updateAutoHeight?.(200));
          }}
          onInit={(swiper) => {
            if (!enableLoop) return;
            swiper.params.navigation.prevEl = prevRef.current;
            swiper.params.navigation.nextEl = nextRef.current;
            swiper.navigation.destroy();
            swiper.navigation.init();
            swiper.navigation.update();
          }}
          loop={false}
          rewind={enableLoop}
          autoplay={
            enableLoop
              ? {
                  delay: 6000,
                  disableOnInteraction: false,
                  pauseOnMouseEnter: true,
                }
              : false
          }
          pagination={
            enableLoop
              ? {
                  clickable: true,
                  bulletClass: "leadership-slider__bullet",
                  bulletActiveClass: "leadership-slider__bullet--active",
                }
              : false
          }
          navigation={false}
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
                onExpandChange={updateSlideHeight}
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
        const response = await fetchLeadershipNotes({ page: 1, limit: 50 });
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
