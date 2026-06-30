import { Route } from "react-router-dom";
import { SITE_SECTION_ROUTE_PATHS } from "../data/siteSections.js";
import { PublicLayout } from "../layout/PublicLayout.jsx";
import { HomePage } from "../pages/HomePage.jsx";
import ContactUsSection from "../components/ContactUs.jsx";
import AboutUsSection from "../components/AboutUsSection.jsx";
import ResourcesSection from "../components/Resources.jsx";
import SuccessStories from "../components/SuccessStories.jsx";

export const publicRouteTree = (
  <Route path="/" element={<PublicLayout />}>
    <Route index element={<HomePage />} />
    <Route path="/contact-us" element={<ContactUsSection />} />
    <Route path="/about-us" element={<AboutUsSection/>} />
    <Route path="/resources" element={<ResourcesSection/>} />
    <Route path="/success-stories" element={<SuccessStories/>} />
    {SITE_SECTION_ROUTE_PATHS.map((segment) => (
      <Route key={segment} path={segment} element={<HomePage />} />
    ))}
  </Route>
);
