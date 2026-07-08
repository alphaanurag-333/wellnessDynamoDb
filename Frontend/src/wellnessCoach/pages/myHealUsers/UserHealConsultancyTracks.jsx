import { useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { UserHealConsultancyTracksPanel } from "../../../components/UserHealConsultancyTracksPanel.jsx";
import {
  coachListHealConsultancyTracks,
  coachUpdateHealConsultancyTrack,
} from "../../api/coachHealConsultancyTracks.js";

const healConsultancyApi = {
  listTracks: coachListHealConsultancyTracks,
  updateTrack: coachUpdateHealConsultancyTrack,
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
