const path = require("path");
const admin = require("firebase-admin");

const DEFAULT_CREDENTIALS = path.join(
  __dirname,
  "..",
  "irwellness-firebase-adminsdk-fbsvc-1429afc8b5.json"
);

let initialized = false;

function getFirebaseCredentialsPath() {
  const fromEnv = (process.env.FIREBASE_SERVICE_ACCOUNT_PATH || "").trim();
  const raw = fromEnv || DEFAULT_CREDENTIALS;
  if (path.isAbsolute(raw)) return raw;
  return path.resolve(__dirname, "..", raw.replace(/^\.\//, ""));
}

function initFirebaseAdmin() {
  if (initialized) return admin;
  const credentialsPath = getFirebaseCredentialsPath();
  const serviceAccount = require(credentialsPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  initialized = true;
  return admin;
}

function getMessaging() {
  return initFirebaseAdmin().messaging();
}

module.exports = {
  initFirebaseAdmin,
  getMessaging,
};
