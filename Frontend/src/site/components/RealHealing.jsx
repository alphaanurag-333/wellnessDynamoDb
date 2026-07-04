import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";

import "swiper/css";

const healingTestimonials = [
  {
    id: 1,
    category: "GUT HEALTH",
    name: "Sarah J.",
    year: "Member since 2022",
    image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=300",
    review:
      "The gut-health recipes are incredibly easy to follow and actually taste amazing. My bloating vanished in weeks.",
  },
  {
    id: 2,
    category: "WEIGHT LOSS",
    name: "Emily R.",
    year: "Member since 2021",
    image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=300",
    review:
      "Finally I found something that actually works. I've lost weight without giving up my favorite meals.",
  },
  {
    id: 3,
    category: "PCOS",
    name: "Jessica",
    year: "Member since 2023",
    image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=300",
    review:
      "The meal plans helped regulate my eating habits and I feel healthier than ever.",
  },
  {
    id: 4,
    category: "THYROID",
    name: "Sophia",
    year: "Member since 2020",
    image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=300",
    review:
      "The nutrition guidance made a huge difference in my energy levels.",
  },
];

export default function RealHealingSlider() {
  return (
    <section className="real-healing-section container">
      <h2 className="healing-title">Real People : Real Healing</h2>
      <Swiper
        modules={[Autoplay]}
        slidesPerView={3}
        spaceBetween={25}
        loop={true}
        autoplay={{
          delay: 3000,
          disableOnInteraction: false,
        }}
        breakpoints={{
          0: {
            slidesPerView: 1,
          },
          640: {
            slidesPerView: 2,
          },
          1024: {
            slidesPerView: 3,
          },
        }}
      >
        {healingTestimonials.map((item) => (
          <SwiperSlide key={item.id}>
            <div className="real-healing-card">
              <div className="real-healing-top">
                <div className="real-healing-stars">★★★★★</div>

                <span className="real-healing-tag">{item.category}</span>
              </div>

              <p className="real-healing-review">"{item.review}"</p>

              <div className="real-healing-bottom">
                <div className="real-healing-profile">
                  <img src={item.image} alt={item.name} />

                  <div>
                    <h4>{item.name}</h4>
                    <span>{item.year}</span>
                  </div>
                </div>

                {/* <a href="/">VIEW MORE</a> */}
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  );
}
