import { useRef } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { handleMediaImageError } from "../../media.js";
import successImg from "../images/about-one.png";
import diabetesImg from "../images/diabetes.png";
import fatLossImg from "../images/fat-loss.png";
import pcosImg from "../images/pcod.png";
import thyroidImg from "../images/thyroid.png";
import gutImg from "../images/gut-health.png";
import FinalCTA from "./FinalCTA";
import VideoTestimonials from "./VideoTestimonials";
import TransformationStoriesSection from "./TransformationStoriesSection";

const CATEGORY_ITEMS = [
  {
    id: "diabetes",
    title: "Diabetes Reversal",
    image: diabetesImg,
    description: "Yoga, an ancient practice rooted in Indian philosophy, lifestyle guidance, and clinical care to support blood sugar balance.",
  },
  {
    id: "fat-loss",
    title: "Fat Loss",
    image: fatLossImg,
    description: "Support better hormonal balance and sustainable fat loss through structured nutrition and daily wellness habits.",
  },
  {
    id: "pcos",
    title: "PCOD-PCOS",
    image: pcosImg,
    description: "Focus on hormonal health and lifestyle management for improved cycle balance and long-term wellbeing.",
  },
  {
    id: "thyroid",
    title: "Thyroid Care",
    image: thyroidImg,
    description: "Personalized plans to support thyroid function, metabolism, and overall energy through guided clinical wellness.",
  },
  {
    id: "gut",
    title: "Gut Health",
    image: gutImg,
    description: "Build healthier daily routines to support digestion, immunity, and overall gut wellness.",
  },
];

const SuccessStories = () => {
  const categoryPrevRef = useRef(null);
  const categoryNextRef = useRef(null);
  const enableCategoryLoop = CATEGORY_ITEMS.length > 4;

  return (
    <section className="success-story">
      <div className="container">
        <div className="success-wrapper">
          <div className="success-content">
            <span className="success-tag">CLINICALLY PROVEN RESULTS</span>

            <h2 className="success-title">
              Our <span>Success</span> <br />
              Stories
            </h2>

            <p className="success-text">
              Real transformations from real people. Witness how our clinical
              approach to wellness has helped hundreds reclaim their vitality
              and health.
            </p>
          </div>

          <div className="success-image">
            <div className="image-card">
              <img
                src={successImg}
                alt="Transformation success story"
                onError={handleMediaImageError}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="video-testimonial">
        <VideoTestimonials />
      </div>

      <section className="transformation">
        <div className="container">
          <div className="transformation-categories__head">
            <div className="transformation-heading">
              <h2>Our Success Stories</h2>
            </div>

            <div className="slider-navigation transformation-categories__nav">
              <button
                ref={categoryPrevRef}
                type="button"
                className="slider-btn"
                aria-label="Previous category"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                ref={categoryNextRef}
                type="button"
                className="slider-btn"
                aria-label="Next category"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          <Swiper
            modules={[Navigation, Autoplay]}
            slidesPerView={5}
            spaceBetween={18}
            speed={650}
            loop={enableCategoryLoop}
            autoplay={
              enableCategoryLoop
                ? {
                    delay: 2800,
                    disableOnInteraction: false,
                    pauseOnMouseEnter: true,
                  }
                : false
            }
            navigation={{
              prevEl: categoryPrevRef.current,
              nextEl: categoryNextRef.current,
            }}
            onSwiper={(swiper) => {
              setTimeout(() => {
                swiper.params.navigation.prevEl = categoryPrevRef.current;
                swiper.params.navigation.nextEl = categoryNextRef.current;
                swiper.navigation.destroy();
                swiper.navigation.init();
                swiper.navigation.update();
              });
            }}
            breakpoints={{
              0: {
                slidesPerView: 1.35,
                spaceBetween: 14,
              },
              480: {
                slidesPerView: 2.1,
                spaceBetween: 16,
              },
              768: {
                slidesPerView: 3.1,
                spaceBetween: 18,
              },
              992: {
                slidesPerView: 4,
                spaceBetween: 18,
              },
              1200: {
                slidesPerView: 5,
                spaceBetween: 18,
              },
            }}
            className="transformationCategoriesSwiper"
          >
            {CATEGORY_ITEMS.map((item) => (
              <SwiperSlide key={item.id}>
                <article className="transformation-category-card">
                  <div className="transformation-image">
                    <img src={item.image} alt={item.title} loading="lazy" />
                  </div>
                  <h4>{item.title}</h4>
                  <p className="transformation-category-card__desc">{item.description}</p>
                </article>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </section>

      <TransformationStoriesSection />
      <FinalCTA />
    </section>
  );
};

export default SuccessStories;
