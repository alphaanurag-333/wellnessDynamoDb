import { useEffect, useRef, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import { ArrowRight, ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { DEFAULT_IMAGE_SRC, handleMediaImageError, mediaUrl } from "../../media.js";
import { fetchProgramTestimonials } from "../api/publicMisc.js";
import { getProgramTestimonialMeta } from "../constants/programTestimonials.js";

const READ_MORE_MIN_CHARS = 140;

function mapProgramTestimonial(row) {
  if (!row) return null;

  const id = row.id || row._id;
  const name = String(row.name || "").trim();
  const description = String(row.description || "").trim();
  if (!id || !name || !description) return null;

  return {
    id,
    name,
    description,
    image: row.profileImage ? mediaUrl(row.profileImage) : DEFAULT_IMAGE_SRC,
  };
}

function ProgramTestimonialCard({ item, expanded, onToggle }) {
  const showToggle = item.description.length > READ_MORE_MIN_CHARS;

  return (
    <article className={`program-testimonial-card${expanded ? " program-testimonial-card--expanded" : ""}`}>
      <div className="program-testimonial-card__header">
        <div className="program-testimonial-card__avatar">
          <img
            src={item.image || DEFAULT_IMAGE_SRC}
            alt={item.name}
            loading="lazy"
            onError={handleMediaImageError}
          />
        </div>
        <div className="program-testimonial-card__meta">
          <h3 className="program-testimonial-card__name">{item.name}</h3>
        </div>
      </div>

      <blockquote
        className={`program-testimonial-card__quote${expanded ? " program-testimonial-card__quote--expanded" : ""}`}
      >
        <p>&ldquo;{item.description}&rdquo;</p>
      </blockquote>

      {showToggle ? (
        <button
          type="button"
          className="program-testimonial-card__link"
          onClick={() => onToggle(item.id)}
          aria-expanded={expanded}
        >
          {expanded ? "Read Less" : "Read More"}
          {expanded ? <ArrowUpRight size={18} aria-hidden /> : <ArrowRight size={18} aria-hidden />}
        </button>
      ) : null}
    </article>
  );
}

export default function ProgramTestimonialsSection({ type, title, subtitle }) {
  const prevRef = useRef(null);
  const nextRef = useRef(null);
  const [testimonials, setTestimonials] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const meta = getProgramTestimonialMeta(type);
  const sectionTitle = title || meta.sectionTitle;
  const sectionSubtitle = subtitle || meta.sectionSubtitle;

  const toggleExpanded = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  useEffect(() => {
    if (!type) {
      setTestimonials([]);
      return undefined;
    }

    let cancelled = false;
    setExpandedId(null);

    (async () => {
      try {
        const data = await fetchProgramTestimonials({ type, page: 1, limit: 24 });
        if (cancelled) return;
        const rows = Array.isArray(data?.programTestimonials) ? data.programTestimonials : [];
        setTestimonials(rows.map(mapProgramTestimonial).filter(Boolean));
      } catch {
        if (!cancelled) setTestimonials([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [type]);

  const loading = testimonials === null;
  const hasTestimonials = Boolean(testimonials?.length);

  if (!loading && !hasTestimonials) {
    return null;
  }

  return (
    <section
      className="transformation-section program-testimonials-section"
      aria-label={`${meta.label} testimonials`}
    >
      <div className="container">
        <div className="transformation-header">
          <div className="header-left">
            <h2>{sectionTitle}</h2>
            <p>{sectionSubtitle}</p>
          </div>

          {hasTestimonials ? (
            <div className="slider-navigation">
              <button ref={prevRef} type="button" className="slider-btn" aria-label="Previous testimonial">
                <ChevronLeft size={20} />
              </button>
              <button ref={nextRef} type="button" className="slider-btn" aria-label="Next testimonial">
                <ChevronRight size={20} />
              </button>
            </div>
          ) : null}
        </div>

        {loading ? (
          <p className="transformation-section__loading">Loading testimonials…</p>
        ) : (
          <Swiper
            modules={[Navigation]}
            slidesPerView={3}
            spaceBetween={28}
            speed={700}
            navigation={{
              prevEl: prevRef.current,
              nextEl: nextRef.current,
            }}
            onSwiper={(swiper) => {
              setTimeout(() => {
                swiper.params.navigation.prevEl = prevRef.current;
                swiper.params.navigation.nextEl = nextRef.current;
                swiper.navigation.destroy();
                swiper.navigation.init();
                swiper.navigation.update();
              });
            }}
            breakpoints={{
              0: {
                slidesPerView: 1,
                spaceBetween: 16,
              },
              768: {
                slidesPerView: 2,
                spaceBetween: 22,
              },
              992: {
                slidesPerView: 3,
                spaceBetween: 28,
              },
            }}
            className="programTestimonialsSwiper"
          >
            {testimonials.map((item) => (
              <SwiperSlide key={item.id}>
                <ProgramTestimonialCard
                  item={item}
                  expanded={expandedId === item.id}
                  onToggle={toggleExpanded}
                />
              </SwiperSlide>
            ))}
          </Swiper>
        )}
      </div>
    </section>
  );
}
