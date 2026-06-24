import React, { useRef, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { useSelector } from "react-redux";
import { selectLoginBrandLogoUrl } from "../../store/appConfigSelectors.js";
import { useSiteConfig } from "../hooks/useSiteConfig.js";
import { SiteButton } from "./SiteButton.jsx";
import { Autoplay, Pagination, Navigation, EffectFade, EffectCreative } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";
import { Link } from "react-router-dom";
import hero1 from "../images/swiperImages/hero-banner-img1.jpg";
import hero2 from "../images/swiperImages/hero-banner-img2.jpg";
import hero3 from "../images/swiperImages/hero-banner-img3.jpg";
import hero4 from "../images/swiperImages/hero-banner-img4.jpg";
import hero5 from "../images/swiperImages/hero-banner-img5.jpg";

export function SiteHero() {
  const { hero } = useSiteConfig();
  const brandLogoUrl = useSelector(selectLoginBrandLogoUrl);

  const progressCircle = useRef(null);
  const progressContent = useRef(null);
  const onAutoplayTimeLeft = (s, time, progress) => {
    progressCircle.current.style.setProperty("--progress", 1 - progress);
    progressContent.current.textContent = `${Math.ceil(time / 400)}s`;
  };

  const slides = [
    {
      id: 1,
      title: "Full Collection: The Harmony of Wellbeing",
      description:
        "Discover seamless continuity and visual consistency for every interior design project.",
      image: hero1,
    },
    {
      id: 2,
      title: "Discover OpenKit",
      description:
        "The modular solution designed for organization, flexibility and elegance.",
      image: hero2,
    },
    {
      id: 3,
      title: "Discover Twin",
      description:
        "A new generation worktop combining structural engineering and contemporary design.",
      image: hero3,
    },
    {
      id: 4,
      title: "Discover Twin",
      description:
        "A new generation worktop combining structural engineering and contemporary design.",
      image: hero4,
    },
    {
      id: 5,
      title: "Discover Twin",
      description:
        "A new generation worktop combining structural engineering and contemporary design.",
      image: hero5,
    },
    {
      id: 6,
      title: "Discover Twin",
      description:
        "A new generation worktop combining structural engineering and contemporary design.",
      image: hero3,
    },
  ];

  return (
    // <section className="site-hero site-hero--premium" aria-labelledby="site-hero-title">
    //   <div className="site-hero__bg" aria-hidden>
    //     <span className="site-hero__orb site-hero__orb--1" />
    //     <span className="site-hero__orb site-hero__orb--2" />
    //     <span className="site-hero__orb site-hero__orb--3" />
    //   </div>
    //   <div className="site-container site-hero__container">
    //     <div className="site-hero__grid">
    //       <div className="site-hero__content">
    //         <p className="site-hero__tagline">{hero.tagline}</p>
    //         <h1 id="site-hero-title" className="site-hero__title">
    //           {hero.headline}
    //         </h1>
    //         <p className="site-hero__text">{hero.subtext}</p>
    //         <div className="site-hero__actions">
    //           <SiteButton href={hero.ctaHref}>{hero.ctaLabel}</SiteButton>
    //           <SiteButton variant="secondary" href={hero.secondaryHref}>
    //             {hero.secondaryLabel}
    //           </SiteButton>
    //         </div>
    //       </div>

    //       <div className="site-hero__visual-wrap">
    //         <div className="site-phone-mockup site-phone-mockup--hero">
    //           <div className="site-phone-mockup__notch" />
    //           <div className="site-phone-mockup__screen">
    //             {brandLogoUrl ? (
    //               <img className="site-phone-mockup__logo" src={brandLogoUrl} alt="" />
    //             ) : null}
    //             <p className="site-phone-mockup__app-name">{hero.visualTitle}</p>
    //             <p className="site-phone-mockup__tagline">{hero.visualText}</p>
    //             <div className="site-phone-mockup__cards">
    //               <span className="site-phone-mockup__mini-card" />
    //               <span className="site-phone-mockup__mini-card site-phone-mockup__mini-card--accent" />
    //             </div>
    //           </div>
    //         </div>
    //       </div>
    //     </div>
    //   </div>
    // </section>

    <>
      <Swiper
        spaceBetween={30}
        speed={1800} 
        effect="creative"
        creativeEffect={{
          prev: {
            opacity: 0,
            scale: 1.15,
          },
          next: {
            opacity: 0,
            scale: 1.25,
          },
        }}
      
        centeredSlides={true}
        autoplay={{
          delay: 2500,
          disableOnInteraction: false,
        }}
        pagination={{
          clickable: true,
          renderBullet: (index, className) => {
            return `
        <span class="${className}">
          <svg class="bullet-progress" viewBox="0 0 36 36">
            <circle class="bullet-ring" cx="18" cy="18" r="15"></circle>
          </svg>
        </span>
      `;
          },
        }}
        modules={[Autoplay, Pagination, EffectCreative]}
        // onAutoplayTimeLeft={onAutoplayTimeLeft}
        className="heroSwiper"
      >
        {slides.map((slide) => (
          <SwiperSlide key={slide.id}>
            <div className="slide-flash"></div>

            {/* {slide.title} */}
            <div className="hero-bg">
              <img src={slide.image} alt="" className="hero-bg-image" />
            </div>
            <div className="hero-overlay"></div>
            <div className="hero-content">
              <span className="hero-label">PREMIUM COLLECTION</span>

              <h1 className="hero-title">{slide.title}</h1>

              <p className="hero-description">{slide.description}</p>

              <Link to="/" className="hero-link">
                DISCOVER MORE
              </Link>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </>
  );
}

    