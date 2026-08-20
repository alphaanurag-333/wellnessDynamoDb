import api, { normalizeApiError } from "../api.js";

function referralTreeBase() {
  return "/account/referral-tree";
}

export async function fetchReferralOverview({ topLimit = 25, recentLimit = 40 } = {}) {
  const q = new URLSearchParams();
  q.set("topLimit", String(topLimit));
  q.set("recentLimit", String(recentLimit));

  try {
    const { data } = await api.get(`${referralTreeBase()}/overview?${q}`);
    return {
      summary: data?.summary || {
        totalUsers: 0,
        totalWithReferral: 0,
        peerReferred: 0,
        coachReferred: 0,
        awcReferred: 0,
        otherReferred: 0,
        referrersWithDownline: 0,
        staffReferrersWithDownline: 0,
      },
      topReferrers: Array.isArray(data?.topReferrers) ? data.topReferrers : [],
      topStaffReferrers: Array.isArray(data?.topStaffReferrers) ? data.topStaffReferrers : [],
      recentReferrals: Array.isArray(data?.recentReferrals) ? data.recentReferrals : [],
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function fetchReferralTree({
  rootUserId,
  rootEntityId,
  referralCode,
  mode,
  maxDepth = 5,
  maxNodes = 500,
} = {}) {
  const q = new URLSearchParams();
  if (rootUserId) q.set("rootUserId", String(rootUserId).trim());
  if (rootEntityId) q.set("rootEntityId", String(rootEntityId).trim());
  if (referralCode) q.set("referralCode", String(referralCode).trim());
  if (mode) q.set("mode", String(mode).trim());
  if (maxDepth != null) q.set("maxDepth", String(maxDepth));
  if (maxNodes != null) q.set("maxNodes", String(maxNodes));

  try {
    const { data } = await api.get(`${referralTreeBase()}?${q}`);
    return {
      root: data?.root || null,
      meta: data?.meta || { maxDepth, nodeCount: 0, truncated: false, mode: mode || "user" },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}
