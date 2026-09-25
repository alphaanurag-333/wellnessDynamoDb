import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { IoStar, IoStarHalf, IoStarOutline } from "react-icons/io5";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import "swiper/css";
import { DEFAULT_IMAGE_SRC, handleMediaImageError, mediaUrl } from "../../media.js";
import { fetchRealPeopleTestimonials } from "../api/publicMisc.js";
import { SiteLoader } from "./SiteLoader.jsx";

const SECTION_SUBHEADING =
  "First-hand wellness journeys from IRW members across Fat loss, Type 2 Diabetes, Thyroid health, PMOS, Gut health, Metabolic Wellbeing and many more.";

const SECTION_DISCLAIMER =
  "Individual results vary. Client experiences shown are personal outcomes and should not be interpreted as guaranteed results. Health and medication-related decisions should be made in consultation with an appropriately qualified healthcare professional.";

function HealingStars({ rating }) {
  const value = Math.min(5, Math.max(0, Number(rating) || 0));
  const full = Math.floor(value);
  const hasHalf = value - full >= 0.25 && value - full < 0.75;
  const roundHigh = value - full >= 0.75;
  const stars = [];

  for (let i = 0; i < full + (roundHigh ? 1 : 0); i += 1) {
    stars.push(<IoStar key={`f-${i}`} aria-hidden />);
  }
  if (hasHalf && !roundHigh) {
    stars.push(<IoStarHalf key="half" aria-hidden />);
  }
  const empty = 5 - stars.length;
  for (let i = 0; i < empty; i += 1) {
    stars.push(<IoStarOutline key={`e-${i}`} aria-hidden />);
  }

  return <div className="real-healing-stars">{stars}</div>;
}

function healthConcernLabel(row) {
  const title =
    row?.healthConcernTitle ||
    row?.healthConcern?.title ||
    row?.heading ||
    row?.user?.primaryHealthConcern?.title;
  return title ? String(title).toUpperCase() : "WELLNESS";
}

function locationLabel(row) {
  const location = String(
    row?.location ||
      row?.city ||
      row?.user?.city ||
      row?.user?.location ||
      row?.user?.addressCity ||
      "",
  ).trim();
  return location || "";
}

function avatarPath(row) {
  return row?.userAvatar || row?.profileImage || row?.user?.profileImage || "";
}

function firstName(fullName) {
  const first = String(fullName || "").trim().split(/\s+/)[0];
  return first || "their";
}

function storyLinkLabel(name) {
  const first = firstName(name);
  const possessive = /s$/i.test(first) ? `${first}'` : `${first}'s`;
  return `Read ${possessive} Story`;
}

function mapHealingTestimonial(row) {
  if (!row) return null;

  const id = row.id || row._id;
  const review = String(row.review ?? row.content ?? "").trim();
  const name = String(row.name || row.userName || row.user?.name || "").trim();

  if (!id || !review || !name) return null;

  const imagePath = avatarPath(row);

  return {
    id,
    name,
    review,
    category: healthConcernLabel(row),
    location: locationLabel(row),
    storyLabel: storyLinkLabel(name),
    stars: row.stars ?? row.rating ?? 5,
    image: imagePath ? mediaUrl(imagePath) : DEFAULT_IMAGE_SRC,
  };
}

function RealHealingCard({ item, expanded, onToggle }) {
  const reviewRef = useRef(null);
  const [overflows, setOverflows] = useState(false);

  useLayoutEffect(() => {
    const el = reviewRef.current;
    if (!el) return undefined;

    const measure = () => {
      if (expanded) return;
      setOverflows(el.scrollHeight > el.clientHeight + 1);
    };

    measure();
    const frame = window.requestAnimationFrame(measure);
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    window.addEventListener("resize", measure);

    return () => {
      window.cancelAnimationFrame(frame);
      ro?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [item.review, expanded]);

  const showToggle = overflows || expanded;

  return (
    <article className={`real-healing-card${expanded ? " real-healing-card--expanded" : ""}`}>
      <div className="real-healing-top">
        <HealingStars rating={item.stars} />
        <span className="real-healing-tag">{item.category}</span>
      </div>

      <p
        ref={reviewRef}
        className={`real-healing-review${expanded ? " real-healing-review--expanded" : ""}`}
      >
        {`\u201c${item.review}\u201d`}
      </p>

      {showToggle ? (
        <button
          type="button"
          className="real-healing-more"
          onClick={() => onToggle(item.id)}
          aria-expanded={expanded}
        >
          {expanded ? "Show Less" : item.storyLabel}
          {expanded ? (
            <ArrowUpRight size={14} aria-hidden />
          ) : (
            <ArrowRight size={14} aria-hidden />
          )}
        </button>
      ) : (
        <span className="real-healing-more real-healing-more--spacer" aria-hidden>
          {item.storyLabel}
        </span>
      )}

      <div className="real-healing-bottom">
        <div className="real-healing-profile">
          <img
            src={item.image || DEFAULT_IMAGE_SRC}
            alt={item.name}
            loading="lazy"
            onError={handleMediaImageError}
          />
          <div>
            <h3 className="real-healing-profile__name">{item.name}</h3>
            {item.location ? (
              <span className="real-healing-profile__meta">{item.location}</span>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

export default function RealHealingSlider() {
  const swiperRef = useRef(null);
  const [items, setItems] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const toggleExpanded = useCallback((id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  useEffect(() => {
    const swiper = swiperRef.current;
    if (!swiper) return;

    requestAnimationFrame(() => {
      if (swiper.el) {
        swiper.el.style.height = expandedId ? "auto" : "";
      }
      if (swiper.wrapperEl) {
        swiper.wrapperEl.style.height = expandedId ? "auto" : "";
      }
      swiper.updateAutoHeight?.(0);
      swiper.update?.();
    });

    if (!swiper.autoplay) return;
    if (expandedId) swiper.autoplay.stop();
    else if (!swiper.autoplay.running) swiper.autoplay.start();
  }, [expandedId]);

  const handleSlideChange = useCallback(() => {
    setExpandedId(null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await fetchRealPeopleTestimonials({ page: 1, limit: 24, platform: "web" });
        if (cancelled) return;
        const rows = Array.isArray(data?.realPeopleTestimonials) ? data.realPeopleTestimonials : [];
        setItems(rows.map(mapHealingTestimonial).filter(Boolean));
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
      <section className="real-healing-section" aria-busy="true" aria-label="Loading real healing stories">
        <div className="site-container">
          <div className="transformation-header">
            <div className="header-left">
              <h2>Real People. Real Healing.</h2>
              <p>{SECTION_SUBHEADING}</p>
            </div>
          </div>
          <SiteLoader variant="inline" label="Loading stories" />
        </div>
      </section>
    );
  }

  if (items.length === 0) {
    return null;
  }

  const showNav = items.length > 1;

  return (
    <section
      className={`real-healing-section${expandedId ? " real-healing-section--expanded" : ""}`}
      aria-label="Real people real healing"
    >
      <div className="site-container">
        <div className="transformation-header real-healing-header">
          <div className="header-left">
            <h2 className="healing-title">Real People. Real Healing.</h2>
            <p className="real-healing-subheading">{SECTION_SUBHEADING}</p>
          </div>

          {showNav ? (
            <div className="leadership-slider__nav" aria-label="Story navigation">
              <button
                type="button"
                className="leadership-slider__navBtn"
                aria-label="Previous story"
                onClick={() => swiperRef.current?.slidePrev()}
              >
                <ChevronLeft size={22} />
              </button>
              <button
                type="button"
                className="leadership-slider__navBtn"
                aria-label="Next story"
                onClick={() => swiperRef.current?.slideNext()}
              >
                <ChevronRight size={22} />
              </button>
            </div>
          ) : null}
        </div>

        <Swiper
          modules={[Autoplay]}
          slidesPerView={1}
          spaceBetween={16}
          loop={false}
          speed={600}
          watchOverflow
          autoHeight
          autoplay={
            items.length > 1
              ? {
                  delay: 3500,
                  disableOnInteraction: true,
                  pauseOnMouseEnter: true,
                }
              : false
          }
          onSwiper={(swiper) => {
            swiperRef.current = swiper;
          }}
          onSlideChange={handleSlideChange}
          breakpoints={{
            0: { slidesPerView: 1, spaceBetween: 14 },
            640: { slidesPerView: 2, spaceBetween: 18 },
            1024: { slidesPerView: 3, spaceBetween: 24 },
          }}
          className="realHealingSwiper"
        >
          {items.map((item) => (
            <SwiperSlide key={item.id}>
              <RealHealingCard
                item={item}
                expanded={expandedId === item.id}
                onToggle={toggleExpanded}
              />
            </SwiperSlide>
          ))}
        </Swiper>

        <p className="real-healing-disclaimer">{SECTION_DISCLAIMER}</p>
      </div>
    </section>
  );
}
