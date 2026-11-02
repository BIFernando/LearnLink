
const { initializeApp, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

const serviceAccount = require("./serviceAccountKey.json");

// Initialize Firebase Admin
initializeApp({
  credential: cert(serviceAccount),
});

async function setAdminRole() {
  try {
    const uid = process.argv[2];

    if (!uid) {
      console.log("Please provide the Admin User UID.");
      process.exitCode = 1;
      return;
    }

    const user = await getAuth().getUser(uid);

    const existingClaims = user.customClaims || {};

    await getAuth().setCustomUserClaims(uid, {
      ...existingClaims,
      admin: true,
    });

    console.log("Admin permission successfully assigned!");
    console.log("Admin UID:", uid);

  } catch (error) {
    console.error("Error:", error.message);
    process.exitCode = 1;
  }
}

setAdminRole();
