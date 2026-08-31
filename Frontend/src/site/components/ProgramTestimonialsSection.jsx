import { useEffect, useRef, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DEFAULT_IMAGE_SRC, handleMediaImageError, mediaUrl } from "../../media.js";
import { fetchProgramTestimonials } from "../api/publicMisc.js";
import { getProgramTestimonialMeta, programTestimonialTypeMatches } from "../constants/programTestimonials.js";
import { SiteLoader } from "./SiteLoader.jsx";
import InlineReadMore from "./InlineReadMore.jsx";

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

      <InlineReadMore
        as="blockquote"
        text={`\u201c${item.description}\u201d`}
        expanded={expanded}
        onToggle={() => onToggle(item.id)}
        lines={5}
        className="program-testimonial-card__quote"
      />
    </article>
  );
}

export default function ProgramTestimonialsSection({ type, title, subtitle }) {
  const swiperRef = useRef(null);
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
        const data = await fetchProgramTestimonials({ page: 1, limit: 200 });
        if (cancelled) return;
        const allRows = Array.isArray(data?.programTestimonials) ? data.programTestimonials : [];
        const rows = allRows.filter((row) => programTestimonialTypeMatches(row?.type, type));
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
        {/* <div className="transformation-header">
          <div className="header-left">
            <h2>{sectionTitle}</h2>
            <p>{sectionSubtitle}</p>
          </div>

          {hasTestimonials ? (
            <div className="slider-navigation">
              <button
                type="button"
                className="slider-btn"
                aria-label="Previous testimonial"
                onClick={() => swiperRef.current?.slidePrev()}
              >
                <ChevronLeft size={20} />
              </button>
              <button
                type="button"
                className="slider-btn"
                aria-label="Next testimonial"
                onClick={() => swiperRef.current?.slideNext()}
              >
                <ChevronRight size={20} />
              </button>
            </div>
          ) : null}
        </div> */}
<div className="transformation-header mb-2">
          <div className="header-left">
            <h2>{sectionTitle}</h2>
            <p>{sectionSubtitle}</p>
          </div>
         
        {testimonials?.length > 3 ? (
          <div className="leadership-slider__nav">
            <button onClick={() => swiperRef.current?.slidePrev()} type="button" className="leadership-slider__navBtn" aria-label="Previous note">
              <ChevronLeft size={22} />
            </button>
            <button onClick={() => swiperRef.current?.slideNext()} type="button" className="leadership-slider__navBtn" aria-label="Next note">
              <ChevronRight size={22} />
            </button>
          </div>
        ) : null}
 </div>
        {loading ? (
          <SiteLoader variant="inline" label="Loading testimonials" />
        ) : (
          <Swiper
          loop={true}
            slidesPerView={3}
            spaceBetween={28}
            speed={700}
            onSwiper={(swiper) => {
              swiperRef.current = swiper;
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
