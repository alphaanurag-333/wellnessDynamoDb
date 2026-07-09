import { useDispatch, useSelector } from "react-redux";
import { PortalRealPeopleTestimonialsPage } from "../../../components/PortalRealPeopleTestimonialsPage.jsx";
import { logoutAssistant } from "../../../store/authSlice.js";
import {
  assistantDeleteRealPeopleTestimonial,
  assistantListRealPeopleTestimonials,
  assistantReviewRealPeopleTestimonial,
  assistantUpdateRealPeopleTestimonial,
} from "../../api/assistantRealPeopleTestimonials.js";

export function AssistantRealPeopleTestimonialsPage() {
  const dispatch = useDispatch();
  const assistantToken = useSelector((s) => s.auth.assistantToken);

  return (
    <PortalRealPeopleTestimonialsPage
      token={assistantToken}
      onUnauthorized={() => dispatch(logoutAssistant())}
      listAll={assistantListRealPeopleTestimonials}
      reviewTestimonial={assistantReviewRealPeopleTestimonial}
      updateTestimonial={assistantUpdateRealPeopleTestimonial}
      deleteTestimonial={assistantDeleteRealPeopleTestimonial}
      title="Real people testimonials"
    />
  );
}
