import { useEffect, useRef, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import { ChevronLeft, ChevronRight, Clock3 } from "lucide-react";
import { handleMediaImageError, mediaUrl } from "../../media.js";
import { fetchTransformations } from "../api/publicMisc.js";

function parseTags(achievements, timeTaken, inchesLost) {
  const tags = String(achievements || "")
    .split(/[,|\n]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 3);

  const months = Number(timeTaken);
  if (Number.isFinite(months) && months > 0) {
    tags.push(`${months} ${months === 1 ? "Month" : "Months"}`);
  }

  const inches = Number(inchesLost);
  if (Number.isFinite(inches) && inches > 0) {
    tags.push(`${inches} ${inches === 1 ? "Inch Lost" : "Inches Lost"}`);
  }

  return tags;
}

function mapTransformation(row) {
  if (!row) return null;

  const id = row.id || row._id;
  const name = String(row.name || "").trim();
  const description = String(row.description || "").trim();
  const oldImage = row.oldImage ? mediaUrl(row.oldImage) : "";
  const newImage = row.newImage ? mediaUrl(row.newImage) : "";

  if (!id || !name || !description || !oldImage || !newImage) return null;

  return {
    id,
    name,
    description,
    oldImage,
    newImage,
    tags: parseTags(row.achievements, row.timeTaken, row.inchesLost),
    timeTaken: row.timeTaken,
  };
}

function TransformationStoryCard({ item }) {
  return (
    <article className="transformation-story-card">
      <div className="transformation-story-card__compare">
        <figure className="transformation-story-card__photo">
          <span className="transformation-story-card__label">Before</span>
          <img
            src={item.oldImage}
            alt={`${item.name} before transformation`}
            loading="lazy"
            onError={handleMediaImageError}
          />
        </figure>
        <figure className="transformation-story-card__photo transformation-story-card__photo--after">
          <span className="transformation-story-card__label transformation-story-card__label--after">After</span>
          <img
            src={item.newImage}
            alt={`${item.name} after transformation`}
            loading="lazy"
            onError={handleMediaImageError}
          />
        </figure>
      </div>

      {item.tags.length > 0 ? (
        <div className="transformation-story-card__tags">
          {item.tags.map((tag, index) => (
            <span key={`${item.id}-${tag}`} className={`transformation-story-card__tag tag-${index % 4}`}>
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      <div className="transformation-story-card__body">
        <h3>{item.name}</h3>
        <p>{item.description}</p>
        {item.timeTaken ? (
          <div className="transformation-story-card__meta">
            <Clock3 size={16} aria-hidden />
            <span>{item.timeTaken} {Number(item.timeTaken) === 1 ? "month" : "months"} journey</span>
          </div>
        ) : null}
      </div>
    </article>
  );
}

export default function TransformationStoriesSection() {
  const swiperRef = useRef(null);
  const [transformations, setTransformations] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await fetchTransformations({ page: 1, limit: 24 });
        if (cancelled) return;
        const rows = Array.isArray(data?.transformations) ? data.transformations : [];
        setTransformations(rows.map(mapTransformation).filter(Boolean));
      } catch {
        if (!cancelled) setTransformations([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const transformationsLoading = transformations === null;
  const hasTransformations = Boolean(transformations?.length);

  return (
    <section className="transformation-section pb-3" aria-label="Real transformations">
      <div className="container">
        {/* <div className="transformation-header ">
          <div className="header-left">
            <h2>Transformations</h2>
            <p>Swipe to see before-and-after results from our community</p>
          </div>

          {hasTransformations ? (
            <div className="slider-navigation">
              <button
                type="button"
                className="slider-btn"
                aria-label="Previous transformation"
                onClick={() => swiperRef.current?.slidePrev()}
              >
                <ChevronLeft size={20} />
              </button>
              <button
                type="button"
                className="slider-btn"
                aria-label="Next transformation"
                onClick={() => swiperRef.current?.slideNext()}
              >
                <ChevronRight size={20} />
              </button>
            </div>
          ) : null}
        </div> */}

<div className="transformation-header mb-2">
          <div className="header-left">
            <h2>Transformations</h2>
            <p>Swipe to see before-and-after results from our community</p>
          </div>
         
        {hasTransformations ? (
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
        {transformationsLoading ? (
          <p className="transformation-section__loading">Loading transformations…</p>
        ) : hasTransformations ? (
          <Swiper loop={true}
            slidesPerView={1}
            spaceBetween={16}
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
                spaceBetween: 28,
              },
              1024: {
                slidesPerView: 3,
                spaceBetween: 28,
              },
            }}
            className="transformationStoriesSwiper"
          >
            {transformations.map((item) => (
              <SwiperSlide key={item.id}>
                <TransformationStoryCard item={item} />
              </SwiperSlide>
            ))}
          </Swiper>
        ) : (
          <p className="transformation-section__empty">
            Transformation stories will appear here once they are published in the admin panel.
          </p>
        )}
      </div>
    </section>
  );
}
