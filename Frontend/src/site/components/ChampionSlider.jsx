import { useCallback, useEffect, useRef, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import "swiper/css";
import { handleMediaImageError, mediaUrl } from "../../media.js";
import { fetchMonthlyChampions } from "../api/publicMisc.js";
import InlineReadMore from "./InlineReadMore.jsx";

function formatMonthLabel(monthYear) {
  const raw = String(monthYear || "").trim();
  if (!/^\d{4}-\d{2}$/.test(raw)) return "";
  const [year, month] = raw.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function championSubtitle(row) {
  const monthLabel = formatMonthLabel(row.monthYear);
  const message = String(row.message || "").trim();
  if (message) return message;

  const parts = [];
  if (monthLabel) parts.push(`Champion of ${monthLabel}!`);
  const score = Number(row.averageScore);
  if (Number.isFinite(score) && score > 0) {
    parts.push(`Average daily reflection score: ${score}%.`);
  }
  const days = Number(row.daysSubmitted);
  if (Number.isFinite(days) && days > 0) {
    parts.push(`${days} days submitted`);
  }
  return parts.join(" ") || "Monthly wellness champion";
}

function championInitial(name) {
  const trimmed = String(name || "").trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : "?";
}

function mapChampion(row) {
  if (!row) return null;

  const id = row.id || row._id;
  const name = String(row.user?.name || "").trim();
  const profileImage = row.user?.profileImage || "";

  if (!id || !name) return null;

  return {
    id,
    name,
    title: "Champion Of The Month",
    subtitle: championSubtitle(row),
    avatar: profileImage ? mediaUrl(profileImage) : "",
    initial: championInitial(name),
    averageScore: row.averageScore,
  };
}

function ChampionCard({ item, expanded, onToggle }) {
  return (
    <article className={`champion-card${expanded ? " champion-card--expanded" : ""}`}>
      <div className="champion-title marginmanages">{item.title}</div>

      <div className="champion-user">
        <div className="champion-avatar">
          {showImage ? (
            <img
              src={item.avatar}
              alt={item.name}
              loading="lazy"
              onError={(event) => {
                handleMediaImageError(event);
                setImageFailed(true);
              }}
            />
          ) : (
            <span className="champion-avatar__initial" aria-hidden="true">
              {item.initial}
            </span>
          )}
        </div>

        <div className="champion-info">
          <h4 className="text-start fonrside">{item.name}</h4>
          {item.subtitle ? (
            <InlineReadMore
              text={item.subtitle}
              expanded={expanded}
              onToggle={() => onToggle(item.id)}
              lines={3}
              className="champion-info__text"
            />
          ) : null}
        </div>
      </div>
    </article>
  );
}

export default function ChampionSlider() {
  const swiperRef = useRef(null);
  const [items, setItems] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const toggleExpanded = useCallback((id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const handleSlideChange = useCallback(() => {
    setExpandedId(null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await fetchMonthlyChampions();
        if (cancelled) return;
        const rows = Array.isArray(data?.monthlyChampions) ? data.monthlyChampions : [];
        setItems(
          rows
            .map(mapChampion)
            .filter(Boolean)
            .sort((a, b) => (Number(b.averageScore) || 0) - (Number(a.averageScore) || 0))
        );
      } catch {
        if (!cancelled) setItems([]);
      }
    })();

    return () => {
      cancelled = true;
    };
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

  if (items === null || items.length === 0) {
    return null;
  }

  const enableLoop = items.length > 1;
  const count = items.length;

  return (
    <section className="champion-section monthly-champions paddingmanage pt-3 pb-3" aria-label="Monthly champions">
      <div className="site-container">
        <div className="monthly-champions__header">
          {/* <span className="monthly-champions__badge">Community Pride</span> */}
          <h2 className="monthly-champions__title">
            Champion of the <span>Month</span>
          </h2>
        </div>

        <Swiper
          className={`monthly-champions__slider monthly-champions__slider--count-${Math.min(count, 3)}`}
          modules={[Autoplay]}
          spaceBetween={24}
          slidesPerView={Math.min(3, count)}
          centeredSlides={count === 1}
          centerInsufficientSlides
          loop={enableLoop}
          autoHeight
          watchOverflow
          autoplay={
            enableLoop
              ? {
                  delay: 2500,
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
            0: {
              slidesPerView: 1,
              centeredSlides: true,
              spaceBetween: 16,
            },
            640: {
              slidesPerView: Math.min(2, count),
              centeredSlides: count === 1,
              centerInsufficientSlides: true,
              spaceBetween: 20,
            },
            992: {
              slidesPerView: Math.min(3, count),
              centeredSlides: count === 1,
              centerInsufficientSlides: true,
              spaceBetween: 24,
            },
          }}
        >
          {items.map((item) => (
            <SwiperSlide key={item.id}>
              <ChampionCard
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
