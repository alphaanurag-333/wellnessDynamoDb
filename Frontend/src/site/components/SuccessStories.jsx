import { useEffect, useRef, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DEFAULT_IMAGE_SRC, handleMediaImageError, mediaUrl } from "../../media.js";
import { fetchHealthConcerns, fetchTransformations } from "../api/publicMisc.js";
import successImg from "../images/about-one.png";
import categoryFallbackImg from "../images/diabetes.png";
import FinalCTA from "./FinalCTA";
import VideoTestimonials from "./VideoTestimonials";
import TransformationStoriesSection from "./TransformationStoriesSection";

function mapHealthConcern(row) {
  if (!row) return null;

  const id = row.id || row._id;
  const title = String(row.title || "").trim();
  if (!id || !title) return null;

  const icon = row.icon ? mediaUrl(row.icon) : "";

  return {
    id,
    title,
    description: String(row.description || "").trim(),
    image: icon || categoryFallbackImg,
  };
}

const SuccessStories = () => {
  const categoryPrevRef = useRef(null);
  const categoryNextRef = useRef(null);
  const [transformations, setTransformations] = useState(null);
  const [healthConcerns, setHealthConcerns] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await fetchTransformations({ page: 1, limit: 24 });
        if (cancelled) return;
        const rows = Array.isArray(data?.transformations) ? data.transformations : [];
        setTransformations(rows);
      } catch {
        if (!cancelled) setTransformations([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await fetchHealthConcerns({ page: 1, limit: 50 });
        if (cancelled) return;
        const rows = Array.isArray(data?.healthConcerns) ? data.healthConcerns : [];
        setHealthConcerns(rows.map(mapHealthConcern).filter(Boolean));
      } catch {
        if (!cancelled) setHealthConcerns([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const heroImage =
    (transformations?.[0]?.newImage ? mediaUrl(transformations[0].newImage) : "") ||
    (transformations?.[0]?.oldImage ? mediaUrl(transformations[0].oldImage) : "") ||
    successImg;

  const categoriesLoading = healthConcerns === null;
  const hasCategories = Boolean(healthConcerns?.length);
  const enableCategoryLoop = (healthConcerns?.length || 0) > 4;

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
                src={heroImage || DEFAULT_IMAGE_SRC}
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
              {/* <p>
                Explore clinical results across specialized health concerns and
                medical conditions.
              </p> */}
            </div>

            {hasCategories ? (
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
            ) : null}
          </div>

          {categoriesLoading ? (
            <p className="transformation-section__loading">Loading categories…</p>
          ) : hasCategories ? (
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
              {healthConcerns.map((item) => (
                <SwiperSlide key={item.id}>
                  <article className="transformation-category-card">
                    <div className="transformation-image">
                      <img
                        src={item.image || DEFAULT_IMAGE_SRC}
                        alt={item.title}
                        loading="lazy"
                        onError={handleMediaImageError}
                      />
                    </div>
                    <h4>{item.title}</h4>
                    {item.description ? (
                      <p className="transformation-category-card__desc">{item.description}</p>
                    ) : null}
                  </article>
                </SwiperSlide>
              ))}
            </Swiper>
          ) : null}
        </div>
      </section>

      <TransformationStoriesSection />
      <FinalCTA />
    </section>
  );
};

export default SuccessStories;
