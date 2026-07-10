import { useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { UserHealConsultancyTracksPanel } from "../../../components/UserHealConsultancyTracksPanel.jsx";
import {
  coachListHealConsultancyTracks,
  coachCreateHealConsultancyTrack,
  coachUpdateHealConsultancyTrack,
  coachDeleteHealConsultancyTrack,
} from "../../api/coachHealConsultancyTracks.js";

const healConsultancyApi = {
  listTracks: coachListHealConsultancyTracks,
  createTrack: coachCreateHealConsultancyTrack,
  updateTrack: coachUpdateHealConsultancyTrack,
  deleteTrack: coachDeleteHealConsultancyTrack,
};

export function UserHealConsultancyTracks({ embedded = false }) {
  const coachToken = useSelector((s) => s.auth.coachToken);
  const { userId } = useParams();

  return (
    <UserHealConsultancyTracksPanel
      token={coachToken}
      userId={userId}
      api={healConsultancyApi}
      embedded={embedded}
    />
  );
}
