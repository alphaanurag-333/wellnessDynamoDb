const { getUserById } = require("../models/userModel");
const { getWellnessCoachById } = require("../models/wellnessCoachModel");
const { getAssistantWellnessCoachById } = require("../models/assistantWellnessCoachModel");
const { onboardingStepJustCompleted } = require("../utils/paidOnboardingHelpers");
const { resolveWhatsappNumber } = require("./meetingAssigneeService");
const {
  firstName,
  formatInrAmount,
  sendNamedWhatsAppTemplate,
  slotTemplateKeyForStep,
} = require("../utils/whatsapp");

function runWhatsAppSafely(label, promise) {
  Promise.resolve(promise).catch((err) => {
    console.error(`[WhatsApp] ${label} failed:`, err?.message || err);
  });
}

async function addCoachPerson(persons, seen, person) {
  if (!person) return;
  const id = String(person.id || person._id || "").trim();
  if (id && seen.has(id)) return;
  if (!resolveWhatsappNumber(person)) return;
  if (id) seen.add(id);
  persons.push(person);
}

async function loadAssignedCoachPersons(user) {
  const persons = [];
  const seen = new Set();
  const {
    getWellnessCoachByIdResolved,
    getAssistantWellnessCoachByIdResolved,
  } = require("./accountResolver");

  const parentCoachId = String(user?.parentCoachId || "").trim();
  const assignedCoachId = String(user?.assignedCoachId || "").trim();
  const assignedCoachType = String(user?.assignedCoachType || "").trim().toLowerCase();

  if (parentCoachId) {
    await addCoachPerson(
      persons,
      seen,
      (await getWellnessCoachByIdResolved(parentCoachId)) ||
        (await getWellnessCoachById(parentCoachId))
    );
  }

  if (assignedCoachType === "assistant_wellness_coach" && assignedCoachId) {
    await addCoachPerson(
      persons,
      seen,
      (await getAssistantWellnessCoachByIdResolved(assignedCoachId)) ||
        (await getAssistantWellnessCoachById(assignedCoachId))
    );
  } else if (assignedCoachId && assignedCoachId !== parentCoachId) {
    await addCoachPerson(
      persons,
      seen,
      (await getWellnessCoachByIdResolved(assignedCoachId)) ||
        (await getWellnessCoachById(assignedCoachId))
    );
  }

  return persons;
}

async function notifyAssignedCoaches({ user, templateKey, paramsForCoach }) {
  const coaches = await loadAssignedCoachPersons(user);
  if (!coaches.length) return [{ sent: false, reason: "no_assigned_coach" }];
  const results = [];
  for (const coach of coaches) {
    const params =
      typeof paramsForCoach === "function" ? paramsForCoach(coach) : paramsForCoach;
    results.push(await sendNamedWhatsAppTemplate({ templateKey, person: coach, params }));
  }
  return results;
}

async function notifyPwcUserRegistered({ user, healthConcernTitle }) {
  if (!user) return { sent: false, reason: "missing_user" };
  return sendNamedWhatsAppTemplate({
    templateKey: "pwcUser",
    person: user,
    params: [firstName(user.name), healthConcernTitle || "your health concern"],
  });
}

async function notifyProgramPaymentConfirmed({ user, totalAmount }) {
  if (!user) return { sent: false, reason: "missing_user" };
  return sendNamedWhatsAppTemplate({
    templateKey: "programConfirm",
    person: user,
    params: [firstName(user.name), formatInrAmount(totalAmount)],
  });
}

async function notifyBodyAnalyticsDoneToCoaches(user) {
  if (!user) return [];
  const clientName = firstName(user.name);
  return notifyAssignedCoaches({
    user,
    templateKey: "uobBa",
    paramsForCoach: (coach) => [firstName(coach.name), clientName],
  });
}

async function notifyLabReportUpdatedToCoaches(user) {
  if (!user) return [];
  const clientName = firstName(user.name);
  return notifyAssignedCoaches({
    user,
    templateKey: "uobBr",
    paramsForCoach: (coach) => [firstName(coach.name), clientName],
  });
}

async function notifyCommitmentLetterReady(user) {
  if (!user) return { sent: false, reason: "missing_user" };
  return sendNamedWhatsAppTemplate({
    templateKey: "uobCl",
    person: user,
    params: [firstName(user.name)],
  });
}

async function notifyCommitmentLetterUpdatedToCoaches(user) {
  if (!user) return [];
  const clientName = firstName(user.name);
  return notifyAssignedCoaches({
    user,
    templateKey: "uobPiCoach",
    paramsForCoach: (coach) => [firstName(coach.name), clientName],
  });
}

async function notifyOnboardingSlotsOffered({ user, userId, stepKey }) {
  const templateKey = slotTemplateKeyForStep(stepKey);
  if (!templateKey) return { sent: false, reason: "no_template_for_step" };
  const person = user || (userId ? await getUserById(userId) : null);
  if (!person) return { sent: false, reason: "missing_user" };
  return sendNamedWhatsAppTemplate({
    templateKey,
    person,
    params: [firstName(person.name)],
  });
}

function notifyOnboardingWhatsAppTransitions({ user, previousStatus, nextStatus }) {
  if (!user) return;
  if (onboardingStepJustCompleted(previousStatus, nextStatus, "bodyAnalytics")) {
    runWhatsAppSafely("uob-ba", notifyBodyAnalyticsDoneToCoaches(user));
  }
  if (onboardingStepJustCompleted(previousStatus, nextStatus, "protocolSettings")) {
    runWhatsAppSafely("uob-cl", notifyCommitmentLetterReady(user));
  }
}

function notifyPwcUserRegisteredAsync(payload) {
  runWhatsAppSafely("pwc-user", notifyPwcUserRegistered(payload));
}

function notifyProgramPaymentConfirmedAsync(payload) {
  runWhatsAppSafely("program-confirm", notifyProgramPaymentConfirmed(payload));
}

function notifyLabReportUpdatedToCoachesAsync(user) {
  runWhatsAppSafely("uob-br", notifyLabReportUpdatedToCoaches(user));
}

function notifyCommitmentLetterUpdatedToCoachesAsync(user) {
  runWhatsAppSafely("uob-pi-011", notifyCommitmentLetterUpdatedToCoaches(user));
}

function notifyOnboardingSlotsOfferedAsync(payload) {
  runWhatsAppSafely("uob-slots", notifyOnboardingSlotsOffered(payload));
}

module.exports = {
  runWhatsAppSafely,
  loadAssignedCoachPersons,
  notifyPwcUserRegistered,
  notifyPwcUserRegisteredAsync,
  notifyProgramPaymentConfirmed,
  notifyProgramPaymentConfirmedAsync,
  notifyBodyAnalyticsDoneToCoaches,
  notifyLabReportUpdatedToCoaches,
  notifyLabReportUpdatedToCoachesAsync,
  notifyCommitmentLetterReady,
  notifyCommitmentLetterUpdatedToCoaches,
  notifyCommitmentLetterUpdatedToCoachesAsync,
  notifyOnboardingSlotsOffered,
  notifyOnboardingSlotsOfferedAsync,
  notifyOnboardingWhatsAppTransitions,
};
