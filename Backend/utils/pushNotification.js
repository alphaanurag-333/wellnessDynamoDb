const { getMessaging } = require("../config/firebase");

const FCM_BATCH_SIZE = 500;

function chunkArray(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function buildMulticastMessage({ tokens, title, body, imageUrl, data }) {
  const message = {
    tokens,
    notification: {
      title: String(title || "IR Wellness").trim() || "IR Wellness",
      body: String(body || "").trim(),
    },
  };

  if (imageUrl) {
    message.notification.imageUrl = imageUrl;
    message.android = { notification: { imageUrl } };
    message.apns = {
      payload: { aps: { "mutable-content": 1 } },
      fcm_options: { image: imageUrl },
    };
  }

  if (data && Object.keys(data).length > 0) {
    message.data = Object.fromEntries(
      Object.entries(data).map(([key, value]) => [key, String(value ?? "")])
    );
  }

  return message;
}

async function sendPushToTokens(tokens, payload) {
  const uniqueTokens = [...new Set((tokens || []).map((t) => String(t).trim()).filter(Boolean))];
  if (uniqueTokens.length === 0) {
    return { successCount: 0, failureCount: 0, skipped: true };
  }

  const messaging = getMessaging();
  let successCount = 0;
  let failureCount = 0;

  for (const batch of chunkArray(uniqueTokens, FCM_BATCH_SIZE)) {
    const response = await messaging.sendEachForMulticast(
      buildMulticastMessage({ tokens: batch, ...payload })
    );
    successCount += response.successCount;
    failureCount += response.failureCount;
  }

  return { successCount, failureCount, skipped: false, total: uniqueTokens.length };
}

module.exports = {
  sendPushToTokens,
};
