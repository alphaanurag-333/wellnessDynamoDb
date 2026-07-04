import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";

import "swiper/css";

const champions = [
  {
    id: 1,
    name: "Sarah J.",
    weight: "Lost 12lbs",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300",
  },
  {
    id: 2,
    name: "Emma",
    weight: "Lost 9lbs",
    avatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300",
  },
  {
    id: 3,
    name: "Sophia",
    weight: "Lost 15lbs",
    avatar:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300",
  },
  {
    id: 4,
    name: "Olivia",
    weight: "Lost 8lbs",
    avatar:
      "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=300",
  },
  {
    id: 5,
    name: "Jessica",
    weight: "Lost 18lbs",
    avatar:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=300",
  },
];

export default function ChampionSlider() {
  return (
    <section className="champion-section">
      <Swiper
      className="container"
        modules={[Autoplay]}
        spaceBetween={24}
        slidesPerView={3}
        loop={true}
        autoplay={{
          delay: 2500,
          disableOnInteraction: false,
        }}
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
        {champions.map((item) => (
          <SwiperSlide key={item.id}>
            <div className="champion-card">

              <div className="champion-title">
                Champion Of The Month
              </div>

              <div className="champion-user">

                <div className="champion-avatar">
                  <img src={item.avatar} alt="" />
                </div>

                <div className="champion-info">
                  <h4>{item.name}</h4>
                  <p>{item.weight}</p>
                </div>

                {/* <div className="champion-right">
                  <span>💬 The community supp...</span>
                  <span>💬 The community supp...</span>
                </div> */}

              </div>

              {/* <div className="champion-footer">

                <div className="winner-text">
                  💬 Congratulations Sar...
                </div>

                <button>
                  COMMENT
                </button>

              </div> */}

            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  );
}