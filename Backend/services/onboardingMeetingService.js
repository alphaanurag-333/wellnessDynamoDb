const { createZoomMeeting } = require("../utils/zoom");

const STEP_TITLES = {
  launch: "LAUNCH",
  reportsBriefing: "Reports Briefing",
  hap: "HAP",
  programInitiation: "Program Initiation",
};

function meetingTitle(stepKey, userName) {
  const step = STEP_TITLES[stepKey] || stepKey;
  const name = String(userName || "client").trim() || "client";
  return `${step} meeting with ${name}`;
}

function durationFromRange(startAt, endAt, fallback = 45) {
  const ms = new Date(endAt).getTime() - new Date(startAt).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return fallback;
  return Math.max(15, Math.round(ms / 60000));
}

async function createZoomForMeeting({ stepKey, userName, startAt, durationMinutes }) {
  const zoom = await createZoomMeeting({
    topic: meetingTitle(stepKey, userName),
    startTime: startAt,
    durationMinutes: durationMinutes || 45,
    agenda: meetingTitle(stepKey, userName),
  });
  return {
    zoomMeetingId: zoom?.id ? String(zoom.id) : null,
    zoomJoinUrl: zoom?.join_url || null,
    zoomStartUrl: zoom?.start_url || null,
  };
}

module.exports = {
  STEP_TITLES,
  meetingTitle,
  durationFromRange,
  createZoomForMeeting,
};
