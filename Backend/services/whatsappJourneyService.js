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

async function notifyProgressPhotos180SubmittedToCoaches(user) {
  if (!user) return [];
  const clientName = firstName(user.name);
  const coaches = await loadAssignedCoachPersons(user);
  if (!coaches.length) return [{ sent: false, reason: "no_assigned_coach" }];

  const assignedCoachType = String(user.assignedCoachType || "").trim().toLowerCase();
  const parentCoachId = String(user.parentCoachId || "").trim();
  const assignedCoachId = String(user.assignedCoachId || "").trim();

  if (
    assignedCoachType === "assistant_wellness_coach" &&
    assignedCoachId &&
    parentCoachId
  ) {
    const wc =
      coaches.find((c) => String(c.id || c._id || "").trim() === parentCoachId) || coaches[0];
    const awc =
      coaches.find((c) => String(c.id || c._id || "").trim() === assignedCoachId) || coaches[1];
    if (wc && awc && wc !== awc) {
      const params = [firstName(wc.name), firstName(awc.name), clientName];
      const results = [];
      for (const coach of coaches) {
        results.push(
          await sendNamedWhatsAppTemplate({
            templateKey: "uob180SubmitWcAwc",
            person: coach,
            params,
          })
        );
      }
      return results;
    }
  }

  return notifyAssignedCoaches({
    user,
    templateKey: "uob180SubmitWc",
    paramsForCoach: (coach) => [firstName(coach.name), clientName],
  });
}

async function notifyProgressPhotos180SubmittedToUser(user) {
  if (!user) return { sent: false, reason: "missing_user" };
  return sendNamedWhatsAppTemplate({
    templateKey: "uob180ReviewUser",
    person: user,
    params: [firstName(user.name)],
  });
}

async function notifyProgressPhotos180ReshareToUser(user) {
  if (!user) return { sent: false, reason: "missing_user" };
  return sendNamedWhatsAppTemplate({
    templateKey: "uob180ReshareUser",
    person: user,
    params: [firstName(user.name)],
  });
}

async function notifyLabReportUpdatedToCoaches(user) {
  if (!user) return [];
  const clientName = firstName(user.name);
  const coaches = await loadAssignedCoachPersons(user);
  if (!coaches.length) return [{ sent: false, reason: "no_assigned_coach" }];

  const assignedCoachType = String(user.assignedCoachType || "").trim().toLowerCase();
  const parentCoachId = String(user.parentCoachId || "").trim();
  const assignedCoachId = String(user.assignedCoachId || "").trim();

  if (
    assignedCoachType === "assistant_wellness_coach" &&
    assignedCoachId &&
    parentCoachId
  ) {
    const wc =
      coaches.find((c) => String(c.id || c._id || "").trim() === parentCoachId) || coaches[0];
    const awc =
      coaches.find((c) => String(c.id || c._id || "").trim() === assignedCoachId) || coaches[1];
    if (wc && awc && wc !== awc) {
      const params = [firstName(wc.name), firstName(awc.name), clientName];
      const results = [];
      for (const coach of coaches) {
        results.push(
          await sendNamedWhatsAppTemplate({
            templateKey: "uobInternalParaTestReportSubmitWcAwc",
            person: coach,
            params,
          })
        );
      }
      return results;
    }
  }

  return notifyAssignedCoaches({
    user,
    templateKey: "uobInternalParaTestReportSubmitWc",
    paramsForCoach: (coach) => [firstName(coach.name), clientName],
  });
}

async function notifyCommitmentLetterReady(user) {
  if (!user) return { sent: false, reason: "missing_user" };
  return sendNamedWhatsAppTemplate({
    templateKey: "commitLetterInitUser",
    person: user,
    params: [firstName(user.name)],
  });
}

async function notifyCommitmentLetterUpdatedToCoaches(user) {
  if (!user) return [];
  const clientName = firstName(user.name);
  const coaches = await loadAssignedCoachPersons(user);
  if (!coaches.length) return [{ sent: false, reason: "no_assigned_coach" }];

  const assignedCoachType = String(user.assignedCoachType || "").trim().toLowerCase();
  const parentCoachId = String(user.parentCoachId || "").trim();
  const assignedCoachId = String(user.assignedCoachId || "").trim();

  if (
    assignedCoachType === "assistant_wellness_coach" &&
    assignedCoachId &&
    parentCoachId
  ) {
    const wc =
      coaches.find((c) => String(c.id || c._id || "").trim() === parentCoachId) || coaches[0];
    const awc =
      coaches.find((c) => String(c.id || c._id || "").trim() === assignedCoachId) || coaches[1];
    if (wc && awc && wc !== awc) {
      const params = [firstName(wc.name), firstName(awc.name), clientName];
      const results = [];
      for (const coach of coaches) {
        results.push(
          await sendNamedWhatsAppTemplate({
            templateKey: "commitLetterUpdateWcAwc",
            person: coach,
            params,
          })
        );
      }
      return results;
    }
  }

  return notifyAssignedCoaches({
    user,
    templateKey: "commitLetterUpdateWc",
    paramsForCoach: (coach) => [firstName(coach.name), clientName],
  });
}

async function notifyLaunchMeetingCoachConfirmedToUser(user) {
  if (!user) return { sent: false, reason: "missing_user" };
  return sendNamedWhatsAppTemplate({
    templateKey: "launchInitSchedmeetMeetInvUser",
    person: user,
    params: [firstName(user.name)],
  });
}

async function notifyRcaAnalReportToUser(user) {
  if (!user) return { sent: false, reason: "missing_user" };
  return sendNamedWhatsAppTemplate({
    templateKey: "rcaAnalReportUser",
    person: user,
    params: [firstName(user.name)],
  });
}

async function notifyHapMeetingCoachConfirmedToUser(user) {
  if (!user) return { sent: false, reason: "missing_user" };
  return sendNamedWhatsAppTemplate({
    templateKey: "hapSchedmeetMeetInvUser",
    person: user,
    params: [firstName(user.name)],
  });
}

async function notifyReportsBriefingMeetingCoachConfirmedToUser(user) {
  if (!user) return { sent: false, reason: "missing_user" };
  return sendNamedWhatsAppTemplate({
    templateKey: "reportBfSchedmeetMeetInvUser",
    person: user,
    params: [firstName(user.name)],
  });
}

async function notifyProgramInitMeetingCoachConfirmedToUser(user) {
  if (!user) return { sent: false, reason: "missing_user" };
  return sendNamedWhatsAppTemplate({
    templateKey: "programInitSchedmeetMeetInvUser",
    person: user,
    params: [firstName(user.name)],
  });
}

async function notifyProtocolSettingsDesignStartedToUser(user) {
  if (!user) return { sent: false, reason: "missing_user" };
  return sendNamedWhatsAppTemplate({
    templateKey: "protocolSetWcScheduleMeetUser",
    person: user,
    params: [firstName(user.name)],
  });
}

async function notifyLaunchMeetingClientProposedSlotsToCoaches(user) {
  if (!user) return [];
  const clientName = firstName(user.name);
  const coaches = await loadAssignedCoachPersons(user);
  if (!coaches.length) return [{ sent: false, reason: "no_assigned_coach" }];

  const assignedCoachType = String(user.assignedCoachType || "").trim().toLowerCase();
  const parentCoachId = String(user.parentCoachId || "").trim();
  const assignedCoachId = String(user.assignedCoachId || "").trim();

  if (
    assignedCoachType === "assistant_wellness_coach" &&
    assignedCoachId &&
    parentCoachId
  ) {
    const wc =
      coaches.find((c) => String(c.id || c._id || "").trim() === parentCoachId) || coaches[0];
    const awc =
      coaches.find((c) => String(c.id || c._id || "").trim() === assignedCoachId) || coaches[1];
    if (wc && awc && wc !== awc) {
      const params = [firstName(wc.name), firstName(awc.name), clientName];
      const results = [];
      for (const coach of coaches) {
        results.push(
          await sendNamedWhatsAppTemplate({
            templateKey: "launchInitSchedmeetUserSlotWcAwc",
            person: coach,
            params,
          })
        );
      }
      return results;
    }
  }

  return notifyAssignedCoaches({
    user,
    templateKey: "launchInitSchedmeetUserSlotWc",
    paramsForCoach: (coach) => [firstName(coach.name), clientName],
  });
}

async function notifyLaunchMeetingSlotConfirmedByClientToCoaches(user) {
  if (!user) return [];
  const clientName = firstName(user.name);
  const coaches = await loadAssignedCoachPersons(user);
  if (!coaches.length) return [{ sent: false, reason: "no_assigned_coach" }];

  const assignedCoachType = String(user.assignedCoachType || "").trim().toLowerCase();
  const parentCoachId = String(user.parentCoachId || "").trim();
  const assignedCoachId = String(user.assignedCoachId || "").trim();

  if (
    assignedCoachType === "assistant_wellness_coach" &&
    assignedCoachId &&
    parentCoachId
  ) {
    const wc =
      coaches.find((c) => String(c.id || c._id || "").trim() === parentCoachId) || coaches[0];
    const awc =
      coaches.find((c) => String(c.id || c._id || "").trim() === assignedCoachId) || coaches[1];
    if (wc && awc && wc !== awc) {
      const params = [firstName(wc.name), firstName(awc.name), clientName];
      const results = [];
      for (const coach of coaches) {
        results.push(
          await sendNamedWhatsAppTemplate({
            templateKey: "launchInitSchedmeetUserAvailWcAwc",
            person: coach,
            params,
          })
        );
      }
      return results;
    }
  }

  return notifyAssignedCoaches({
    user,
    templateKey: "launchInitSchedmeetUserAvailWc",
    paramsForCoach: (coach) => [firstName(coach.name), clientName],
  });
}

async function notifyHapMeetingClientProposedSlotsToCoaches(user) {
  if (!user) return [];
  const clientName = firstName(user.name);
  const coaches = await loadAssignedCoachPersons(user);
  if (!coaches.length) return [{ sent: false, reason: "no_assigned_coach" }];

  const assignedCoachType = String(user.assignedCoachType || "").trim().toLowerCase();
  const parentCoachId = String(user.parentCoachId || "").trim();
  const assignedCoachId = String(user.assignedCoachId || "").trim();

  if (
    assignedCoachType === "assistant_wellness_coach" &&
    assignedCoachId &&
    parentCoachId
  ) {
    const wc =
      coaches.find((c) => String(c.id || c._id || "").trim() === parentCoachId) || coaches[0];
    const awc =
      coaches.find((c) => String(c.id || c._id || "").trim() === assignedCoachId) || coaches[1];
    if (wc && awc && wc !== awc) {
      const params = [firstName(wc.name), firstName(awc.name), clientName];
      const results = [];
      for (const coach of coaches) {
        results.push(
          await sendNamedWhatsAppTemplate({
            templateKey: "hapSchedmeetUserSlotWcAwc",
            person: coach,
            params,
          })
        );
      }
      return results;
    }
  }

  return notifyAssignedCoaches({
    user,
    templateKey: "hapSchedmeetUserSlotWc",
    paramsForCoach: (coach) => [firstName(coach.name), clientName],
  });
}

async function notifyHapMeetingSlotConfirmedByClientToCoaches(user) {
  if (!user) return [];
  const clientName = firstName(user.name);
  const coaches = await loadAssignedCoachPersons(user);
  if (!coaches.length) return [{ sent: false, reason: "no_assigned_coach" }];

  const assignedCoachType = String(user.assignedCoachType || "").trim().toLowerCase();
  const parentCoachId = String(user.parentCoachId || "").trim();
  const assignedCoachId = String(user.assignedCoachId || "").trim();

  if (
    assignedCoachType === "assistant_wellness_coach" &&
    assignedCoachId &&
    parentCoachId
  ) {
    const wc =
      coaches.find((c) => String(c.id || c._id || "").trim() === parentCoachId) || coaches[0];
    const awc =
      coaches.find((c) => String(c.id || c._id || "").trim() === assignedCoachId) || coaches[1];
    if (wc && awc && wc !== awc) {
      const params = [firstName(wc.name), firstName(awc.name), clientName];
      const results = [];
      for (const coach of coaches) {
        results.push(
          await sendNamedWhatsAppTemplate({
            templateKey: "hapSchedmeetUserAvailWcAwc",
            person: coach,
            params,
          })
        );
      }
      return results;
    }
  }

  return notifyAssignedCoaches({
    user,
    templateKey: "hapSchedmeetUserAvailWc",
    paramsForCoach: (coach) => [firstName(coach.name), clientName],
  });
}

async function notifyProgramInitMeetingClientProposedSlotsToCoaches(user) {
  if (!user) return [];
  const clientName = firstName(user.name);
  const coaches = await loadAssignedCoachPersons(user);
  if (!coaches.length) return [{ sent: false, reason: "no_assigned_coach" }];

  const assignedCoachType = String(user.assignedCoachType || "").trim().toLowerCase();
  const parentCoachId = String(user.parentCoachId || "").trim();
  const assignedCoachId = String(user.assignedCoachId || "").trim();

  if (
    assignedCoachType === "assistant_wellness_coach" &&
    assignedCoachId &&
    parentCoachId
  ) {
    const wc =
      coaches.find((c) => String(c.id || c._id || "").trim() === parentCoachId) || coaches[0];
    const awc =
      coaches.find((c) => String(c.id || c._id || "").trim() === assignedCoachId) || coaches[1];
    if (wc && awc && wc !== awc) {
      const params = [firstName(wc.name), firstName(awc.name), clientName];
      const results = [];
      for (const coach of coaches) {
        results.push(
          await sendNamedWhatsAppTemplate({
            templateKey: "programInitSchedmeetUserSlotWcAwc",
            person: coach,
            params,
          })
        );
      }
      return results;
    }
  }

  return notifyAssignedCoaches({
    user,
    templateKey: "programInitSchedmeetUserSlotWc",
    paramsForCoach: (coach) => [firstName(coach.name), clientName],
  });
}

async function notifyProgramInitMeetingSlotConfirmedByClientToCoaches(user) {
  if (!user) return [];
  const clientName = firstName(user.name);
  const coaches = await loadAssignedCoachPersons(user);
  if (!coaches.length) return [{ sent: false, reason: "no_assigned_coach" }];

  const assignedCoachType = String(user.assignedCoachType || "").trim().toLowerCase();
  const parentCoachId = String(user.parentCoachId || "").trim();
  const assignedCoachId = String(user.assignedCoachId || "").trim();

  if (
    assignedCoachType === "assistant_wellness_coach" &&
    assignedCoachId &&
    parentCoachId
  ) {
    const wc =
      coaches.find((c) => String(c.id || c._id || "").trim() === parentCoachId) || coaches[0];
    const awc =
      coaches.find((c) => String(c.id || c._id || "").trim() === assignedCoachId) || coaches[1];
    if (wc && awc && wc !== awc) {
      const params = [firstName(wc.name), firstName(awc.name), clientName];
      const results = [];
      for (const coach of coaches) {
        results.push(
          await sendNamedWhatsAppTemplate({
            templateKey: "programInitSchedmeetUserAvailWcAwc",
            person: coach,
            params,
          })
        );
      }
      return results;
    }
  }

  return notifyAssignedCoaches({
    user,
    templateKey: "programInitSchedmeetUserAvailWc",
    paramsForCoach: (coach) => [firstName(coach.name), clientName],
  });
}

async function notifyReportsBriefingMeetingClientProposedSlotsToCoaches(user) {
  if (!user) return [];
  const clientName = firstName(user.name);
  const coaches = await loadAssignedCoachPersons(user);
  if (!coaches.length) return [{ sent: false, reason: "no_assigned_coach" }];

  const assignedCoachType = String(user.assignedCoachType || "").trim().toLowerCase();
  const parentCoachId = String(user.parentCoachId || "").trim();
  const assignedCoachId = String(user.assignedCoachId || "").trim();

  if (
    assignedCoachType === "assistant_wellness_coach" &&
    assignedCoachId &&
    parentCoachId
  ) {
    const wc =
      coaches.find((c) => String(c.id || c._id || "").trim() === parentCoachId) || coaches[0];
    const awc =
      coaches.find((c) => String(c.id || c._id || "").trim() === assignedCoachId) || coaches[1];
    if (wc && awc && wc !== awc) {
      const params = [firstName(wc.name), firstName(awc.name), clientName];
      const results = [];
      for (const coach of coaches) {
        results.push(
          await sendNamedWhatsAppTemplate({
            templateKey: "reportBfSchedmeetUserSlotWcAwc",
            person: coach,
            params,
          })
        );
      }
      return results;
    }
  }

  return notifyAssignedCoaches({
    user,
    templateKey: "reportBfSchedmeetUserSlotWc",
    paramsForCoach: (coach) => [firstName(coach.name), clientName],
  });
}

async function notifyReportsBriefingMeetingSlotConfirmedByClientToCoaches(user) {
  if (!user) return [];
  const clientName = firstName(user.name);
  const coaches = await loadAssignedCoachPersons(user);
  if (!coaches.length) return [{ sent: false, reason: "no_assigned_coach" }];

  const assignedCoachType = String(user.assignedCoachType || "").trim().toLowerCase();
  const parentCoachId = String(user.parentCoachId || "").trim();
  const assignedCoachId = String(user.assignedCoachId || "").trim();

  if (
    assignedCoachType === "assistant_wellness_coach" &&
    assignedCoachId &&
    parentCoachId
  ) {
    const wc =
      coaches.find((c) => String(c.id || c._id || "").trim() === parentCoachId) || coaches[0];
    const awc =
      coaches.find((c) => String(c.id || c._id || "").trim() === assignedCoachId) || coaches[1];
    if (wc && awc && wc !== awc) {
      const params = [firstName(wc.name), firstName(awc.name), clientName];
      const results = [];
      for (const coach of coaches) {
        results.push(
          await sendNamedWhatsAppTemplate({
            templateKey: "reportBfSchedmeetUserAvailWcAwc",
            person: coach,
            params,
          })
        );
      }
      return results;
    }
  }

  return notifyAssignedCoaches({
    user,
    templateKey: "reportBfSchedmeetUserAvailWc",
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
  if (onboardingStepJustCompleted(previousStatus, nextStatus, "progressPhotos180")) {
    runWhatsAppSafely("uob-180-submit", notifyProgressPhotos180SubmittedToCoaches(user));
    runWhatsAppSafely("uob-180-review-user", notifyProgressPhotos180SubmittedToUser(user));
  }
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
  runWhatsAppSafely("internalpara-testreport-submit", notifyLabReportUpdatedToCoaches(user));
}

function notifyCommitmentLetterUpdatedToCoachesAsync(user) {
  runWhatsAppSafely("commit-letter-update", notifyCommitmentLetterUpdatedToCoaches(user));
}

function notifyOnboardingSlotsOfferedAsync(payload) {
  runWhatsAppSafely("uob-slots", notifyOnboardingSlotsOffered(payload));
}

function notifyProgressPhotos180ReshareToUserAsync(user) {
  runWhatsAppSafely("uob-180-reshare-user", notifyProgressPhotos180ReshareToUser(user));
}

function notifyLaunchMeetingSlotConfirmedByClientToCoachesAsync(user) {
  runWhatsAppSafely(
    "launch-schedmeet-useravail",
    notifyLaunchMeetingSlotConfirmedByClientToCoaches(user)
  );
}

function notifyLaunchMeetingClientProposedSlotsToCoachesAsync(user) {
  runWhatsAppSafely(
    "launch-schedmeet-userslot",
    notifyLaunchMeetingClientProposedSlotsToCoaches(user)
  );
}

function notifyLaunchMeetingCoachConfirmedToUserAsync(user) {
  runWhatsAppSafely("launch-schedmeet-meetinv-user", notifyLaunchMeetingCoachConfirmedToUser(user));
}

function notifyRcaAnalReportToUserAsync(user) {
  runWhatsAppSafely("rca-anal-report-user", notifyRcaAnalReportToUser(user));
}

function notifyLaunchMeetingConfirmedClientWhatsAppAsync(user) {
  notifyRcaAnalReportToUserAsync(user);
}

function notifyHapMeetingSlotConfirmedByClientToCoachesAsync(user) {
  runWhatsAppSafely("hap-schedmeet-useravail", notifyHapMeetingSlotConfirmedByClientToCoaches(user));
}

function notifyReportsBriefingMeetingSlotConfirmedByClientToCoachesAsync(user) {
  runWhatsAppSafely(
    "reportbf-schedmeet-useravail",
    notifyReportsBriefingMeetingSlotConfirmedByClientToCoaches(user)
  );
}

function notifyReportsBriefingMeetingClientProposedSlotsToCoachesAsync(user) {
  runWhatsAppSafely(
    "reportbf-schedmeet-userslot",
    notifyReportsBriefingMeetingClientProposedSlotsToCoaches(user)
  );
}

function notifyProgramInitMeetingSlotConfirmedByClientToCoachesAsync(user) {
  runWhatsAppSafely(
    "programinit-schedmeet-useravail",
    notifyProgramInitMeetingSlotConfirmedByClientToCoaches(user)
  );
}

function notifyProgramInitMeetingClientProposedSlotsToCoachesAsync(user) {
  runWhatsAppSafely(
    "programinit-schedmeet-userslot",
    notifyProgramInitMeetingClientProposedSlotsToCoaches(user)
  );
}

function notifyHapMeetingClientProposedSlotsToCoachesAsync(user) {
  runWhatsAppSafely("hap-schedmeet-userslot", notifyHapMeetingClientProposedSlotsToCoaches(user));
}

function notifyHapMeetingCoachConfirmedToUserAsync(user) {
  runWhatsAppSafely("hap-schedmeet-meetinv-user", notifyHapMeetingCoachConfirmedToUser(user));
}

function notifyReportsBriefingMeetingCoachConfirmedToUserAsync(user) {
  runWhatsAppSafely(
    "reportbf-schedmeet-meetinv-user",
    notifyReportsBriefingMeetingCoachConfirmedToUser(user)
  );
}

function notifyProgramInitMeetingCoachConfirmedToUserAsync(user) {
  runWhatsAppSafely(
    "programinit-schedmeet-meetinv-user",
    notifyProgramInitMeetingCoachConfirmedToUser(user)
  );
}

function notifyProtocolSettingsDesignStartedToUserAsync(user) {
  runWhatsAppSafely("protocolset-wc-schemeet-user", notifyProtocolSettingsDesignStartedToUser(user));
}

module.exports = {
  runWhatsAppSafely,
  loadAssignedCoachPersons,
  notifyPwcUserRegistered,
  notifyPwcUserRegisteredAsync,
  notifyProgramPaymentConfirmed,
  notifyProgramPaymentConfirmedAsync,
  notifyBodyAnalyticsDoneToCoaches,
  notifyProgressPhotos180SubmittedToCoaches,
  notifyProgressPhotos180SubmittedToUser,
  notifyProgressPhotos180ReshareToUser,
  notifyProgressPhotos180ReshareToUserAsync,
  notifyLabReportUpdatedToCoaches,
  notifyLabReportUpdatedToCoachesAsync,
  notifyCommitmentLetterReady,
  notifyCommitmentLetterUpdatedToCoaches,
  notifyCommitmentLetterUpdatedToCoachesAsync,
  notifyOnboardingSlotsOffered,
  notifyOnboardingSlotsOfferedAsync,
  notifyLaunchMeetingSlotConfirmedByClientToCoaches,
  notifyLaunchMeetingSlotConfirmedByClientToCoachesAsync,
  notifyLaunchMeetingClientProposedSlotsToCoaches,
  notifyLaunchMeetingClientProposedSlotsToCoachesAsync,
  notifyLaunchMeetingCoachConfirmedToUser,
  notifyLaunchMeetingCoachConfirmedToUserAsync,
  notifyRcaAnalReportToUser,
  notifyRcaAnalReportToUserAsync,
  notifyLaunchMeetingConfirmedClientWhatsAppAsync,
  notifyHapMeetingSlotConfirmedByClientToCoaches,
  notifyHapMeetingSlotConfirmedByClientToCoachesAsync,
  notifyReportsBriefingMeetingClientProposedSlotsToCoaches,
  notifyReportsBriefingMeetingClientProposedSlotsToCoachesAsync,
  notifyReportsBriefingMeetingSlotConfirmedByClientToCoaches,
  notifyReportsBriefingMeetingSlotConfirmedByClientToCoachesAsync,
  notifyReportsBriefingMeetingCoachConfirmedToUser,
  notifyReportsBriefingMeetingCoachConfirmedToUserAsync,
  notifyProgramInitMeetingSlotConfirmedByClientToCoaches,
  notifyProgramInitMeetingSlotConfirmedByClientToCoachesAsync,
  notifyProgramInitMeetingClientProposedSlotsToCoaches,
  notifyProgramInitMeetingClientProposedSlotsToCoachesAsync,
  notifyHapMeetingClientProposedSlotsToCoaches,
  notifyHapMeetingClientProposedSlotsToCoachesAsync,
  notifyHapMeetingCoachConfirmedToUser,
  notifyHapMeetingCoachConfirmedToUserAsync,
  notifyProgramInitMeetingCoachConfirmedToUser,
  notifyProgramInitMeetingCoachConfirmedToUserAsync,
  notifyProtocolSettingsDesignStartedToUser,
  notifyProtocolSettingsDesignStartedToUserAsync,
  notifyOnboardingWhatsAppTransitions,
};
