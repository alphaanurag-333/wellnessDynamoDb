const config = require("../config");

async function getZoomAccessToken() {
  const accountId = config.zoomAccountId;
  const clientId = config.zoomClientId;
  const clientSecret = config.zoomClientSecret;
  if (!accountId || !clientId || !clientSecret) return null;

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${encodeURIComponent(accountId)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(data?.reason || data?.error || "Zoom token request failed");
    err.name = "ZoomApiError";
    throw err;
  }
  return data.access_token;
}

async function createZoomMeeting({ topic, startTime, durationMinutes = 30, agenda }) {
  if (!config.zoomClientId || !config.zoomClientSecret || !config.zoomAccountId) {
    if (config.nodeEnv !== "production") {
      const mockId = `mock_zoom_${Date.now()}`;
      return {
        id: mockId,
        join_url: `https://zoom.us/j/${mockId}`,
        start_url: `https://zoom.us/s/${mockId}`,
        password: "000000",
        provider: "mock",
      };
    }
    const err = new Error("Zoom API is not configured");
    err.name = "ZoomApiError";
    throw err;
  }

  const token = await getZoomAccessToken();
  const userId = config.zoomUserId || "me";
  const response = await fetch(`https://api.zoom.us/v2/users/${encodeURIComponent(userId)}/meetings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      topic: topic || "Wellness Consultancy Session",
      type: 2,
      start_time: startTime || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      duration: durationMinutes,
      agenda: agenda || "Consultancy session",
      settings: {
        join_before_host: true,
        waiting_room: false,
      },
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(data?.message || "Zoom meeting creation failed");
    err.name = "ZoomApiError";
    err.details = data;
    throw err;
  }

  return {
    id: String(data.id),
    join_url: data.join_url,
    start_url: data.start_url,
    password: data.password || null,
    provider: "zoom",
  };
}

module.exports = {
  createZoomMeeting,
};
