import { useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { UserHealConsultancyTracksPanel } from "../../../../components/UserHealConsultancyTracksPanel.jsx";
import {
  adminListHealConsultancyTracks,
  adminCreateHealConsultancyTrack,
  adminUpdateHealConsultancyTrack,
  adminDeleteHealConsultancyTrack,
} from "../../../api/adminHealConsultancyTracks.js";

const healConsultancyApi = {
  listTracks: adminListHealConsultancyTracks,
  createTrack: adminCreateHealConsultancyTrack,
  updateTrack: adminUpdateHealConsultancyTrack,
  deleteTrack: adminDeleteHealConsultancyTrack,
};

export function AdminUserHealConsultancyTracks({ embedded = false }) {
  const adminToken = useSelector((s) => s.auth.adminToken);
  const { userId } = useParams();

  return (
    <UserHealConsultancyTracksPanel
      token={adminToken}
      userId={userId}
      api={healConsultancyApi}
      embedded={embedded}
    />
  );
}
