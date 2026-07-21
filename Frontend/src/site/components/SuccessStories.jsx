import { useRef } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import "swiper/css";
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
import { NavLink } from "react-router-dom";

const CATEGORY_ITEMS = [
  {
    id: "diabetes",
    title: "Diabetes Reversal",
    url: "/diabetes-reversal",
    image: diabetesImg,
    theme: "diabetes",
    description:
      "Take control of your health through personalized nutrition, targeted exercise, and expert guidance—aimed at reducing medication dependence and improving wellbeing.",
  },
  {
    id: "fat-loss",
    title: "Fat Loss",
    url: "/fat-loss",
    image: fatLossImg,
    theme: "fat-loss",
    description:
      "Achieve your ideal weight with personalized nutrition, effective workouts, and ongoing coach support for a healthier lifestyle.",
  },
  {
    id: "pcos",
    title: "PCOD-PCOS",
    url: "/pcod-pcos-reversal",
    image: pcosImg,
    theme: "pcos",
    description:
      "A holistic approach to managing Polycystic Ovary Syndrome with personalized nutrition, tailored exercise, and hormonal balance strategies.",
  },
  {  
    id: "thyroid",
    title: "Thyroid Care",
    url: "/thyroid",
    image: thyroidImg,
    theme: "thyroid",
    description:
      "Restore balance and optimize thyroid function with customized nutrition, targeted exercise, and expert guidance for hypo- and hyperthyroidism.",
  },
  {
    id: "gut",
    title: "Gut Health",
    url: "/gut-health",
    image: gutImg,
    theme: "gut",
    description:
      "Promote a healthy digestive system with personalized nutrition, probiotics, and expert advice to improve digestion, immunity, and overall wellbeing.",
  },
];

const SuccessStories = () => {
  const categorySwiperRef = useRef(null);
  const enableCategoryLoop = CATEGORY_ITEMS.length > 4;


  const showNavigation =
  window.innerWidth >= 1200
    ? CATEGORY_ITEMS.length > 5
    : CATEGORY_ITEMS.length > 1;
  return (
   
    <section className="success-story success-stories-page wellness-toolkit wellnesspedia-page">
      <div className="container success-story__hero pt-2 pb-2">
        <div className="success-wrapper">
          <div className="success-content mb-0">
            {/* <span className="success-tag">CLINICALLY PROVEN RESULTS</span> */}

            <h2 className="wellness__title">
              Our <span> Success  Stories</span> 
             
            </h2>

            <p className="success-text mb-0">
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
        <div className="site-container">
          {/* <div className="transformation-categories__head">
            <div className="transformation-heading">
              <h2>Our Success Stories</h2>
              <p>Explore clinically guided programs and real outcomes.</p>
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
          </div> */}
 <div className="transformation-header">
          <div className="header-left">
            <h2>Our Success Stories</h2>
            <p>Explore clinically guided programs and real outcomes.</p>
          </div>


            <div className="slider-navigation d-none">
              <button
                type="button"
                className="slider-btn"
                aria-label="Previous category"
                onClick={() => categorySwiperRef.current?.slidePrev()}
              >
                <ChevronLeft size={20} />
              </button>
              <button
                type="button"
                className="slider-btn"
                aria-label="Next category"
                onClick={() => categorySwiperRef.current?.slideNext()}
              >
                <ChevronRight size={20} />
              </button>
            </div>
        </div>
          <Swiper
            modules={[Autoplay]}
            slidesPerView={5}
            spaceBetween={14}
            speed={650}
            loop={enableCategoryLoop}
            preventClicks={false}
            preventClicksPropagation={false}
            autoplay={
              enableCategoryLoop
                ? {
                    delay: 2800,
                    disableOnInteraction: false,
                    pauseOnMouseEnter: true,
                  }
                : false
            }
            onSwiper={(swiper) => {
              categorySwiperRef.current = swiper;
            }}
            breakpoints={{
              0: {
                slidesPerView: 1,
                spaceBetween: 12,
              },
              480: {
                slidesPerView: 2,
                spaceBetween: 12,
              },
              768: {
                slidesPerView: 3,
                spaceBetween: 14,
              },
              992: {
                slidesPerView: 4,
                spaceBetween: 14,
              },
              1200: {
                slidesPerView: 5,
                spaceBetween: 14,
              },
            }}
            className="transformationCategoriesSwiper"
          >
            {CATEGORY_ITEMS.map((item) => (
              <SwiperSlide key={item.id}>
                <article
                  className={`transformation-category-card transformation-category-card--${item.theme}`}
                >
                  <div className="transformation-image">
                    <img src={item.image} alt={item.title} loading="lazy" />
                  </div>
                  <h4>{item.title}</h4>
                  <p className="transformation-category-card__desc textjustifyimp">
                    {item.description}
                  </p>
                  <NavLink to={item.url} className="transformation-category-card__more">
                    Read More
                  </NavLink>
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
