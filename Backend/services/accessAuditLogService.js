const { createAccessAuditLog } = require("../models/accessAuditLogModel");

function emitSafely(promise) {
  Promise.resolve(promise).catch((err) => {
    console.error("[AccessAuditLog] emit failed:", err?.message || err);
  });
}

async function recordAccessAuditLog(payload) {
  return createAccessAuditLog(payload);
}

function recordAccessAuditLogAsync(payload) {
  emitSafely(recordAccessAuditLog(payload));
}

module.exports = {
  recordAccessAuditLog,
  recordAccessAuditLogAsync,
};
