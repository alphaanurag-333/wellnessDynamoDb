import { lazy } from "react";
import { Navigate, Route } from "react-router-dom";
import { SITE_SECTION_ROUTE_PATHS } from "../data/siteSections.js";
import { PublicLayout } from "../layout/PublicLayout.jsx";

function lazyNamed(importer, exportName) {
  return lazy(() => importer().then((mod) => ({ default: mod[exportName] })));
}

const HomePage = lazyNamed(() => import("../pages/HomePage.jsx"), "HomePage");
const StaticPageView = lazyNamed(() => import("../pages/StaticPageView.jsx"), "StaticPageView");
const DeleteAccountPage = lazyNamed(() => import("../pages/DeleteAccountPage.jsx"), "DeleteAccountPage");
const ContactUsSection = lazy(() => import("../components/ContactUs.jsx"));
const AboutUsSection = lazy(() => import("../components/AboutUsSection.jsx"));
const ResourcesSection = lazy(() => import("../components/Resources.jsx"));
const SuccessStories = lazy(() => import("../components/SuccessStories.jsx"));
const FatLoss = lazy(() => import("../components/FatLoss.jsx"));
const Diabetes = lazy(() => import("../components/Diabetes.jsx"));
const Thyroid = lazy(() => import("../components/Thyroid.jsx"));
const GutHealth = lazy(() => import("../components/GutHealth.jsx"));
const Pcod = lazy(() => import("../components/Pcod.jsx"));

export const publicRouteTree = (
  <Route path="/" element={<PublicLayout />}>
    <Route index element={<HomePage />} />
    <Route path="/contact-us" element={<ContactUsSection />} />
    <Route path="/about-us" element={<AboutUsSection />} />
    <Route path="/wellnesspedia" element={<ResourcesSection />} />
    <Route path="/success-stories" element={<SuccessStories />} />
    <Route path="/fat-loss" element={<FatLoss />} />
    <Route path="/diabetes-reversal" element={<Diabetes />} />
    <Route path="/thyroid" element={<Thyroid />} />
    <Route path="/gut-health" element={<GutHealth />} />
    <Route path="/pcod-pcos-reversal" element={<Pcod />} />

    <Route
      path="/privacy-policy"
      element={<StaticPageView slug="privacy-policy" fallbackTitle="Privacy Policy" />}
    />
    <Route path="/privacy" element={<Navigate to="/privacy-policy" replace />} />
    <Route
      path="/terms-and-conditions"
      element={<StaticPageView slug="terms-and-conditions" fallbackTitle="Terms and Conditions" />}
    />
    <Route path="/terms" element={<Navigate to="/terms-and-conditions" replace />} />
    <Route path="/terms-of-service" element={<Navigate to="/terms-and-conditions" replace />} />
    <Route
      path="/community-guideline"
      element={<StaticPageView slug="community-guideline" fallbackTitle="Community Guidelines" />}
    />
    <Route path="/community-guidelines" element={<Navigate to="/community-guideline" replace />} />
    <Route
      path="/app-privacy-policy"
      element={
        <StaticPageView
          slug="app-privacy-policy"
          fallbackTitle="App Privacy Policy"
          platform="app"
        />
      }
    />
    <Route
      path="/app-terms-and-conditions"
      element={
        <StaticPageView
          slug="app-terms-of-service"
          fallbackTitle="App Terms and Conditions"
          platform="app"
        />
      }
    />
    <Route path="/app/privacy-policy" element={<Navigate to="/app-privacy-policy" replace />} />
    <Route path="/app/terms-and-conditions" element={<Navigate to="/app-terms-and-conditions" replace />} />
    <Route path="/app-terms-of-service" element={<Navigate to="/app-terms-and-conditions" replace />} />
    <Route path="/app-terms-conditions" element={<Navigate to="/app-terms-and-conditions" replace />} />
    <Route path="/delete-account" element={<DeleteAccountPage />} />
    <Route path="/delete" element={<Navigate to="/delete-account" replace />} />
    <Route path="/account-deletion" element={<Navigate to="/delete-account" replace />} />
    {SITE_SECTION_ROUTE_PATHS.map((segment) => (
      <Route key={segment} path={segment} element={<HomePage />} />
    ))}
  </Route>
);
