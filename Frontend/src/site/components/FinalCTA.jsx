import { FiArrowRight } from "react-icons/fi";

const COMMUNITY_LINK = "https://chat.whatsapp.com/Lcv5qyt7tvX6nrif7poqBB";

export default function FinalCTA() {
  return (
    // <section className="final-cta p-0 pt-3 pb-3">
    //   <div className="final-cta__overlay"></div>

    //   <div className="final-cta__shape final-cta__shape--top"></div>
    //   <div className="final-cta__shape final-cta__shape--bottom"></div>

    //   <div className="site-container">
    //     <div className="final-cta__content">
    //       <h2 className="final-cta__title">Ready to rediscover your health?</h2>

    //       <p className="final-cta__description" style={{ maxWidth: "100%" }}>
    //         Schedule your free 20-minute discovery call today and start your
    //         journey towards lasting vitality.
    //       </p>

    //       <button
    //         type="button"
    //         className="final-cta__button mt-0 "
    //         onClick={() =>
    //           window.open(COMMUNITY_LINK, "_blank", "noopener,noreferrer")
    //         }
    //       >
    //         JOIN IRW COMMUNITY
    //         {/* <FiArrowRight /> */}
    //       </button>
    //     </div>
    //   </div>
    // </section>

      <section className="final-cta">
        <div className="final-cta__overlay"></div>

        <div className="final-cta__shape final-cta__shape--top"></div>
        <div className="final-cta__shape final-cta__shape--bottom"></div>

        <div className="site-container">
          <div className="final-cta__content">
            <h2 className="final-cta__title">
              Are you tired of facing your wellness journey alone?
            </h2>

            <p className="final-cta__description" style={{maxWidth:'100%',textAlign:'center'}}>
              Discover a healthier, happier you with our vibrant wellness
              community. Connect, learn, and grow alongside like-minded
              individuals on your journey to well-being. Take the first step
              towards a balanced life – join us today and transform your
              tomorrow.
            </p>

                  <button
             type="button"
             className="final-cta__button mt-0 "
             onClick={() =>
               window.open(COMMUNITY_LINK, "_blank", "noopener,noreferrer")
             }
           >
             JOIN IRW COMMUNITY
             {/* <FiArrowRight /> */}
           </button>
          </div>
        </div>
      </section>
  );
}
