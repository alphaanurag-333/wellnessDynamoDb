import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { IoStar, IoStarHalf, IoStarOutline } from "react-icons/io5";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import { useMediaQuery } from "../../hooks/useMediaQuery.js";
import { DEFAULT_IMAGE_SRC, handleMediaImageError } from "../../media.js";
import { fetchClientTestimonials } from "../api/publicMisc.js";
import { SITE_SECTION_PATHS } from "../data/siteSections.js";
import { useSiteConfig } from "../hooks/useSiteConfig.js";
import { SiteCard } from "./SiteCard.jsx";
import client1 from "../images/client1.jpg";
import client2 from "../images/client2.jpg";


export default function TestimonialsSection() {
  const testimonials = [
    {
      id: 1,
      image: client1,
      name: "Sarah Jenkins",
      role: "Transformation Program Member",
      review:
        "After years of chronic fatigue, the team here finally found the root cause. I have my life back.",
    },
    {
      id: 2,
      image: client2,
      name: "Michael Chen",
      role: "Executive Health Client",
      review:
        "The most professional health facility I've ever visited. The data-driven approach is second to none.",
    },
    {
      id: 3,
      image: client1,
      name: "Emma Watson",
      role: "Wellness Client",
      review:
        "The personalized approach completely changed how I think about my health and wellbeing.",
    },
    {
      id: 4,
      image: client2,
      name: "David Smith",
      role: "Program Member",
      review:
        "Everything was tailored to me. The results exceeded my expectations.",
    },
  ];

  return (
    <section className="success-stories">
      <div className="site-container">

        <div className="success-stories__header">
          <h2>Success Stories</h2>
        </div>

        <Swiper
          modules={[Pagination, Autoplay]}
          slidesPerView={2}
          spaceBetween={24}
          loop={true}
          autoplay={{
            delay: 5000,
            disableOnInteraction: false,
          }}
          pagination={{
            clickable: true,
          }}
          breakpoints={{
            0: {
              slidesPerView: 1,
            },
            768: {
              slidesPerView: 2,
            },
            1200: {
              slidesPerView: 2,
            },
          }}
          className="successStoriesSwiper"
        >
          {testimonials.map((item) => (
            <SwiperSlide key={item.id}>
              <div className="success-card">

                <div className="success-card__avatar">
                  <img src={item.image} alt={item.name} />
                </div>

                <div className="success-card__content">

                  <div className="success-card__stars">
                    <IoStar />
                    <IoStar />
                    <IoStar />
                    <IoStar />
                    <IoStar />
                  </div>

                  <p className="success-card__review">
                    "{item.review}"
                  </p>

                  <p className="success-card__author">
                    <span>— {item.name}</span>, {item.role}
                  </p>

                </div>

              </div>
            </SwiperSlide>
          ))}
        </Swiper>

      </div>
    </section>
  );
}