import { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
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

export default function ChampionSlider() {
  const [items, setItems] = useState(null);

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
  const monthHint = items.find((item) => item.monthLabel)?.monthLabel || "";

  return (
    <section className="champion-section monthly-champions" aria-label="Monthly champions">
      <div className="site-container">
        <div className="monthly-champions__header">
          <span className="monthly-champions__badge">Community Pride</span>
          <h2 className="monthly-champions__title">
            Champion of the <span>Month</span>
          </h2>
          {/* <p className="monthly-champions__subtitle">
            {monthHint
              ? `Celebrating top daily reflection consistency for ${monthHint}.`
              : "Celebrating members with outstanding daily reflection consistency."}
          </p> */}
        </div>

        <Swiper
          className=""
          modules={[Autoplay]}
          spaceBetween={24}
          slidesPerView={3}
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
            },
            640: {
              slidesPerView: 2,
            },
            992: {
              slidesPerView: 3,
            },
          }}
        >
          {items.map((item) => (
            <SwiperSlide key={item.id}>
              <article className="champion-card">
                <div className="champion-title">{item.title}</div>

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
                    <h4>{item.name}</h4>
                    <p>{item.subtitle}</p>
                  </div>
                </div>
              </article>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
}
