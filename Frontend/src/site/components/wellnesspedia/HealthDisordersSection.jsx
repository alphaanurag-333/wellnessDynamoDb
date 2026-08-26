import { useCallback, useEffect, useMemo, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import { ChevronLeft, ChevronRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { fetchHealthDisorders, isSectionLiveOnWeb } from "../../api/publicMisc.js";
import { usePagedSwiper } from "../../hooks/usePagedSwiper.js";

const ACCENTS = ["#3B82F6", "#F97316", "#22C55E", "#EAB308", "#A855F7", "#EC4899"];

const PREVIEW_SYMPTOMS = 3;

function mapDisorder(row, index) {
  if (!row) return null;
  const id = row.id || row._id;
  const title = String(row.title || "").trim();
  if (!id || !title) return null;
  const symptoms = Array.isArray(row.symptoms)
    ? row.symptoms.map((s) => String(s || "").trim()).filter(Boolean)
    : String(row.description || "")
        .split(/[;\n•]+/)
        .map((s) => s.trim())
        .filter(Boolean);
  return {
    id,
    title,
    symptoms,
    accent: ACCENTS[index % ACCENTS.length],
  };
}

function DisorderCard({ item }) {
  const [expanded, setExpanded] = useState(false);
  const extra = item.symptoms.length > PREVIEW_SYMPTOMS;
  const visible = extra && !expanded
    ? item.symptoms.slice(0, PREVIEW_SYMPTOMS)
    : item.symptoms;

  return (
    <article className="wp-disorder-card" style={{ borderTopColor: item.accent }}>
      <h3>{item.title}</h3>
      <p className="wp-disorder-card__label">Clinical Symptoms</p>
      {item.symptoms.length > 0 ? (
        <>
          <ul>
            {visible.map((symptom, index) => (
              <li key={`${item.id}-${index}`}>{symptom}</li>
            ))}
          </ul>
          {extra ? (
            <button
              type="button"
              className="wp-disorder-card__more"
              aria-expanded={expanded}
              onClick={(event) => {
                event.stopPropagation();
                setExpanded((open) => !open);
              }}
            >
              {expanded ? "Read Less" : "Read More"}
              {expanded ? <ArrowUpRight size={16} aria-hidden /> : <ArrowRight size={16} aria-hidden />}
            </button>
          ) : null}
        </>
      ) : (
        <p className="wp-disorder-card__empty">Details coming soon.</p>
      )}
    </article>
  );
}

export default function HealthDisordersSection() {
  const [webLive, setWebLive] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const live = await isSectionLiveOnWeb("health-disorders");
      if (!cancelled) setWebLive(live);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchPage = useCallback(
    async ({ page, limit }) => {
      if (webLive !== true) {
        return { items: [], pagination: { page, limit, total: 0, pages: 0 } };
      }
      const data = await fetchHealthDisorders({ page, limit, platform: "web" });
      const rows = Array.isArray(data?.healthDisorders) ? data.healthDisorders : [];
      return {
        items: rows.map((row, i) => mapDisorder(row, i)).filter(Boolean),
        pagination: data?.pagination,
      };
    },
    [webLive]
  );

  const { items, initialLoading, loadingMore, swiperRef, maybeLoadMore } = usePagedSwiper({
    fetchPage,
    pageSize: 10,
    deps: [webLive],
  });

  const hasItems = items.length > 0;

  const breakpoints = useMemo(
    () => ({
      0: { slidesPerView: 1.1, spaceBetween: 14 },
      640: { slidesPerView: 2, spaceBetween: 18 },
      992: { slidesPerView: 3, spaceBetween: 20 },
      1200: { slidesPerView: 4, spaceBetween: 22 },
    }),
    []
  );

  if (webLive !== true) return null;
  if (!initialLoading && !hasItems) return null;

  return (
    <section className="wp-section wp-disorders" aria-label="Health disorders">
      <div className="site-container">
        <div className="wp-section__header">
          <h2>Health Disorders</h2>
          {hasItems ? (
            <div className="leadership-slider__nav">
              <button
                type="button"
                className="leadership-slider__navBtn"
                aria-label="Previous disorders"
                onClick={() => swiperRef.current?.slidePrev()}
              >
                <ChevronLeft size={22} />
              </button>
              <button
                type="button"
                className="leadership-slider__navBtn"
                aria-label="Next disorders"
                onClick={() => {
                  swiperRef.current?.slideNext();
                  maybeLoadMore(swiperRef.current);
                }}
              >
                <ChevronRight size={22} />
              </button>
            </div>
          ) : null}
        </div>

        {initialLoading ? (
          <p className="wp-section__loading">Loading health disorders…</p>
        ) : (
          <>
            <Swiper
              spaceBetween={18}
              speed={650}
              watchOverflow
              breakpoints={breakpoints}
              onSwiper={(swiper) => {
                swiperRef.current = swiper;
                maybeLoadMore(swiper);
              }}
              onSlideChange={maybeLoadMore}
              onReachEnd={maybeLoadMore}
              className="wp-content-swiper"
            >
              {items.map((item) => (
                <SwiperSlide key={item.id}>
                  <DisorderCard item={item} />
                </SwiperSlide>
              ))}
            </Swiper>
            {loadingMore ? (
              <p className="wp-section__loading wp-section__loading--more" aria-live="polite">
                Loading more…
              </p>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
