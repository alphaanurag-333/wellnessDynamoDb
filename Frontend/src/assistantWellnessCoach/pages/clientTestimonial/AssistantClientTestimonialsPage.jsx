import { Outlet } from "react-router-dom";
import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { logoutAssistant } from "../../../store/authSlice.js";
import { PortalClientTestimonialList } from "../../../components/clientTestimonial/PortalClientTestimonialList.jsx";
import { PortalClientTestimonialView } from "../../../components/clientTestimonial/PortalClientTestimonialView.jsx";
import { PortalClientTestimonialEditPage } from "../../../components/clientTestimonial/PortalClientTestimonialEditPage.jsx";
import {
  assistantDeleteClientTestimonial,
  assistantGetClientTestimonialById,
  assistantListClientTestimonials,
  assistantUpdateClientTestimonial,
} from "../../api/assistantClientTestimonials.js";

const BASE = "/assistant/client-testimonials";

export function AssistantClientTestimonialsLayout() {
  return <Outlet />;
}

export function AssistantClientTestimonialList() {
  const dispatch = useDispatch();
  const assistantToken = useSelector((s) => s.auth.assistantToken);
  const onUnauthorized = useCallback(() => dispatch(logoutAssistant()), [dispatch]);

  return (
    <PortalClientTestimonialList
      token={assistantToken}
      onUnauthorized={onUnauthorized}
      basePath={BASE}
      listTestimonials={assistantListClientTestimonials}
      updateTestimonial={assistantUpdateClientTestimonial}
      deleteTestimonial={assistantDeleteClientTestimonial}
    />
  );
}

export function AssistantClientTestimonialView() {
  const dispatch = useDispatch();
  const assistantToken = useSelector((s) => s.auth.assistantToken);
  const onUnauthorized = useCallback(() => dispatch(logoutAssistant()), [dispatch]);

  return (
    <PortalClientTestimonialView
      token={assistantToken}
      onUnauthorized={onUnauthorized}
      basePath={BASE}
      getTestimonial={assistantGetClientTestimonialById}
    />
  );
}

export function AssistantClientTestimonialEdit() {
  const dispatch = useDispatch();
  const assistantToken = useSelector((s) => s.auth.assistantToken);
  const onUnauthorized = useCallback(() => dispatch(logoutAssistant()), [dispatch]);

  return (
    <PortalClientTestimonialEditPage
      token={assistantToken}
      onUnauthorized={onUnauthorized}
      basePath={BASE}
      getTestimonial={assistantGetClientTestimonialById}
      updateTestimonial={assistantUpdateClientTestimonial}
    />
  );
}
