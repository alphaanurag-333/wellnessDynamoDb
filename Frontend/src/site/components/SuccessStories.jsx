import React, { useRef } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";

import "swiper/css";
import "swiper/css/navigation";

import { ChevronLeft, ChevronRight, Star } from "lucide-react";

import successImg from "../images/about-one.png";
import diabetesImg from "../images/diabetes.png";
import fatLossImg from "../images/fat-loss.png";
import pcosImg from "../images/pcod.png";
import thyroidImg from "../images/thyroid.png";
import gutImg from "../images/gut-health.png"; // Replace with your image
import TransformOne from "../images/transformation-1.png";
import TransformTwo from "../images/transformation-2.png";
import TransformThree from "../images/transformation-3.png";
import TransformFour from "../images/transformation-4.png";
import FinalCTA from "./FinalCTA";
import VideoTestimonials from "./VideoTestimonials";

const SuccessStories = () => {
  const prevRef = useRef(null);
  const nextRef = useRef(null);
  const categories = [
    {
      id: 1,
      title: "Diabetes Reversal",
      image: diabetesImg,
    },
    {
      id: 2,
      title: "Fat Loss",
      image: fatLossImg,
    },
    {
      id: 3,
      title: "PCOD-PCOS",
      image: pcosImg,
    },
    {
      id: 4,
      title: "Thyroid Care",
      image: thyroidImg,
    },
    {
      id: 5,
      title: "Gut Health",
      image: gutImg,
    },
  ];

  const transformationData = [
    {
      id: 1,
      image: TransformOne,
      name: "David Miller",
      description:
        "Clinical Sanctuary helped me reverse my Type 2 diabetes. I am now completely off medications and my doctor is amazed.",
      tags: ["Diabetes Reversal", "Medication Free", "HbA1c 5.6%"],
    },

    {
      id: 2,
      image: TransformTwo,
      name: "Anita Sharma",
      description:
        "The gut-health focus for my PCOS was the missing piece. My skin cleared up and I finally feel like myself again.",
      tags: ["PCOS Care", "Cycles Restored", "Hormonal Balance"],
    },

    {
      id: 3,
      image: TransformThree,
      name: "Mark Thompson",
      description:
        "After years of struggling with IBS, the clinical nutrition program finally solved my digestive issues.",
      tags: ["Gut Health", "IBS Recovery", "Digestion"],
    },

    {
      id: 4,
      image:TransformFour,
      name: "Sarah Wilson",
      description:
        "I lost weight naturally while improving my energy and overall health with the personalized nutrition plan.",
      tags: ["Weight Loss", "Healthy Lifestyle", "Energy Boost"],
    },
  ];

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
              <img src={successImg} alt="Success Story" />
            </div>
          </div>
        </div>
      </div>

     <div className="video-testimonial">
       <VideoTestimonials />
     </div>
      <section className="transformation">
        <div className="container">
          <div className="transformation-heading">
            <h2>Transformation Categories</h2>

            <p>
              Explore clinical results across specialized health concerns and
              medical conditions.
            </p>
          </div>

          <div className="transformation-list">
            {categories.map((item) => (
              <div className="transformation-card" key={item.id}>
                <div className="transformation-image">
                  <img src={item.image} alt={item.title} />
                </div>

                <h4>{item.title}</h4>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="transformation-section">
        <div className="container">
          {/* Header */}

          <div className="transformation-header">
            <div className="header-left">
              <h2>Real Transformations</h2>

              <p>Swipe to see clinical results from our community</p>
            </div>

            <div className="slider-navigation">
              <button ref={prevRef} className="slider-btn">
                <ChevronLeft size={20} />
              </button>

              <button ref={nextRef} className="slider-btn">
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          <Swiper
            modules={[Navigation]}
            slidesPerView={3}
            spaceBetween={30}
            speed={700}
            navigation={{
              prevEl: prevRef.current,
              nextEl: nextRef.current,
            }}
            onSwiper={(swiper) => {
              setTimeout(() => {
                swiper.params.navigation.prevEl = prevRef.current;
                swiper.params.navigation.nextEl = nextRef.current;

                swiper.navigation.destroy();
                swiper.navigation.init();
                swiper.navigation.update();
              });
            }}
            breakpoints={{
              0: {
                slidesPerView: 1.1,
                spaceBetween: 18,
              },
              576: {
                slidesPerView: 1.5,
                spaceBetween: 20,
              },
              768: {
                slidesPerView: 2.1,
                spaceBetween: 22,
              },
              992: {
                slidesPerView: 3,
                spaceBetween: 30,
              },
            }}
          >
            {transformationData.map((item) => (
              <SwiperSlide key={item.id}>
                <div className="transformation-card">
                  {/* Image */}

                  <div className="card-image">
                    <img src={item.image} alt={item.name} />
                  </div>

                  {/* Tags */}

                  <div className="card-tags">
                    {item.tags.map((tag, index) => (
                      <span key={index} className={`tag tag-${index}`}>
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Content */}

                  <div className="card-content">
                    <h3>{item.name}</h3>

                    <p>{item.description}</p>

                    <div className="card-rating">
                      {[...Array(5)].map((_, index) => (
                        <Star
                          key={index}
                          size={15}
                          fill="#F59E0B"
                          color="#F59E0B"
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </section>
      <FinalCTA/>
    </section>
  );
};

export default SuccessStories;
