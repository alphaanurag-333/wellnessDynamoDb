import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import { ArrowRight, ArrowUpRight, ChevronLeft, ChevronRight, Clock3 } from "lucide-react";
import { handleMediaImageError, mediaUrl } from "../../media.js";
import { fetchTransformations } from "../api/publicMisc.js";
import { SiteLoader } from "./SiteLoader.jsx";

const PAGE_SIZE = 10;

function fieldKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function findDataPoint(points, keys) {
  return (Array.isArray(points) ? points : []).find((row) => {
    const key = fieldKey(row?.field) || fieldKey(row?.label);
    return keys.has(key);
  });
}

function parsePositiveNumber(value) {
  const match = String(value ?? "").replace(/,/g, "").match(/\d+(\.\d+)?/);
  if (!match) return null;
  const num = Number(match[0]);
  return Number.isFinite(num) && num > 0 ? num : null;
}

/**
 * Prefer admin data-point values. If that point exists but is empty, treat as unset
 * (do not fall back to old defaulted timeTaken/inchesLost = 1).
 */
function resolveOptionalMetric(row, fieldName, pointKeys) {
  const point = findDataPoint(row?.dataPoints, pointKeys);
  if (point) {
    const raw = String(point.value ?? "").trim();
    if (!raw) return null;
    return parsePositiveNumber(raw);
  }
  if (row?.[fieldName] == null || row?.[fieldName] === "") return null;
  return parsePositiveNumber(row[fieldName]);
}

/**
 * Inches tag: default without "Lost" (weight copy can still say lost).
 * Admin flexibility — if the value already includes "Lost" / custom wording, keep it.
 */
function formatInchesTag(inchesLost, inchesRaw) {
  if (inchesLost == null) return null;
  const raw = String(inchesRaw || "").trim();
  const unit = inchesLost === 1 ? "inch" : "inches";

  if (raw && !/^\d+(\.\d+)?$/.test(raw)) {
    if (/\blost\b/i.test(raw)) {
      if (/inch/i.test(raw)) return raw;
      return `${inchesLost} ${unit} Lost`;
    }
    if (/inch/i.test(raw)) return raw;
    return raw;
  }

  return `${inchesLost} ${unit}`;
}

function parseTags(achievements, inchesLost, inchesRaw) {
  const tags = String(achievements || "")
    .split(/[,|\n]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => !/^\d+(\.\d+)?\s*(month|months|inch|inches)(\s+lost)?$/i.test(part))
    .slice(0, 3);

  const inchesTag = formatInchesTag(inchesLost, inchesRaw);
  if (inchesTag) tags.push(inchesTag);

  return tags;
}

function firstName(fullName) {
  const first = String(fullName || "").trim().split(/\s+/)[0];
  return first || "their";
}

function transformationLinkLabel(name) {
  const first = firstName(name);
  const possessive = /s$/i.test(first) ? `${first}'` : `${first}'s`;
  return `Read ${possessive} Transformation`;
}

function mapTransformation(row) {
  if (!row) return null;

  const id = row.id || row._id;
  const name = String(row.name || "").trim();
  const description = String(row.description || "").trim();
  const oldImage = row.oldImage ? mediaUrl(row.oldImage) : "";
  const newImage = row.newImage ? mediaUrl(row.newImage) : "";

  if (!id || !name || !description || !oldImage || !newImage) return null;

  const inchesPoint = findDataPoint(
    row?.dataPoints,
    new Set(["inches_lost", "inches", "waist"]),
  );
  const timeTaken = resolveOptionalMetric(
    row,
    "timeTaken",
    new Set(["duration", "time_taken", "months"]),
  );
  const inchesLost = resolveOptionalMetric(
    row,
    "inchesLost",
    new Set(["inches_lost", "inches", "waist"]),
  );
  const inchesRaw = String(inchesPoint?.value ?? "").trim();

  return {
    id,
    name,
    description,
    oldImage,
    newImage,
    tags: parseTags(row.achievements, inchesLost, inchesRaw),
    timeTaken,
    inchesLost,
    storyLabel: transformationLinkLabel(name),
  };
}

function TransformationStoryCard({ item, onExpandChange }) {
  const [expanded, setExpanded] = useState(false);
  const captionRef = useRef(null);
  const [overflows, setOverflows] = useState(false);

  useLayoutEffect(() => {
    const el = captionRef.current;
    if (!el) return undefined;

    const measure = () => {
      const wasExpanded = el.classList.contains("transformation-story-card__caption--expanded");
      if (wasExpanded) el.classList.remove("transformation-story-card__caption--expanded");
      const nextOverflows = el.scrollHeight > el.clientHeight + 1;
      if (wasExpanded) el.classList.add("transformation-story-card__caption--expanded");
      setOverflows(nextOverflows);
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
  }, [item.description]);

  const showToggle = overflows || expanded;

  function toggleExpanded(event) {
    event.preventDefault();
    event.stopPropagation();
    setExpanded((prev) => {
      const next = !prev;
      queueMicrotask(() => onExpandChange?.(next));
      return next;
    });
  }

  return (
    <article className={`transformation-story-card${expanded ? " transformation-story-card--expanded" : ""}`}>
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
        <p
          ref={captionRef}
          className={`transformation-story-card__caption${expanded ? " transformation-story-card__caption--expanded" : ""}`}
        >
          {item.description}
        </p>

        {showToggle ? (
          <button
            type="button"
            className="transformation-story-card__more"
            onClick={toggleExpanded}
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
          <span className="transformation-story-card__more transformation-story-card__more--spacer" aria-hidden>
            {item.storyLabel}
          </span>
        )}

        {item.timeTaken != null ? (
          <div className="transformation-story-card__meta">
            <Clock3 size={16} aria-hidden />
            <span>
              {item.timeTaken} {item.timeTaken === 1 ? "month" : "months"} journey
            </span>
          </div>
        ) : null}
      </div>
    </article>
  );
}

export default function TransformationStoriesSection() {
  const swiperRef = useRef(null);
  const pageRef = useRef(0);
  const hasMoreRef = useRef(true);
  const loadingRef = useRef(false);
  const seenIdsRef = useRef(new Set());

  const [transformations, setTransformations] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMoreRef.current) return;

    loadingRef.current = true;
    const nextPage = pageRef.current + 1;
    if (nextPage > 1) setLoadingMore(true);

    try {
      const data = await fetchTransformations({ page: nextPage, limit: PAGE_SIZE, platform: "web" });
      const rows = Array.isArray(data?.transformations) ? data.transformations : [];
      const mapped = rows.map(mapTransformation).filter(Boolean).filter((item) => {
        if (seenIdsRef.current.has(item.id)) return false;
        seenIdsRef.current.add(item.id);
        return true;
      });

      setTransformations((prev) => (nextPage === 1 ? mapped : [...prev, ...mapped]));

      const pagination = data?.pagination;
      const totalPages = Math.max(1, Number(pagination?.pages) || 1);
      const received = rows.length;
      const moreByPage = nextPage < totalPages;
      const moreByBatch = received >= PAGE_SIZE;
      hasMoreRef.current =
        received > 0 && (moreByPage || (pagination?.pages == null && moreByBatch));
      pageRef.current = nextPage;

      queueMicrotask(() => {
        const swiper = swiperRef.current;
        if (!swiper || !hasMoreRef.current || loadingRef.current) return;
        if (swiper.isEnd) {
          loadMore();
        }
      });
    } catch {
      if (nextPage === 1) {
        setTransformations([]);
        hasMoreRef.current = false;
      }
    } finally {
      loadingRef.current = false;
      setLoadingMore(false);
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMore();
  }, [loadMore]);

  useEffect(() => {
    const swiper = swiperRef.current;
    if (!swiper) return;
    swiper.update();
  }, [transformations]);

  const maybeLoadMore = useCallback(
    (swiper) => {
      if (!swiper || !hasMoreRef.current || loadingRef.current) return;
      const perView = Math.ceil(Number(swiper.params.slidesPerView) || 1);
      const nearEnd = swiper.activeIndex >= swiper.slides.length - perView - 1;
      if (nearEnd || swiper.isEnd) {
        loadMore();
      }
    },
    [loadMore],
  );

  const hasTransformations = transformations.length > 0;

  return (
    <>
      {hasTransformations ? (
        <section className="transformation-section pb-3" aria-label="Real transformations">
          <div className="site-container">
            <div className="transformation-header mb-2">
              <div className="header-left">
                <h2>Transformations</h2>
                <p>Real Transformations. Measurable Progress.</p>
              </div>

              {hasTransformations ? (
                <div className="leadership-slider__nav">
                  <button
                    onClick={() => swiperRef.current?.slidePrev()}
                    type="button"
                    className="leadership-slider__navBtn"
                    aria-label="Previous transformation"
                  >
                    <ChevronLeft size={22} />
                  </button>
                  <button
                    onClick={() => {
                      swiperRef.current?.slideNext();
                      maybeLoadMore(swiperRef.current);
                    }}
                    type="button"
                    className="leadership-slider__navBtn"
                    aria-label="Next transformation"
                  >
                    <ChevronRight size={22} />
                  </button>
                </div>
              ) : null}
            </div>

            {initialLoading ? (
              <SiteLoader variant="inline" label="Loading transformations" />
            ) : hasTransformations ? (
              <>
                <Swiper
                  slidesPerView={1}
                  spaceBetween={16}
                  speed={700}
                  watchOverflow
                  preventClicks={false}
                  preventClicksPropagation={false}
                  onSwiper={(swiper) => {
                    swiperRef.current = swiper;
                    maybeLoadMore(swiper);
                  }}
                  onSlideChange={maybeLoadMore}
                  onReachEnd={maybeLoadMore}
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
                      <TransformationStoryCard
                        item={item}
                        onExpandChange={() => {
                          requestAnimationFrame(() => {
                            swiperRef.current?.update?.();
                          });
                        }}
                      />
                    </SwiperSlide>
                  ))}
                </Swiper>
                {loadingMore ? (
                  <p
                    className="transformation-section__loading transformation-section__loading--more"
                    aria-live="polite"
                  >
                    Loading more…
                  </p>
                ) : null}
              </>
            ) : (
              <p className="transformation-section__empty">
                Transformation stories will appear here once they are published in the admin panel.
              </p>
            )}
          </div>
        </section>
      ) : null}
    </>
  );
}
