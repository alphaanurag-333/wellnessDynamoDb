import { Navigate, Route } from "react-router-dom";
import { SITE_SECTION_ROUTE_PATHS } from "../data/siteSections.js";
import { PublicLayout } from "../layout/PublicLayout.jsx";
import { HomePage } from "../pages/HomePage.jsx";
import { StaticPageView } from "../pages/StaticPageView.jsx";
import ContactUsSection from "../components/ContactUs.jsx";
import AboutUsSection from "../components/AboutUsSection.jsx";
import ResourcesSection from "../components/Resources.jsx";
import SuccessStories from "../components/SuccessStories.jsx";
import FatLoss from "../components/FatLoss.jsx";
import Diabetes from "../components/Diabetes.jsx";
import Thyroid from "../components/Thyroid.jsx";
import GutHealth from "../components/GutHealth.jsx";

export const publicRouteTree = (
  <Route path="/" element={<PublicLayout />}>
    <Route index element={<HomePage />} />
    <Route path="/contact-us" element={<ContactUsSection />} />
    <Route path="/about-us" element={<AboutUsSection/>} />
    <Route path="/resources" element={<ResourcesSection/>} />
    <Route path="/success-stories" element={<SuccessStories/>} />
    <Route path="/fat-loss" element={<FatLoss/>} />
    <Route path="/diabetes-reversal" element={<Diabetes/>} />
    <Route path="/thyroid" element={<Thyroid/>} />
    <Route path="/gut-health" element={<GutHealth/>} />
    {/* <Route path="/gut-health" element={<FatLoss/>} /> */}

    <Route
      path="/privacy-policy"
      element={<StaticPageView slug="privacy-policy" fallbackTitle="Privacy Policy" />}
    />
    <Route
      path="/terms-and-conditions"
      element={<StaticPageView slug="terms-and-conditions" fallbackTitle="Terms and Conditions" />}
    />
    <Route
      path="/community-guideline"
      element={<StaticPageView slug="community-guideline" fallbackTitle="Community Guidelines" />}
    />
    <Route path="/terms" element={<Navigate to="/terms-and-conditions" replace />} />
    {SITE_SECTION_ROUTE_PATHS.map((segment) => (
      <Route key={segment} path={segment} element={<HomePage />} />
    ))}
  </Route>
);
