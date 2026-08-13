import { Navigate, Route, Routes } from "react-router-dom";
import { adminRouteTree } from "./routes/adminRoutes.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      {adminRouteTree}
    </Routes>
  );
}
