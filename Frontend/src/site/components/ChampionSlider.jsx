import { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import "swiper/css";
import { DEFAULT_IMAGE_SRC, handleMediaImageError, mediaUrl } from "../../media.js";
import { fetchMonthlyChampions } from "../api/publicMisc.js";

function rankLabel(rank) {
  const n = Number(rank);
  if (n === 1) return "Rank #1 Champion";
  if (n === 2) return "Rank #2 Champion";
  if (n === 3) return "Rank #3 Champion";
  if (Number.isFinite(n) && n > 0) return `Rank #${n} Champion`;
  return "Champion Of The Month";
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
    title: rankLabel(row.rank),
    subtitle: championSubtitle(row),
    avatar: profileImage ? mediaUrl(profileImage) : DEFAULT_IMAGE_SRC,
    rank: row.rank,
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
            .sort((a, b) => (Number(a.rank) || 99) - (Number(b.rank) || 99))
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

  return (
    <section className="champion-section" aria-label="Monthly champions">
      <Swiper
        className="container"
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
    </section>
  );
}
