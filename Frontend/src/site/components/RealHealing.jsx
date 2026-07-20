import { useCallback, useEffect, useRef, useState } from "react";
import { IoStar, IoStarHalf, IoStarOutline } from "react-icons/io5";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import "swiper/css";
import { DEFAULT_IMAGE_SRC, handleMediaImageError, mediaUrl } from "../../media.js";
import { fetchRealPeopleTestimonials } from "../api/publicMisc.js";

const READ_MORE_MIN_CHARS = 120;

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

function memberSinceLabel(row) {
  const year = row?.memberSinceYear ?? row?.user?.memberSinceYear;
  if (year) return `Member since ${year}`;

  if (row?.createdAt) {
    const createdYear = new Date(row.createdAt).getFullYear();
    if (Number.isFinite(createdYear)) return `Member since ${createdYear}`;
  }

  return "Community member";
}

function avatarPath(row) {
  return row?.userAvatar || row?.profileImage || row?.user?.profileImage || "";
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
    memberSince: memberSinceLabel(row),
    stars: row.stars ?? row.rating ?? 5,
    image: imagePath ? mediaUrl(imagePath) : DEFAULT_IMAGE_SRC,
  };
}

function RealHealingCard({ item, expanded, onToggle }) {
  const showToggle = item.review.length > READ_MORE_MIN_CHARS;

  return (
    <article className={`real-healing-card${expanded ? " real-healing-card--expanded" : ""}`}>
      <div className="real-healing-top">
        <HealingStars rating={item.stars} />
        <span className="real-healing-tag">{item.category}</span>
      </div>

      <p className={`real-healing-review${expanded ? " real-healing-review--expanded" : ""}`}>
        &ldquo;{item.review}&rdquo;
      </p>

      {showToggle ? (
        <button
          type="button"
          className="real-healing-more"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggle(item.id);
          }}
          aria-expanded={expanded}
        >
          {expanded ? "Read Less" : "Read More"}
          {expanded ? <ArrowUpRight size={16} aria-hidden /> : <ArrowRight size={16} aria-hidden />}
        </button>
      ) : null}

      <div className="real-healing-bottom">
        <div className="real-healing-profile">
          <img
            src={item.image || DEFAULT_IMAGE_SRC}
            alt={item.name}
            loading="lazy"
            onError={handleMediaImageError}
          />
          <div>
            <h4>{item.name}</h4>
            <span>{item.memberSince}</span>
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
    if (!swiper?.autoplay) return;
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
        const data = await fetchRealPeopleTestimonials({ page: 1, limit: 24 });
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
      <section className="real-healing-section container" aria-busy="true" aria-label="Loading real healing stories">
        <div className="transformation-header">
          <div className="header-left">
            <h2>Real People : Real Healing</h2>
            <p className="real-healing-section__loading">Loading stories…</p>
          </div>
        </div>
      </section>
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="real-healing-section container" aria-label="Real people real healing">
      <h2 className="healing-title">Real People : Real Healing</h2>
      <Swiper
        modules={[Autoplay]}
        slidesPerView={3}
        spaceBetween={25}
        loop={false}
        speed={600}
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
          0: { slidesPerView: 1 },
          640: { slidesPerView: 2 },
          1024: { slidesPerView: 3 },
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
    </section>
  );
}
