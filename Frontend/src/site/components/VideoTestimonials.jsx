import { useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import { FaPlay } from "react-icons/fa";

import "swiper/css";


const videos = [
  {
    id: 1,
    image:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43f?w=700",
    youtube: "https://www.youtube.com/embed/dQw4w9WgXcQ",
  },
  {
    id: 2,
    image:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=700",
    youtube: "https://www.youtube.com/embed/ysz5S6PUM-U",
  },
  {
    id: 3,
    image:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=700",
    youtube: "https://www.youtube.com/embed/tgbNymZ7vqY",
  },
  {
    id: 4,
    image:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=700",
    youtube: "https://www.youtube.com/embed/ScMzIvxBSi4",
  },
];

export default function VideoTestimonials() {
  const [video, setVideo] = useState("");

  return (
    <>
      <section className="video-slider-section container">
           <h2 className="voice-title">Voice of Healing : Unfiltered</h2>
        <Swiper
          modules={[Autoplay]}
          slidesPerView={4}
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
            768: {
              slidesPerView: 2,
            },
            1024: {
              slidesPerView: 3,
            },
          }}
        >
          {videos.map((item) => (
            <SwiperSlide key={item.id}>
              <div
                className="video-card"
                onClick={() => setVideo(item.youtube)}
              >
                <img src={item.image} alt="" />

                <div className="play-btn">
                  <FaPlay />
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </section>

      {video && (
        <div className="video-modal" onClick={() => setVideo("")}>
          <div
            className="video-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="close-btn"
              onClick={() => setVideo("")}
            >
              ×
            </button>

            <iframe
              src={`${video}?autoplay=1`}
              title="youtube"
              allow="autoplay; encrypted-media"
              allowFullScreen
            ></iframe>
          </div>
        </div>
      )}
    </>
  );
}