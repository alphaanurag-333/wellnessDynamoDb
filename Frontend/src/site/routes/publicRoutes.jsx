import { Route } from "react-router-dom";
import { SITE_SECTION_ROUTE_PATHS } from "../data/siteSections.js";
import { PublicLayout } from "../layout/PublicLayout.jsx";
import { HomePage } from "../pages/HomePage.jsx";

export const publicRouteTree = (
  <Route path="/" element={<PublicLayout />}>
    <Route index element={<HomePage />} />
    {SITE_SECTION_ROUTE_PATHS.map((segment) => (
      <Route key={segment} path={segment} element={<HomePage />} />
    ))}
  </Route>
);
