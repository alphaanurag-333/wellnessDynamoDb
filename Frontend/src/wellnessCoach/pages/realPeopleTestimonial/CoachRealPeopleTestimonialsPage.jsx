import { useDispatch, useSelector } from "react-redux";
import { PortalRealPeopleTestimonialsPage } from "../../../components/PortalRealPeopleTestimonialsPage.jsx";
import { logoutCoach } from "../../../store/authSlice.js";
import {
  coachDeleteRealPeopleTestimonial,
  coachListRealPeopleTestimonials,
  coachReviewRealPeopleTestimonial,
  coachUpdateRealPeopleTestimonial,
} from "../../api/coachRealPeopleTestimonials.js";

export function CoachRealPeopleTestimonialsPage() {
  const dispatch = useDispatch();
  const coachToken = useSelector((s) => s.auth.coachToken);

  return (
    <PortalRealPeopleTestimonialsPage
      token={coachToken}
      onUnauthorized={() => dispatch(logoutCoach())}
      listAll={coachListRealPeopleTestimonials}
      reviewTestimonial={coachReviewRealPeopleTestimonial}
      updateTestimonial={coachUpdateRealPeopleTestimonial}
      deleteTestimonial={coachDeleteRealPeopleTestimonial}
      title="Real people testimonials"
    />
  );
}
