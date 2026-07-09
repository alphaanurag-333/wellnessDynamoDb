import { useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { UserHealConsultancyTracksPanel } from "../../../components/UserHealConsultancyTracksPanel.jsx";
import {
  assistantListHealConsultancyTracks,
  assistantUpdateHealConsultancyTrack,
} from "../../api/assistantHealConsultancyTracks.js";

const healConsultancyApi = {
  listTracks: assistantListHealConsultancyTracks,
  updateTrack: assistantUpdateHealConsultancyTrack,
};

export function AssistantUserHealConsultancyTracks({ embedded = false }) {
  const assistantToken = useSelector((s) => s.auth.assistantToken);
  const { userId } = useParams();

  return (
    <UserHealConsultancyTracksPanel
      token={assistantToken}
      userId={userId}
      api={healConsultancyApi}
      embedded={embedded}
    />
  );
}
