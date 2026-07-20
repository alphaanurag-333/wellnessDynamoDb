import { useCallback, useEffect, useRef, useState } from "react";
import { IoStar, IoStarHalf, IoStarOutline } from "react-icons/io5";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import { DEFAULT_IMAGE_SRC, handleMediaImageError, mediaUrl } from "../../media.js";
import { fetchClientTestimonials } from "../api/publicMisc.js";
import { useClampedOverflow } from "../hooks/useClampedOverflow.js";

function TestimonialStars({ rating }) {
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

  return <div className="success-card__stars">{stars}</div>;
}

function mapTestimonial(row) {
  if (!row) return null;
  const id = row.id || row._id;
  const name = String(row.name || "").trim();
  const review = String(row.description || "").trim();
  if (!id || !name || !review) return null;

  return {
    id,
    name,
    review,
    rating: row.rating,
    image: row.profileImage ? mediaUrl(row.profileImage) : DEFAULT_IMAGE_SRC,
  };
}

function TestimonialCard({ item, expanded, onToggle }) {
  const { ref: reviewRef, overflows } = useClampedOverflow(item.review, expanded);
  const showToggle = expanded || overflows;

  return (
    <article className={`success-card${expanded ? " success-card--expanded" : ""}`}>
      <div className="success-card__top">
        <div className="success-card__avatar">
          <img
            src={item.image || DEFAULT_IMAGE_SRC}
            alt=""
            loading="lazy"
            onError={handleMediaImageError}
          />
        </div>
        <TestimonialStars rating={item.rating} />
      </div>

      <blockquote className="success-card__review">
        <p
          ref={reviewRef}
          className={expanded ? "success-card__review-text--expanded" : undefined}
        >
          {item.review}
        </p>
      </blockquote>

      {showToggle ? (
        <button
          type="button"
          className="success-card__more"
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

      <p className="success-card__author">
        <span>— {item.name}</span>
      </p>
    </article>
  );
}

export default function TestimonialsSection({ items: itemsProp }) {
  const swiperRef = useRef(null);
  const [items, setItems] = useState(() =>
    Array.isArray(itemsProp) ? itemsProp.map(mapTestimonial).filter(Boolean) : null
  );
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
    if (Array.isArray(itemsProp)) {
      setItems(itemsProp.map(mapTestimonial).filter(Boolean));
      setExpandedId(null);
      return undefined;
    }

    let cancelled = false;

    (async () => {
      try {
        const data = await fetchClientTestimonials({ page: 1, limit: 12 });
        if (cancelled) return;
        const rows = Array.isArray(data?.clientTestimonials) ? data.clientTestimonials : [];
        setItems(rows.map(mapTestimonial).filter(Boolean));
      } catch {
        if (!cancelled) setItems([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [itemsProp]);

  if (items === null) {
    return (
      <section className="success-stories" aria-busy="true" aria-label="Loading client reviews">
        <div className="site-container">
          <div className="success-stories__header">
            <h2>Client Reviews</h2>
          </div>
          <p className="site-testimonials__loading">Loading reviews…</p>
        </div>
      </section>
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="success-stories" aria-label="Client reviews">
      <div className="site-container">
        <div className="success-stories__header">
          <h2>Client Reviews</h2>
        </div>

        <Swiper
          modules={[Pagination, Autoplay]}
          slidesPerView={2}
          spaceBetween={28}
          loop={false}
          speed={600}
          autoplay={
            items.length > 1
              ? {
                  delay: 5000,
                  disableOnInteraction: true,
                  pauseOnMouseEnter: true,
                }
              : false
          }
          onSwiper={(swiper) => {
            swiperRef.current = swiper;
          }}
          onSlideChange={handleSlideChange}
          pagination={{
            clickable: true,
          }}
          breakpoints={{
            0: {
              slidesPerView: 1,
              spaceBetween: 14,
            },
            768: {
              slidesPerView: 2,
              spaceBetween: 18,
            },
            992: {
              slidesPerView: 3,
              spaceBetween: 20,
            },
          }}
          className="successStoriesSwiper"
        >
          {items.map((item) => (
            <SwiperSlide key={item.id}>
              <TestimonialCard
                item={item}
                expanded={expandedId === item.id}
                onToggle={toggleExpanded}
              />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
}
