import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";

import "swiper/css";

const champions = [
  {
    id: 1,
    name: "Sarah J.",
    wishes:
      "Wishing you a day filled with happiness,laughter & beautiful moments",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300",
  },
  {
    id: 2,
    name: "Emma",
    wishes:
      "Wishing you a day filled with happiness,laughter & beautiful moments",
    avatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300",
  },
  {
    id: 3,
    name: "Sophia",
    wishes:
      "Wishing you a day filled with happiness,laughter & beautiful moments",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300",
  },
  {
    id: 4,
    name: "Olivia",
    wishes:
      "Wishing you a day filled with happiness,aughter & beautiful moments",
    avatar:
      "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=300",
  },
  {
    id: 5,
    name: "Jessica",
    wishes:
      "Wishing you a day filled with happiness,laughter & beautiful moments",
    avatar:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=300",
  },
];

export default function BirthdaySlider() {
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
            <div className="champion-card birthday-card">
              <div className="birthday-user">
                <div className="champion-avatar">
                  <img src={item.avatar} alt="" />
                </div>

                <div className="birthday-info">
                  <div className="birthday-title">Happy Birthday !</div>

                  <h4>{item.name}</h4>
                  <p>{item.wishes}</p>
                </div>

                {/* <div className="champion-right">
                  <span>💬 The community supp...</span>
                  <span>💬 The community supp...</span>
                </div> */}
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  );
}
