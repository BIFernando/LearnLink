import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { after, before, beforeEach, test } from "node:test";

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";

process.env.GCLOUD_PROJECT = "demo-learnlink";
process.env.GOOGLE_CLOUD_PROJECT = "demo-learnlink";

const require = createRequire(import.meta.url);
const {
  completeCreditSession,
  moderateReport,
  submitReport,
} = require("../functions/lib/functions/src/index.js");

const testEnvironment = await initializeTestEnvironment({
  projectId: "demo-learnlink",
  firestore: {
    rules: readFileSync(new URL("../firestore.rules", import.meta.url), "utf8"),
  },
});

const userDb = (uid, claims = {}) =>
  testEnvironment.authenticatedContext(uid, claims).firestore();

async function seedDocuments(documents) {
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await Promise.all(
      documents.map(({ path, data }) => setDoc(doc(db, path), data))
    );
  });
}

function acceptedExchange(exchangeType = "DIRECT") {
  return {
    senderId: "alice",
    receiverId: "bob",
    exchangeType,
    offeredSkillId: "skill-a",
    requestedSkillId: "skill-b",
    creditAmount: exchangeType === "CREDIT" ? 10 : 0,
    status: "ACCEPTED",
  };
}

function sessionData(overrides = {}) {
  return {
    exchangeRequestId: "exchange-1",
    teacherId: "alice",
    learnerId: "bob",
    skillId: "skill-a",
    scheduledAt: new Date("2030-01-01T10:00:00Z"),
    duration: 60,
    sessionType: "ONLINE",
    meetingLink: "https://example.test/meeting",
    status: "PROPOSED",
    completedBy: [],
    ...overrides,
  };
}

before(async () => {
  await testEnvironment.clearFirestore();
});

beforeEach(async () => {
  await testEnvironment.clearFirestore();
});

after(async () => {
  await testEnvironment.cleanup();
});

test("users retain matching reads but cannot change roles, credits, or other users", async () => {
  await seedDocuments([
    { path: "users/alice", data: { displayName: "Alice", skillCredits: 20 } },
    { path: "users/bob", data: { displayName: "Bob", skillCredits: 20 } },
    { path: "userSkills/skill-a-alice", data: { userId: "alice" } },
  ]);
  const aliceDb = userDb("alice");

  await assertSucceeds(getDoc(doc(aliceDb, "users", "bob")));
  await assertSucceeds(getDocs(collection(aliceDb, "userSkills")));
  await assertSucceeds(
    updateDoc(doc(aliceDb, "users", "alice"), { displayName: "Alice 2" })
  );
  await assertFails(
    updateDoc(doc(aliceDb, "users", "alice"), { admin: true })
  );
  await assertFails(
    updateDoc(doc(aliceDb, "users", "alice"), { skillCredits: 1000 })
  );
  await assertFails(
    updateDoc(doc(aliceDb, "users", "alice"), { suspended: true })
  );
  await assertFails(deleteDoc(doc(aliceDb, "users", "bob")));
});

test("match owners can update their matches but cannot transfer ownership", async () => {
  await seedDocuments([
    {
      path: "matches/match-alice",
      data: {
        userId: "alice",
        matchedUserId: "bob",
        score: 0.9,
        status: "SUGGESTED",
        reasons: ["shared skill"],
        matchedSkills: ["skill-a"],
        generatedAt: new Date(),
      },
    },
  ]);
  const aliceDb = userDb("alice");
  const bobDb = userDb("bob");

  await assertSucceeds(
    getDocs(
      query(collection(aliceDb, "matches"), where("userId", "==", "alice"))
    )
  );
  await assertFails(getDoc(doc(bobDb, "matches", "match-alice")));
  await assertSucceeds(
    updateDoc(doc(aliceDb, "matches", "match-alice"), {
      status: "VIEWED",
      updatedAt: new Date(),
    })
  );
  await assertFails(
    updateDoc(doc(aliceDb, "matches", "match-alice"), { userId: "bob" })
  );
  await assertFails(
    updateDoc(doc(bobDb, "matches", "match-alice"), { status: "DISMISSED" })
  );
  await assertSucceeds(deleteDoc(doc(aliceDb, "matches", "match-alice")));
});

test("admins can manage users and catalog records using a custom claim", async () => {
  await seedDocuments([
    { path: "users/bob", data: { displayName: "Bob", skillCredits: 20 } },
    {
      path: "skills/skill-a",
      data: {
        name: "Skill A",
        description: null,
        categoryId: null,
        createdBy: "admin",
        updatedBy: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
  ]);
  const adminDb = userDb("admin", { admin: true });

  await assertSucceeds(deleteDoc(doc(adminDb, "users", "bob")));
  await assertSucceeds(
    updateDoc(doc(adminDb, "skills", "skill-a"), {
      name: "Updated Skill A",
      updatedBy: "admin",
      updatedAt: serverTimestamp(),
    })
  );
  await assertFails(
    updateDoc(doc(adminDb, "users", "bob"), { skillCredits: 999 })
  );
});

test("users may only write their own userSkills and exchanges require valid fields", async () => {
  const aliceDb = userDb("alice");
  await assertSucceeds(
    setDoc(doc(aliceDb, "userSkills", "alice-skill"), {
      userId: "alice",
      skillId: "skill-a",
    })
  );
  await assertFails(
    setDoc(doc(aliceDb, "userSkills", "bob-skill"), {
      userId: "bob",
      skillId: "skill-b",
    })
  );

  await assertSucceeds(
    setDoc(doc(aliceDb, "exchangeRequests", "exchange-1"), {
      senderId: "alice",
      receiverId: "bob",
      exchangeType: "CREDIT",
      offeredSkillId: "skill-a",
      requestedSkillId: "skill-b",
      creditAmount: 10,
      message: "",
      status: "PENDING",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  );
  await assertFails(
    setDoc(doc(aliceDb, "exchangeRequests", "bad-exchange"), {
      senderId: "alice",
      receiverId: "bob",
      exchangeType: "CREDIT",
      offeredSkillId: "skill-a",
      requestedSkillId: "skill-b",
      creditAmount: 100,
      message: "",
      status: "PENDING",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  );
});

test("participants can propose sessions for accepted exchanges", async () => {
  await seedDocuments([
    {
      path: "exchangeRequests/exchange-1",
      data: acceptedExchange(),
    },
  ]);
  const aliceDb = userDb("alice");

  await assertSucceeds(
    setDoc(doc(aliceDb, "sessions", "session-1"), {
      ...sessionData(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  );
  await assertFails(
    setDoc(doc(userDb("mallory"), "sessions", "session-2"), {
      ...sessionData(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  );
  await assertFails(getDoc(doc(userDb("mallory"), "sessions", "session-1")));
});

test("Member 4 exchange acceptance and direct session completion remain allowed", async () => {
  const aliceDb = userDb("alice");
  const bobDb = userDb("bob");

  await assertSucceeds(
    setDoc(doc(aliceDb, "exchangeRequests", "exchange-1"), {
      senderId: "alice",
      receiverId: "bob",
      exchangeType: "DIRECT",
      offeredSkillId: "skill-a",
      requestedSkillId: "skill-b",
      creditAmount: 0,
      message: "",
      status: "PENDING",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  );
  await assertSucceeds(
    updateDoc(doc(bobDb, "exchangeRequests", "exchange-1"), {
      status: "ACCEPTED",
      updatedAt: serverTimestamp(),
    })
  );
  await assertSucceeds(
    setDoc(doc(aliceDb, "sessions", "session-direct"), {
      ...sessionData(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  );
  await assertSucceeds(
    updateDoc(doc(bobDb, "sessions", "session-direct"), {
      status: "CONFIRMED",
      updatedAt: serverTimestamp(),
    })
  );
  await assertSucceeds(
    updateDoc(doc(aliceDb, "sessions", "session-direct"), {
      status: "IN_PROGRESS",
      updatedAt: serverTimestamp(),
    })
  );
  await assertSucceeds(
    updateDoc(doc(aliceDb, "sessions", "session-direct"), {
      completedBy: ["alice"],
      updatedAt: serverTimestamp(),
    })
  );
  await assertSucceeds(
    updateDoc(doc(bobDb, "sessions", "session-direct"), {
      completedBy: ["alice", "bob"],
      status: "COMPLETED",
      creditsTransferred: false,
      updatedAt: serverTimestamp(),
    })
  );

  const completedSession = await getDoc(
    doc(aliceDb, "sessions", "session-direct")
  );
  assert.equal(completedSession.get("status"), "COMPLETED");
});

test("client writes cannot alter balances, settle credit sessions, or forge ledger entries", async () => {
  await seedDocuments([
    { path: "users/alice", data: { skillCredits: 20 } },
    { path: "users/bob", data: { skillCredits: 20 } },
    {
      path: "exchangeRequests/exchange-1",
      data: acceptedExchange("CREDIT"),
    },
    {
      path: "sessions/session-credit",
      data: sessionData({
        status: "IN_PROGRESS",
        completedBy: ["alice"],
      }),
    },
  ]);
  const bobDb = userDb("bob");

  await assertFails(
    updateDoc(doc(bobDb, "users", "bob"), { skillCredits: 10 })
  );
  await assertFails(
    setDoc(doc(bobDb, "creditTransactions", "session-credit_SPEND"), {
      userId: "alice",
      amount: 10,
      type: "SPEND",
      referenceId: "session-credit",
      description: "forged",
      createdAt: serverTimestamp(),
    })
  );

  const batch = writeBatch(bobDb);
  batch.update(doc(bobDb, "sessions", "session-credit"), {
    status: "COMPLETED",
    completedBy: ["alice", "bob"],
    creditsTransferred: true,
    updatedAt: serverTimestamp(),
  });
  batch.set(doc(bobDb, "creditTransactions", "session-credit_EARN"), {
    userId: "alice",
    amount: 10,
    type: "EARN",
    referenceId: "session-credit",
    description: "forged",
    createdAt: serverTimestamp(),
  });
  batch.set(doc(bobDb, "creditTransactions", "session-credit_SPEND"), {
    userId: "bob",
    amount: 10,
    type: "SPEND",
    referenceId: "session-credit",
    description: "forged",
    createdAt: serverTimestamp(),
  });
  await assertFails(batch.commit());
});

test("credit settlement callable requires both participants and settles balances once", async () => {
  await seedDocuments([
    { path: "users/alice", data: { skillCredits: 20 } },
    { path: "users/bob", data: { skillCredits: 20 } },
    {
      path: "exchangeRequests/exchange-1",
      data: acceptedExchange("CREDIT"),
    },
    {
      path: "sessions/session-credit",
      data: sessionData({
        status: "IN_PROGRESS",
      }),
    },
  ]);

  await assert.rejects(
    completeCreditSession.run({
      auth: { uid: "mallory", token: {} },
      data: { sessionId: "session-credit" },
    }),
    (error) => error.code === "permission-denied"
  );
  const firstConfirmation = await completeCreditSession.run({
    auth: { uid: "alice", token: {} },
    data: { sessionId: "session-credit" },
  });
  assert.deepEqual(firstConfirmation, { result: "WAITING_FOR_OTHER" });

  const settlement = await completeCreditSession.run({
    auth: { uid: "bob", token: {} },
    data: { sessionId: "session-credit" },
  });
  assert.deepEqual(settlement, { result: "COMPLETED_WITH_CREDITS" });
  assert.deepEqual(
    await completeCreditSession.run({
      auth: { uid: "bob", token: {} },
      data: { sessionId: "session-credit" },
    }),
    { result: "COMPLETED_WITH_CREDITS" }
  );

  const [teacher, learner, session, earn, spend] = await Promise.all([
    getDoc(doc(userDb("alice"), "users", "alice")),
    getDoc(doc(userDb("bob"), "users", "bob")),
    getDoc(doc(userDb("bob"), "sessions", "session-credit")),
    getDoc(doc(userDb("alice"), "creditTransactions", "session-credit_EARN")),
    getDoc(doc(userDb("bob"), "creditTransactions", "session-credit_SPEND")),
  ]);
  assert.equal(teacher.get("skillCredits"), 30);
  assert.equal(learner.get("skillCredits"), 10);
  assert.equal(session.get("status"), "COMPLETED");
  assert.equal(session.get("creditsTransferred"), true);
  assert.equal(earn.get("amount"), 10);
  assert.equal(spend.get("amount"), 10);
});

test("credit settlement refuses insufficient balance without partial writes", async () => {
  await seedDocuments([
    { path: "users/alice", data: { skillCredits: 20 } },
    { path: "users/bob", data: { skillCredits: 0 } },
    {
      path: "exchangeRequests/exchange-1",
      data: acceptedExchange("CREDIT"),
    },
    {
      path: "sessions/session-credit",
      data: sessionData({
        status: "IN_PROGRESS",
        completedBy: ["alice"],
      }),
    },
  ]);

  await assert.rejects(
    completeCreditSession.run({
      auth: { uid: "bob", token: {} },
      data: { sessionId: "session-credit" },
    }),
    (error) => error.code === "failed-precondition"
  );

  const [teacher, learner, session] = await Promise.all([
    getDoc(doc(userDb("alice"), "users", "alice")),
    getDoc(doc(userDb("bob"), "users", "bob")),
    getDoc(doc(userDb("bob"), "sessions", "session-credit")),
  ]);
  let ledgerEntries = [];
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    ledgerEntries = await Promise.all([
      getDoc(doc(db, "creditTransactions", "session-credit_EARN")),
      getDoc(doc(db, "creditTransactions", "session-credit_SPEND")),
    ]);
  });
  assert.equal(teacher.get("skillCredits"), 20);
  assert.equal(learner.get("skillCredits"), 0);
  assert.equal(session.get("status"), "IN_PROGRESS");
  assert.equal(ledgerEntries.some((entry) => entry.exists()), false);
});

test("reports and moderation history are readable only by reporter or admin and never client-writable", async () => {
  await seedDocuments([
    {
      path: "reports/report-alice",
      data: { reporterId: "alice", status: "OPEN" },
    },
    {
      path: "reports/report-alice/moderationHistory/event-1",
      data: { adminUid: "admin", action: "RESOLVE" },
    },
  ]);
  const aliceDb = userDb("alice");
  const bobDb = userDb("bob");
  const adminDb = userDb("admin", { admin: true });

  await assertSucceeds(getDoc(doc(aliceDb, "reports", "report-alice")));
  await assertFails(getDoc(doc(bobDb, "reports", "report-alice")));
  await assertSucceeds(getDoc(doc(adminDb, "reports", "report-alice")));
  await assertFails(
    setDoc(doc(aliceDb, "reports", "forged"), { reporterId: "alice" })
  );
  await assertFails(
    updateDoc(doc(adminDb, "reports", "report-alice"), { status: "RESOLVED" })
  );
  await assertSucceeds(
    getDocs(collection(adminDb, "reports", "report-alice", "moderationHistory"))
  );
  await assertFails(
    getDocs(collection(aliceDb, "reports", "report-alice", "moderationHistory"))
  );
  await assertFails(
    setDoc(
      doc(adminDb, "reports", "report-alice", "moderationHistory", "forged"),
      { adminUid: "admin", action: "RESOLVE" }
    )
  );
});

test("report submission and moderation callables enforce reporter and admin access", async () => {
  await seedDocuments([
    { path: "users/alice", data: { displayName: "Alice" } },
    { path: "users/bob", data: { displayName: "Bob" } },
  ]);

  const reportResponse = await submitReport.run({
    auth: { uid: "alice", token: {} },
    data: {
      targetType: "USER",
      targetId: "bob",
      reason: "SPAM",
      description: "Repeated unsolicited messages",
    },
  });
  assert.equal(typeof reportResponse.reportId, "string");

  await assert.rejects(
    moderateReport.run({
      auth: { uid: "bob", token: {} },
      data: { reportId: reportResponse.reportId, action: "RESOLVE" },
    }),
    (error) => error.code === "permission-denied"
  );
  const moderationResponse = await moderateReport.run({
    auth: { uid: "admin", token: { admin: true } },
    data: {
      reportId: reportResponse.reportId,
      action: "RESOLVE",
      moderationNote: "Reviewed",
    },
  });
  assert.equal(moderationResponse.status, "RESOLVED");

  const reporterDb = userDb("alice");
  const adminDb = userDb("admin", { admin: true });
  const reportSnapshot = await getDoc(
    doc(reporterDb, "reports", reportResponse.reportId)
  );
  const historySnapshot = await getDocs(
    collection(
      adminDb,
      "reports",
      reportResponse.reportId,
      "moderationHistory"
    )
  );
  assert.equal(reportSnapshot.get("status"), "RESOLVED");
  assert.equal(reportSnapshot.get("reviewedBy"), "admin");
  assert.equal(historySnapshot.size, 1);
});
