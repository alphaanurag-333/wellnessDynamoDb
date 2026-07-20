import { Outlet } from "react-router-dom";
import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { logoutCoach } from "../../../store/authSlice.js";
import { PortalClientTestimonialList } from "../../../components/clientTestimonial/PortalClientTestimonialList.jsx";
import { PortalClientTestimonialView } from "../../../components/clientTestimonial/PortalClientTestimonialView.jsx";
import { PortalClientTestimonialEditPage } from "../../../components/clientTestimonial/PortalClientTestimonialEditPage.jsx";
import {
  coachDeleteClientTestimonial,
  coachGetClientTestimonialById,
  coachListClientTestimonials,
  coachUpdateClientTestimonial,
} from "../../api/coachClientTestimonials.js";

const BASE = "/coach/client-testimonials";

export function CoachClientTestimonialsLayout() {
  return <Outlet />;
}

export function CoachClientTestimonialList() {
  const dispatch = useDispatch();
  const coachToken = useSelector((s) => s.auth.coachToken);
  const onUnauthorized = useCallback(() => dispatch(logoutCoach()), [dispatch]);

  return (
    <PortalClientTestimonialList
      token={coachToken}
      onUnauthorized={onUnauthorized}
      basePath={BASE}
      listTestimonials={coachListClientTestimonials}
      updateTestimonial={coachUpdateClientTestimonial}
      deleteTestimonial={coachDeleteClientTestimonial}
    />
  );
}

export function CoachClientTestimonialView() {
  const dispatch = useDispatch();
  const coachToken = useSelector((s) => s.auth.coachToken);
  const onUnauthorized = useCallback(() => dispatch(logoutCoach()), [dispatch]);

  return (
    <PortalClientTestimonialView
      token={coachToken}
      onUnauthorized={onUnauthorized}
      basePath={BASE}
      getTestimonial={coachGetClientTestimonialById}
    />
  );
}

export function CoachClientTestimonialEdit() {
  const dispatch = useDispatch();
  const coachToken = useSelector((s) => s.auth.coachToken);
  const onUnauthorized = useCallback(() => dispatch(logoutCoach()), [dispatch]);

  return (
    <PortalClientTestimonialEditPage
      token={coachToken}
      onUnauthorized={onUnauthorized}
      basePath={BASE}
      getTestimonial={coachGetClientTestimonialById}
      updateTestimonial={coachUpdateClientTestimonial}
    />
  );
}
