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





// function StarRating({ rating = 5 }) {
//   const value = Math.min(5, Math.max(0, Number(rating) || 0));
//   const full = Math.floor(value);
//   const hasHalf = value - full >= 0.25 && value - full < 0.75;
//   const empty = 5 - full - (hasHalf ? 1 : 0);
//   const roundHigh = value - full >= 0.75;

//   const stars = [];
//   for (let i = 0; i < full + (roundHigh ? 1 : 0); i += 1) {
//     stars.push(<IoStar key={`f-${i}`} aria-hidden />);
//   }
//   if (hasHalf && !roundHigh) {
//     stars.push(<IoStarHalf key="half" aria-hidden />);
//   }
//   for (let i = 0; i < empty; i += 1) {
//     stars.push(<IoStarOutline key={`e-${i}`} aria-hidden />);
//   }

//   return (
//     <div className="site-testimonial-card__stars" aria-label={`${value} out of 5 stars`}>
//       {stars}
//     </div>
//   );
// }

// function TestimonialCard({ item }) {
//   const name = item.name || "Client";
//   const image = item.profileImage || DEFAULT_IMAGE_SRC;

//   return (
//     <SiteCard className="site-testimonial-card">
//       <div className="site-testimonial-card__top">
//         <StarRating rating={item.rating} />
//       </div>
//       <blockquote className="site-testimonial-card__quote">&ldquo;{item.description}&rdquo;</blockquote>
//       <div className="site-testimonial-card__author">
//         <img
//           className="site-testimonial-card__avatar"
//           src={image}
//           alt=""
//           width={44}
//           height={44}
//           onError={handleMediaImageError}
//         />
//         <p className="site-testimonial-card__name">{name}</p>
//       </div>
//     </SiteCard>
//   );
// }

// export function TestimonialsSection({ items: itemsProp }) {
//   const { testimonials: section } = useSiteConfig();
//   const isDesktop = useMediaQuery("(min-width: 992px)");
//   const [items, setItems] = useState(itemsProp || []);
//   const [loading, setLoading] = useState(!itemsProp);
//   const [error, setError] = useState("");

//   const load = useCallback(async () => {
//     if (itemsProp) {
//       setItems(itemsProp);
//       setLoading(false);
//       return;
//     }
//     setLoading(true);
//     setError("");
//     try {
//       const data = await fetchClientTestimonials({ page: 1, limit: 12 });
//       setItems(data?.clientTestimonials || []);
//     } catch (e) {
//       setError(e.message || "Failed to load testimonials.");
//       setItems([]);
//     } finally {
//       setLoading(false);
//     }
//   }, [itemsProp]);

//   useEffect(() => {
//     load();
//   }, [load]);

//   useEffect(() => {
//     if (itemsProp) {
//       setItems(itemsProp);
//       setLoading(false);
//     }
//   }, [itemsProp]);

//   return (
//     <section
//       id={section.id}
//       className="site-section site-section--muted"
//       aria-labelledby="testimonials-heading"
//     >
//       <div className="site-container">
//         <div className="site-section__header site-section__header--row">
//           <div>
//             <h2 id="testimonials-heading" className="site-heading">
//               {section.title}
//             </h2>
//             <p className="site-subtext">{section.subtitle}</p>
//           </div>
//           <Link className="site-link" to={SITE_SECTION_PATHS.testimonials}>
//             {section.viewMoreLabel}
//           </Link>
//         </div>

//         {loading ? <p className="site-testimonials__loading">Loading reviews…</p> : null}
//         {!loading && error ? <p className="site-testimonials__empty">{error}</p> : null}
//         {!loading && !error && items.length === 0 ? (
//           <p className="site-testimonials__empty">No testimonials available yet.</p>
//         ) : null}

//         {!loading && !error && items.length > 0 ? (
//           <div
//             className={
//               isDesktop
//                 ? `site-testimonials__grid${items.length < 3 ? " site-testimonials__grid--centered" : ""}`
//                 : "site-testimonials__swiper"
//             }
//           >
//             {!isDesktop ? (
//               <Swiper
//                 key={`testimonials-${items.length}`}
//                 className="site-testimonials-swiper"
//                 modules={[Pagination]}
//                 spaceBetween={16}
//                 slidesPerView={1.08}
//                 pagination={{ clickable: true, dynamicBullets: true }}
//                 observer
//                 observeParents
//                 watchOverflow
//                 breakpoints={{
//                   480: { slidesPerView: 1.25 },
//                   640: { slidesPerView: 1.6 },
//                   768: { slidesPerView: 2.1 },
//                 }}
//               >
//                 {items.map((item) => (
//                   <SwiperSlide key={item.id || item._id} className="site-testimonials__slide">
//                     <TestimonialCard item={item} />
//                   </SwiperSlide>
//                 ))}
//               </Swiper>
//             ) : (
//               items.slice(0, 6).map((item) => (
//                 <TestimonialCard key={item.id || item._id} item={item} />
//               ))
//             )}
//           </div>
//         ) : null}
//       </div>
//     </section>
//   );
// }

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