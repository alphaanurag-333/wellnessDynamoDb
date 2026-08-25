import { useEffect, useRef } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { FreeMode } from "swiper/modules";
import "swiper/css";
import "swiper/css/free-mode";

export default function FilterChips({
  chips = [],
  value = "",
  onChange,
  ariaLabel = "Categories",
}) {
  const swiperRef = useRef(null);

  useEffect(() => {
    const swiper = swiperRef.current;
    if (!swiper || !chips.length) return;
    const index = chips.findIndex((chip) => chip.value === value);
    if (index < 0) return;
    try {
      swiper.slideTo(index, 280);
    } catch {
      /* ignore */
    }
  }, [value, chips]);

  if (!chips.length) return null;

  return (
    <div className="wp-filter-chips-wrap" aria-label={ariaLabel}>
      <Swiper
        modules={[FreeMode]}
        freeMode={{ enabled: true, sticky: false }}
        slidesPerView="auto"
        spaceBetween={8}
        watchOverflow
        resistanceRatio={0.65}
        className="wp-filter-chips-swiper"
        onSwiper={(swiper) => {
          swiperRef.current = swiper;
        }}
      >
        {chips.map((chip) => (
          <SwiperSlide key={chip.value || chip.label} className="wp-filter-chips-slide">
            <button
              type="button"
              role="tab"
              aria-selected={value === chip.value}
              className={`wp-filter-chip ${value === chip.value ? "is-active" : ""}`}
              onClick={() => onChange?.(chip.value)}
            >
              {chip.label}
            </button>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
