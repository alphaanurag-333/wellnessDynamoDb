const config = require("../config");
const { resolveWhatsappNumber } = require("../services/meetingAssigneeService");

function formatE164(phoneCountryCode, phone) {
  const cc = String(phoneCountryCode || "").replace(/\s/g, "");
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return null;
  if (cc.startsWith("+")) return `${cc}${digits}`;
  return `+${cc.replace(/^\+/, "")}${digits}`;
}

async function sendWhatsAppText({ toPhoneCountryCode, toPhone, message }) {
  const to = formatE164(toPhoneCountryCode, toPhone);
  if (!to) {
    return { sent: false, reason: "missing_phone" };
  }

  const phoneNumberId = config.whatsappPhoneNumberId;
  const accessToken = config.whatsappAccessToken;

  if (!phoneNumberId || !accessToken) {
    if (config.nodeEnv !== "production") {
      console.info(`[WhatsApp] To ${to}: ${message}`);
      return { sent: true, provider: "mock", to };
    }
    return { sent: false, reason: "not_configured", to };
  }

  try {
    const response = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: to.replace(/^\+/, ""),
        type: "text",
        text: { body: message },
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("[WhatsApp] send failed", data);
      return { sent: false, reason: data?.error?.message || "send_failed", to };
    }
    return { sent: true, provider: "whatsapp", to, messageId: data?.messages?.[0]?.id || null };
  } catch (err) {
    console.error("[WhatsApp] send error", err.message);
    return { sent: false, reason: err.message, to };
  }
}

async function sendConsultancyWhatsAppNotifications({ user, assignee, parentCoach, referenceNumber, zoomJoinUrl, totalAmount }) {
  const results = { user: null, assignee: null, parentCoach: null };

  const userWa = resolveWhatsappNumber(user);
  if (userWa) {
    results.user = await sendWhatsAppText({
      toPhoneCountryCode: userWa.phoneCountryCode,
      toPhone: userWa.phone,
      message: `Thank you for your payment of Rs. ${totalAmount}. Reference: ${referenceNumber}. Your Zoom meeting link: ${zoomJoinUrl}. Please reply with your preferred time slot to book the appointment.`,
    });
  }

  if (assignee && assignee.type !== "admin") {
    const assigneeWa = resolveWhatsappNumber(assignee);
    if (assigneeWa) {
      results.assignee = await sendWhatsAppText({
        toPhoneCountryCode: assigneeWa.phoneCountryCode,
        toPhone: assigneeWa.phone,
        message: `New consultancy booking assigned to you. Client: ${user?.name || "User"}. Reference: ${referenceNumber}. Zoom link: ${zoomJoinUrl}`,
      });
    }
  }

  if (
    parentCoach &&
    assignee?.type === "assistant_wellness_coach" &&
    parentCoach.id !== assignee.id
  ) {
    const parentWa = resolveWhatsappNumber(parentCoach);
    if (parentWa) {
      results.parentCoach = await sendWhatsAppText({
        toPhoneCountryCode: parentWa.phoneCountryCode,
        toPhone: parentWa.phone,
        message: `Consultancy booked with your assistant (${assignee.name || "AWC"}). Client: ${user?.name || "User"}. Reference: ${referenceNumber}. Zoom: ${zoomJoinUrl}`,
      });
    }
  }

  return results;
}

module.exports = {
  formatE164,
  sendWhatsAppText,
  sendConsultancyWhatsAppNotifications,
};
