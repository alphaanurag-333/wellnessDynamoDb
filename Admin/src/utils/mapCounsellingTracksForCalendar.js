const CALENDAR_STATUS_BY_TRACK = {
  scheduled: "confirmed",
  periods_offered: "slots_offered",
  period_selected: "slots_offered",
  time_requested: "time_requested",
};

export function mapCounsellingTracksToMeetings(tracks) {
  return (tracks || [])
    .map((track) => {
      const status = CALENDAR_STATUS_BY_TRACK[String(track?.status || "").toLowerCase()];
      if (!status) return null;

      const durationMinutes = Number(track.durationMinutes) || 45;
      let slots = (track.periodOffers || [])
        .filter((offer) => offer?.startAt && offer?.endAt)
        .map((offer) => ({
          id: offer.id,
          startAt: offer.startAt,
          endAt: offer.endAt,
        }));

      if (track.status === "period_selected" && track.selectedOfferId) {
        const selected = slots.find((slot) => String(slot.id) === String(track.selectedOfferId));
        if (selected) slots = [selected];
      }

      let confirmedEndAt = null;
      if (track.scheduledAt && track.status === "scheduled") {
        confirmedEndAt = new Date(
          new Date(track.scheduledAt).getTime() + durationMinutes * 60 * 1000,
        ).toISOString();
      }

      return {
        id: track.id,
        userId: track.userId,
        userName: track.userName,
        stepKey: "counselling",
        status,
        slots,
        selectedSlotId: track.status === "scheduled" ? null : track.selectedOfferId,
        confirmedStartAt: track.status === "scheduled" ? track.scheduledAt : null,
        confirmedEndAt,
        requestedSlots: track.requestedSlots || [],
        requestedStartAt: track.requestedStartAt,
        requestedEndAt: track.requestedEndAt,
        durationMinutes,
        coachNote: track.coachNotes,
        holdExpiresAt: null,
        meetingKind: "counselling",
        meeting: track,
      };
    })
    .filter(Boolean);
}
