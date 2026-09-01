const { createAdminActivity } = require("../models/adminActivityModel");

function formatRupee(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return null;
  return `Rs. ${Math.round(n).toLocaleString("en-IN")}`;
}

function userDisplayName(user) {
  return String(user?.name || user?.fullName || "A client").trim() || "A client";
}

function emitSafely(promise) {
  Promise.resolve(promise).catch((err) => {
    console.error("[AdminActivity] emit failed:", err?.message || err);
  });
}

async function emitAdminActivity(payload) {
  return createAdminActivity(payload);
}

function emitAdminActivityAsync(payload) {
  emitSafely(emitAdminActivity(payload));
}

function emitPendingAssignment(user) {
  const name = userDisplayName(user);
  emitAdminActivityAsync({
    kind: "assignment",
    title: `${name} pending coach assignment`,
    from: "System",
    actorType: "system",
    subjectUserId: user?.id || user?._id || null,
    subjectUserName: name,
    referenceType: "user",
    referenceId: user?.id || user?._id || null,
    href: "/users?assignmentStatus=pending_admin",
  });
}

function emitCoachAssigned({ user, assigneeName, assigneeType, action = "assigned" }) {
  const name = userDisplayName(user);
  const coach = String(assigneeName || "a coach").trim() || "a coach";
  const verb = action === "reassigned" ? "reassigned to" : "assigned to";
  emitAdminActivityAsync({
    kind: "assignment",
    title: `${name} ${verb} ${coach}`,
    from: assigneeType === "assistant_wellness_coach" ? "Assistant WC" : "Wellness Coach",
    actorType: "admin",
    subjectUserId: user?.id || user?._id || null,
    subjectUserName: name,
    referenceType: "user",
    referenceId: user?.id || user?._id || null,
    href: user?.id || user?._id ? `/users/${user.id || user._id}` : "/users",
  });
}

function emitPaymentReceived({ user, amount, productLabel = "Program", transactionId = null }) {
  const name = userDisplayName(user);
  const rupee = formatRupee(amount);
  const title = rupee
    ? `${productLabel} payment received – ${rupee}${name !== "A client" ? ` (${name})` : ""}`
    : `${productLabel} payment received${name !== "A client" ? ` – ${name}` : ""}`;

  emitAdminActivityAsync({
    kind: "payment",
    title,
    from: "Billing",
    actorType: "user",
    actorId: user?.id || user?._id || null,
    actorName: name,
    subjectUserId: user?.id || user?._id || null,
    subjectUserName: name,
    referenceType: "consultancy_transaction",
    referenceId: transactionId,
    href: user?.id || user?._id ? `/users/${user.id || user._id}` : "/users",
    meta: { amount: Number(amount) || null, productLabel },
  });
}

function emitBirthdayToday(user) {
  const name = userDisplayName(user);
  emitAdminActivityAsync({
    kind: "calendar",
    title: `${name}'s birthday is today`,
    from: "Community",
    actorType: "system",
    subjectUserId: user?.id || user?._id || null,
    subjectUserName: name,
    referenceType: "birthday",
    referenceId: user?.id || user?._id || null,
    href: user?.id || user?._id ? `/users/${user.id || user._id}` : "/calendar",
  });
}

function emitMonthlyChampion({ userName, userId, monthLabel, postId = null }) {
  const name = String(userName || "A client").trim() || "A client";
  const month = String(monthLabel || "").trim();
  emitAdminActivityAsync({
    kind: "champion",
    title: month ? `${name} leads ${month} leaderboard` : `${name} is monthly champion`,
    from: "Daily Reflection",
    actorType: "system",
    subjectUserId: userId || null,
    subjectUserName: name,
    referenceType: "monthly_champion_post",
    referenceId: postId,
    href: userId ? `/users/${userId}` : "/dashboard",
  });
}

function emitMealLogged({ user, mealLogId }) {
  const name = userDisplayName(user);
  emitAdminActivityAsync({
    kind: "meal",
    title: `${name} logged a meal for review`,
    from: "Client",
    actorType: "user",
    actorId: user?.id || user?._id || null,
    actorName: name,
    subjectUserId: user?.id || user?._id || null,
    subjectUserName: name,
    referenceType: "meal_tracking",
    referenceId: mealLogId,
    href: user?.id || user?._id ? `/users/${user.id || user._id}` : "/users",
  });
}

function counsellingProfileHref(user) {
  const userId = user?.id || user?._id;
  return userId ? `/users/${userId}?section=counselling` : "/users";
}

function emitCounsellingClientAction({ user, trackId, title }) {
  const name = userDisplayName(user);
  const userId = user?.id || user?._id || null;
  emitAdminActivityAsync({
    kind: "counselling",
    title,
    from: "Client",
    actorType: "user",
    actorId: userId,
    actorName: name,
    subjectUserId: userId,
    subjectUserName: name,
    referenceType: "heal_consultancy_track",
    referenceId: trackId || null,
    href: counsellingProfileHref(user),
  });
}

function emitCounsellingRequested({ user, trackId }) {
  const name = userDisplayName(user);
  emitCounsellingClientAction({
    user,
    trackId,
    title: `${name} booked a counselling session`,
  });
}

function emitCounsellingPeriodSelected({ user, trackId }) {
  const name = userDisplayName(user);
  emitCounsellingClientAction({
    user,
    trackId,
    title: `${name} selected a counselling time period`,
  });
}

function emitCounsellingTimeRequested({ user, trackId }) {
  const name = userDisplayName(user);
  emitCounsellingClientAction({
    user,
    trackId,
    title: `${name} requested another time for counselling`,
  });
}

function emitLabReportUploaded({ user, reportId }) {
  const name = userDisplayName(user);
  emitAdminActivityAsync({
    kind: "lab",
    title: `${name} uploaded a lab report`,
    from: "Client",
    actorType: "user",
    actorId: user?.id || user?._id || null,
    actorName: name,
    subjectUserId: user?.id || user?._id || null,
    subjectUserName: name,
    referenceType: "user_lab_report",
    referenceId: reportId,
    href: user?.id || user?._id ? `/users/${user.id || user._id}` : "/users",
  });
}

function emitContactInquiry({ inquiry }) {
  const name = String(inquiry?.name || "Someone").trim() || "Someone";
  const type = String(inquiry?.inquiryType || inquiry?.type || "general").trim();
  emitAdminActivityAsync({
    kind: "feedback",
    title: `New contact inquiry from ${name}`,
    from: "Support",
    actorType: "system",
    actorName: name,
    referenceType: "contact_inquiry",
    referenceId: inquiry?.id || null,
    href: "/dashboard",
    meta: { inquiryType: type, email: inquiry?.email || null },
  });
}

function emitCoachClientAction({ kind = "coach", title, from = "Coach", user, actorName, referenceType, referenceId }) {
  emitAdminActivityAsync({
    kind,
    title,
    from,
    actorType: "coach",
    actorName: actorName || null,
    subjectUserId: user?.id || user?._id || null,
    subjectUserName: userDisplayName(user),
    referenceType: referenceType || null,
    referenceId: referenceId || null,
    href: user?.id || user?._id ? `/users/${user.id || user._id}` : "/users",
  });
}

module.exports = {
  emitAdminActivity,
  emitAdminActivityAsync,
  emitPendingAssignment,
  emitCoachAssigned,
  emitPaymentReceived,
  emitBirthdayToday,
  emitMonthlyChampion,
  emitMealLogged,
  emitCounsellingRequested,
  emitCounsellingPeriodSelected,
  emitCounsellingTimeRequested,
  emitLabReportUploaded,
  emitContactInquiry,
  emitCoachClientAction,
  formatRupee,
};
