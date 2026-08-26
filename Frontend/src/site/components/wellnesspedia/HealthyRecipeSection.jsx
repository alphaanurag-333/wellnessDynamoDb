import { useCallback, useEffect, useMemo, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import { handleMediaImageError, mediaUrl } from "../../../media.js";
import {
  fetchConfigDropdownOptions,
  fetchHealthRecipes,
  isSectionLiveOnWeb,
} from "../../api/publicMisc.js";
import { usePagedSwiper } from "../../hooks/usePagedSwiper.js";
import { buildContentCategoryChips } from "./categoryUtils.js";
import ContentCarouselSkeleton from "./ContentCarouselSkeleton.jsx";
import FilterChips from "./FilterChips.jsx";
import MediaDetailModal from "./MediaDetailModal.jsx";

function normalizeSpecs(specs) {
  if (!Array.isArray(specs)) return [];
  return specs
    .map((s) => {
      if (typeof s === "string") return s.trim();
      if (!s || typeof s !== "object") return "";
      return [s.label, s.value, s.text].filter(Boolean).join(" ").trim() || String(s.key || "").trim();
    })
    .filter(Boolean);
}

function mapRecipe(row) {
  if (!row) return null;
  const id = row.id || row._id;
  const title = String(row.title || "").trim();
  if (!id || !title) return null;
  const type = String(row.type || "").toLowerCase();
  const specifications = normalizeSpecs(row.videoSpecification);
  const protein = specifications.find((s) => /protein/i.test(s));
  return {
    id,
    title,
    description: String(row.description || "").trim(),
    thumbnail: row.thumbnail || "",
    type,
    ytLink: row.ytLink || "",
    video: row.video || "",
    badge: protein || specifications[0] || "",
    specifications,
    category: row.category || "",
  };
}

function RecipeCard({ item, onOpen }) {
  const thumb = item.thumbnail ? mediaUrl(item.thumbnail) || item.thumbnail : "";
  const hasMedia = Boolean(item.ytLink || item.video);

  return (
    <button type="button" className="wp-recipe-card" onClick={() => onOpen(item)}>
      <div className="wp-recipe-card__media">
        {thumb ? (
          <img src={thumb} alt="" loading="lazy" onError={handleMediaImageError} />
        ) : (
          <div className="wp-recipe-card__placeholder" />
        )}
        {hasMedia ? (
          <span className="wp-recipe-card__play" aria-hidden>
            <Play size={18} fill="currentColor" />
          </span>
        ) : null}
      </div>
      <div className="wp-recipe-card__body">
        <div className="wp-recipe-card__title-row">
          <h3>{item.title}</h3>
          {item.badge ? <span className="wp-chip-badge">{item.badge}</span> : null}
        </div>
        <p>{item.description || "\u00A0"}</p>
      </div>
    </button>
  );
}

export default function HealthyRecipeSection() {
  const [webLive, setWebLive] = useState(null);
  const [category, setCategory] = useState("");
  const [selected, setSelected] = useState(null);
  const [chips, setChips] = useState([{ label: "All", value: "" }]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const live = await isSectionLiveOnWeb("recipes");
      if (!cancelled) setWebLive(live);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (webLive !== true) return undefined;
    let cancelled = false;

    (async () => {
      try {
        const [options, data] = await Promise.all([
          fetchConfigDropdownOptions("recipe-category"),
          fetchHealthRecipes({ page: 1, limit: 100, platform: "web" }),
        ]);
        if (cancelled) return;
        const rows = Array.isArray(data?.healthRecipes) ? data.healthRecipes : [];
        const next = buildContentCategoryChips({
          rows,
          options,
          allLabel: "All",
        });
        setChips(next);
        setCategory((prev) =>
          next.some((chip) => chip.value === prev) ? prev : ""
        );
      } catch {
        if (!cancelled) setChips([{ label: "All", value: "" }]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [webLive]);

  const fetchPage = useCallback(
    async ({ page, limit }) => {
      if (webLive !== true) {
        return { items: [], pagination: { page, limit, total: 0, pages: 0 } };
      }
      const params = { page, limit, platform: "web" };
      if (category) params.category = category;
      const data = await fetchHealthRecipes(params);
      const rows = Array.isArray(data?.healthRecipes) ? data.healthRecipes : [];
      return {
        items: rows.map(mapRecipe).filter(Boolean),
        pagination: data?.pagination,
      };
    },
    [category, webLive]
  );

  const {
    items,
    initialLoading,
    refreshing,
    loadingMore,
    swiperRef,
    maybeLoadMore,
  } = usePagedSwiper({
    fetchPage,
    pageSize: 10,
    deps: [category, webLive],
  });

  const hasItems = items.length > 0;
  const showNav = hasItems || refreshing;

  const breakpoints = useMemo(
    () => ({
      0: { slidesPerView: 1.15, spaceBetween: 14 },
      640: { slidesPerView: 2, spaceBetween: 16 },
      992: { slidesPerView: 3, spaceBetween: 18 },
      1200: { slidesPerView: 4, spaceBetween: 20 },
    }),
    []
  );

  if (webLive !== true) return null;
  if (!initialLoading && !refreshing && !hasItems && !category) return null;

  return (
    <section className="wp-section wp-recipes backgroundapply" aria-label="Healthy recipes">
      <div className="site-container">
        <div className="wp-section__header">
          <h2>Healthy Recipe</h2>
          {showNav ? (
            <div className="leadership-slider__nav">
              <button
                type="button"
                className="leadership-slider__navBtn"
                aria-label="Previous recipes"
                disabled={refreshing || !hasItems}
                onClick={() => swiperRef.current?.slidePrev()}
              >
                <ChevronLeft size={22} />
              </button>
              <button
                type="button"
                className="leadership-slider__navBtn"
                aria-label="Next recipes"
                disabled={refreshing || !hasItems}
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

        {chips.length > 1 ? (
          <FilterChips
            chips={chips}
            value={category}
            onChange={setCategory}
            ariaLabel="Recipe categories"
          />
        ) : null}

        <div className="wp-carousel-stage">
          {initialLoading || refreshing ? (
            <ContentCarouselSkeleton count={2} variant="recipe" />
          ) : hasItems ? (
            <>
              <Swiper
                key={`recipes-${category || "all"}`}
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
                    <RecipeCard item={item} onOpen={setSelected} />
                  </SwiperSlide>
                ))}
              </Swiper>
              {loadingMore ? (
                <p className="wp-section__loading wp-section__loading--more" aria-live="polite">
                  Loading more…
                </p>
              ) : null}
            </>
          ) : (
            <p className="wp-section__empty">No recipes in this category yet.</p>
          )}
        </div>
      </div>

      <MediaDetailModal open={Boolean(selected)} item={selected} onClose={() => setSelected(null)} />
    </section>
  );
}
