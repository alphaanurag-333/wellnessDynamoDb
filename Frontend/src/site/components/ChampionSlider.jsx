import { useEffect, useRef, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import "swiper/css";
import { DEFAULT_IMAGE_SRC, handleMediaImageError, mediaUrl } from "../../media.js";
import { fetchMonthlyChampions } from "../api/publicMisc.js";

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
  const message = String(row.message || "").trim();
  if (message) return message;

  const parts = [];
  const score = Number(row.averageScore);
  if (Number.isFinite(score) && score > 0) {
    parts.push(`Avg. reflection score: ${score}%`);
  }

  const days = Number(row.daysSubmitted);
  if (Number.isFinite(days) && days > 0) {
    parts.push(`${days} days submitted`);
  }

  return parts.join(" · ") || "Monthly wellness champion";
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
    avatar: profileImage ? mediaUrl(profileImage) : DEFAULT_IMAGE_SRC,
    averageScore: row.averageScore,
    monthLabel: formatMonthLabel(row.monthYear),
  };
}

function ChampionCard({ item, expanded, onToggle }) {
  const [needsToggle, setNeedsToggle] = useState(false);
  const textRef = useRef(null);

  useEffect(() => {
    const el = textRef.current;
    if (!el || expanded) return undefined;

    const measure = () => {
      setNeedsToggle(el.scrollHeight > el.clientHeight + 1);
    };

    measure();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    observer?.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [item.subtitle, expanded]);

  const showToggle = needsToggle || expanded;

  return (
    <article className={`champion-card${expanded ? " champion-card--expanded" : ""}`}>
      <div className="champion-title marginmanages">{item.title}</div>

      <div className="champion-user">
        <div className="champion-avatar">
          <img
            src={item.avatar || DEFAULT_IMAGE_SRC}
            alt={item.name}
            loading="lazy"
            onError={handleMediaImageError}
          />
        </div>

        <div className="champion-info">
          <h4 className="text-start fonrside">{item.name}</h4>
          <p
            ref={textRef}
            className={expanded ? "champion-info__text" : "champion-info__text champion-info__text--clamped"}
          >
            {item.subtitle}
          </p>
          {showToggle ? (
            <button
              type="button"
              className="champion-info__more"
              onClick={() => onToggle(item.id)}
              aria-expanded={expanded}
            >
              {expanded ? "Read Less" : "Read More"}
              {expanded ? <ArrowUpRight size={16} aria-hidden /> : <ArrowRight size={16} aria-hidden />}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export default function ChampionSlider() {
  const [items, setItems] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

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

  if (items === null || items.length === 0) {
    return null;
  }

  const enableLoop = items.length > 1;
  const count = items.length;

  const toggleExpanded = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <section className="champion-section monthly-champions paddingmanage pt-3 pb-3" aria-label="Monthly champions">
      <div className="site-container">
        <div className="monthly-champions__header">
          <span className="monthly-champions__badge">Community Pride</span>
          <h2 className="monthly-champions__title displaychampion">
            Champion of the <span>Month</span>
          </h2>
        </div>

        <Swiper
        loop={true}
          className={`monthly-champions__slider monthly-champions__slider--count-${Math.min(count, 3)}`}
          modules={[Autoplay]}
          spaceBetween={24}
          slidesPerView={Math.min(3, count)}
          centeredSlides={count === 1}
          centerInsufficientSlides
          loop={enableLoop}
          autoplay={
            enableLoop
              ? {
                  delay: 2500,
                  disableOnInteraction: false,
                }
              : false
          }
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
