import { Route } from "react-router-dom";
import { SITE_SECTION_ROUTE_PATHS } from "../data/siteSections.js";
import { PublicLayout } from "../layout/PublicLayout.jsx";
import { HomePage } from "../pages/HomePage.jsx";
import ContactUsSection from "../components/ContactUs.jsx";

export const publicRouteTree = (
  <Route path="/" element={<PublicLayout />}>
    <Route index element={<HomePage />} />
    <Route path="/contact-us" element={<ContactUsSection />} />
    {SITE_SECTION_ROUTE_PATHS.map((segment) => (
      <Route key={segment} path={segment} element={<HomePage />} />
    ))}
  </Route>
);
