import { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import "swiper/css";
import { DEFAULT_IMAGE_SRC, handleMediaImageError, mediaUrl } from "../../media.js";
import { fetchBirthdayPosts } from "../api/publicMisc.js";

const DEFAULT_WISH =
  "Wishing you a day filled with happiness, laughter & beautiful moments";

function mapBirthdayPost(row) {
  if (!row) return null;

  const id = row.id || row._id;
  const name = String(row.user?.name || row.userName || "").trim();
  const message = String(row.message || "").trim();
  const profileImage = row.user?.profileImage || row.profileImage || "";

  if (!id || !name) return null;

  return {
    id,
    name,
    wishes: message || DEFAULT_WISH,
    avatar: profileImage ? mediaUrl(profileImage) : DEFAULT_IMAGE_SRC,
  };
}

export default function BirthdaySlider() {
  const [items, setItems] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await fetchBirthdayPosts({ page: 1, limit: 24 });
        if (cancelled) return;
        const rows = Array.isArray(data?.birthdayPosts) ? data.birthdayPosts : [];
        setItems(rows.map(mapBirthdayPost).filter(Boolean));
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
    <section className="champion-section" aria-label="Birthday wishes">

      <Swiper
      loop={true}
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
            <article className="champion-card birthday-card">
              <div className="birthday-user">
                <div className="champion-avatar">
                  <img
                    src={item.avatar || DEFAULT_IMAGE_SRC}
                    alt={item.name}
                    loading="lazy"
                    onError={handleMediaImageError}
                  />
                </div>

                <div className="birthday-info">
                  <div className="birthday-title">Happy Birthday !</div>
                  <h4>{item.name}</h4>
                  <p>{item.wishes}</p>
                </div>
              </div>
            </article>
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  );
}
