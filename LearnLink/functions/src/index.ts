export { moderateReport, submitReport } from "./reports";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { getApps, initializeApp } from "firebase-admin/app";
import {
  FieldValue,
  getFirestore,
  Timestamp,
} from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

if (getApps().length === 0) {
  initializeApp();
}

const callableOptions = { region: "asia-south1" } as const;
const firestore = getFirestore();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidSessionId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.trim() === value &&
    !value.includes("/") &&
    Buffer.byteLength(value, "utf8") <= 1500
  );
}

function requireAuthenticatedUid(uid: string | undefined): string {
  if (!uid) {
    throw new HttpsError("unauthenticated", "Sign-in is required.");
  }
  return uid;
}

export const healthCheck = onCall(callableOptions, (request) => {
  const uid = requireAuthenticatedUid(request.auth?.uid);
  return { status: "ok", uid };
});

export const completeCreditSession = onCall(
  callableOptions,
  async (request) => {
    const uid = requireAuthenticatedUid(request.auth?.uid);
    const data: unknown = request.data;

    if (
      !isRecord(data) ||
      Object.keys(data).length !== 1 ||
      !Object.prototype.hasOwnProperty.call(data, "sessionId") ||
      !isValidSessionId(data.sessionId)
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Only a valid sessionId is accepted."
      );
    }

    const sessionId = data.sessionId;
    const sessionRef = firestore.collection("sessions").doc(sessionId);

    return firestore.runTransaction(async (transaction) => {
      const sessionSnapshot = await transaction.get(sessionRef);
      if (!sessionSnapshot.exists) {
        throw new HttpsError("not-found", "Session not found.");
      }

      const session = sessionSnapshot.data();
      const teacherId = session?.teacherId;
      const learnerId = session?.learnerId;
      if (
        typeof teacherId !== "string" ||
        typeof learnerId !== "string" ||
        (uid !== teacherId && uid !== learnerId)
      ) {
        throw new HttpsError(
          "permission-denied",
          "Only a session participant can confirm completion."
        );
      }

      if (
        session?.status === "COMPLETED" &&
        session.creditsTransferred === true
      ) {
        return { result: "COMPLETED_WITH_CREDITS" as const };
      }

      if (!["CONFIRMED", "IN_PROGRESS"].includes(session?.status)) {
        throw new HttpsError(
          "failed-precondition",
          "The session is not ready for completion confirmation."
        );
      }

      const exchangeRequestId = session?.exchangeRequestId;
      if (!isValidSessionId(exchangeRequestId)) {
        throw new HttpsError(
          "failed-precondition",
          "The session has an invalid exchange request."
        );
      }

      const exchangeRef = firestore
        .collection("exchangeRequests")
        .doc(exchangeRequestId);
      const exchangeSnapshot = await transaction.get(exchangeRef);
      if (!exchangeSnapshot.exists) {
        throw new HttpsError(
          "failed-precondition",
          "The exchange request for this session was not found."
        );
      }

      const exchange = exchangeSnapshot.data();
      if (
        exchange?.status !== "ACCEPTED" ||
        exchange.exchangeType !== "CREDIT" ||
        exchange.creditAmount !== 10
      ) {
        throw new HttpsError(
          "failed-precondition",
          "The session is not part of an accepted credit exchange."
        );
      }

      const offeredSkillSession =
        exchange.senderId === teacherId &&
        exchange.receiverId === learnerId &&
        exchange.offeredSkillId === session?.skillId;
      const requestedSkillSession =
        exchange.senderId === learnerId &&
        exchange.receiverId === teacherId &&
        exchange.requestedSkillId === session?.skillId;
      if (!offeredSkillSession && !requestedSkillSession) {
        throw new HttpsError(
          "failed-precondition",
          "The session does not match the accepted exchange."
        );
      }

      const completedBy = session?.completedBy;
      const participants = [teacherId, learnerId];
      if (
        !Array.isArray(completedBy) ||
        completedBy.length > participants.length ||
        completedBy.some(
          (participant) =>
            typeof participant !== "string" ||
            !participants.includes(participant)
        ) ||
        new Set(completedBy).size !== completedBy.length
      ) {
        throw new HttpsError(
          "failed-precondition",
          "The session completion confirmations are invalid."
        );
      }

      const confirmedBy = completedBy.includes(uid)
        ? completedBy
        : [...completedBy, uid];
      const bothConfirmed = participants.every((participant) =>
        confirmedBy.includes(participant)
      );

      if (!bothConfirmed) {
        if (confirmedBy.length !== completedBy.length) {
          transaction.update(sessionRef, {
            completedBy: confirmedBy,
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
        return { result: "WAITING_FOR_OTHER" as const };
      }

      const teacherRef = firestore.collection("users").doc(teacherId);
      const learnerRef = firestore.collection("users").doc(learnerId);
      const earnRef = firestore
        .collection("creditTransactions")
        .doc(`${sessionId}_EARN`);
      const spendRef = firestore
        .collection("creditTransactions")
        .doc(`${sessionId}_SPEND`);
      const [
        teacherSnapshot,
        learnerSnapshot,
        earnSnapshot,
        spendSnapshot,
      ] = await Promise.all([
        transaction.get(teacherRef),
        transaction.get(learnerRef),
        transaction.get(earnRef),
        transaction.get(spendRef),
      ]);

      if (!teacherSnapshot.exists || !learnerSnapshot.exists) {
        throw new HttpsError(
          "failed-precondition",
          "A participant profile could not be found."
        );
      }
      if (earnSnapshot.exists || spendSnapshot.exists) {
        throw new HttpsError(
          "already-exists",
          "Credit transactions already exist for this session."
        );
      }

      const teacherCredits = teacherSnapshot.get("skillCredits");
      const learnerCredits = learnerSnapshot.get("skillCredits");
      const currentTeacherCredits =
        teacherCredits === undefined ? 0 : teacherCredits;
      const currentLearnerCredits =
        learnerCredits === undefined ? 0 : learnerCredits;
      if (
        !Number.isSafeInteger(currentTeacherCredits) ||
        currentTeacherCredits < 0 ||
        !Number.isSafeInteger(currentLearnerCredits) ||
        currentLearnerCredits < 0
      ) {
        throw new HttpsError(
          "failed-precondition",
          "A participant has an invalid skill-credit balance."
        );
      }
      if (currentLearnerCredits < 10) {
        throw new HttpsError(
          "failed-precondition",
          "The learner has insufficient credits."
        );
      }

      const timestamp = FieldValue.serverTimestamp();
      transaction.update(learnerRef, {
        skillCredits: currentLearnerCredits - 10,
        updatedAt: timestamp,
      });
      transaction.update(teacherRef, {
        skillCredits: currentTeacherCredits + 10,
        updatedAt: timestamp,
      });
      transaction.create(earnRef, {
        userId: teacherId,
        amount: 10,
        type: "EARN",
        referenceId: sessionId,
        description: `Credits earned for completed session ${sessionId}.`,
        createdAt: timestamp,
      });
      transaction.create(spendRef, {
        userId: learnerId,
        amount: 10,
        type: "SPEND",
        referenceId: sessionId,
        description: `Credits spent for completed session ${sessionId}.`,
        createdAt: timestamp,
      });
      transaction.update(sessionRef, {
        completedBy: participants,
        status: "COMPLETED",
        creditsTransferred: true,
        updatedAt: timestamp,
      });

      return { result: "COMPLETED_WITH_CREDITS" as const };
    });
  }
);

export const generateAttendanceQr = onCall(
  callableOptions,
  async (request) => {
    const uid = requireAuthenticatedUid(request.auth?.uid);
    const data: unknown = request.data;

    if (
      !isRecord(data) ||
      Object.keys(data).length !== 1 ||
      !Object.prototype.hasOwnProperty.call(data, "sessionId")
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Only a sessionId is accepted."
      );
    }

    const rawSessionId = data.sessionId;
    if (typeof rawSessionId !== "string" || rawSessionId.trim().length === 0) {
      throw new HttpsError(
        "invalid-argument",
        "sessionId must be a non-empty string."
      );
    }

    const sessionId = rawSessionId.trim();
    if (!isValidSessionId(sessionId)) {
      throw new HttpsError("invalid-argument", "sessionId is invalid.");
    }

    const sessionRef = firestore.collection("sessions").doc(sessionId);
    const qrRef = firestore.collection("attendanceQr").doc(sessionId);

    const { token, expiresAt } = await firestore.runTransaction(
      async (transaction) => {
        const sessionSnapshot = await transaction.get(sessionRef);
        if (!sessionSnapshot.exists) {
          throw new HttpsError("not-found", "Session not found.");
        }

        const session = sessionSnapshot.data();
        if (session?.teacherId !== uid) {
          throw new HttpsError(
            "permission-denied",
            "Only the session teacher can generate its attendance QR."
          );
        }
        if (session.sessionType !== "IN_PERSON") {
          throw new HttpsError(
            "failed-precondition",
            "Attendance QR codes are only available for in-person sessions."
          );
        }
        if (!["CONFIRMED", "IN_PROGRESS"].includes(session.status)) {
          throw new HttpsError(
            "failed-precondition",
            "The session must be confirmed or in progress."
          );
        }

        const token = randomBytes(32).toString("base64url");
        const tokenHash = createHash("sha256").update(token).digest("hex");
        const expiresAt = Timestamp.fromMillis(Date.now() + 15 * 60 * 1000);

        transaction.set(qrRef, {
          sessionId,
          teacherId: uid,
          tokenHash,
          expiresAt,
        });

        return { token, expiresAt };
      }
    );

    return { sessionId, token, expiresAt: expiresAt.toDate().toISOString() };
  }
);

export const verifyAttendanceQr = onCall(
  callableOptions,
  async (request) => {
    const learnerId = requireAuthenticatedUid(request.auth?.uid);
    const data: unknown = request.data;

    if (
      !isRecord(data) ||
      Object.keys(data).length !== 2 ||
      !Object.prototype.hasOwnProperty.call(data, "sessionId") ||
      !Object.prototype.hasOwnProperty.call(data, "token")
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Only sessionId and token are accepted."
      );
    }

    const { sessionId, token } = data;
    if (!isValidSessionId(sessionId)) {
      throw new HttpsError("invalid-argument", "sessionId is invalid.");
    }
    if (typeof token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
      throw new HttpsError("invalid-argument", "token is invalid.");
    }

    const sessionRef = firestore.collection("sessions").doc(sessionId);
    const qrRef = firestore.collection("attendanceQr").doc(sessionId);
    const attendanceId = createHash("sha256")
      .update(JSON.stringify([sessionId, learnerId]))
      .digest("hex");
    const attendanceRef = firestore
      .collection("attendance")
      .doc(attendanceId);

    return firestore.runTransaction(async (transaction) => {
      const sessionSnapshot = await transaction.get(sessionRef);
      if (!sessionSnapshot.exists) {
        throw new HttpsError("not-found", "Session not found.");
      }

      const session = sessionSnapshot.data();
      if (session?.learnerId !== learnerId) {
        throw new HttpsError(
          "permission-denied",
          "Only the session learner can check in."
        );
      }
      if (session.sessionType !== "IN_PERSON") {
        throw new HttpsError(
          "failed-precondition",
          "Attendance check-in is only available for in-person sessions."
        );
      }
      if (!["CONFIRMED", "IN_PROGRESS"].includes(session.status)) {
        throw new HttpsError(
          "failed-precondition",
          "The session must be confirmed or in progress."
        );
      }

      const qrSnapshot = await transaction.get(qrRef);
      const attendanceSnapshot = await transaction.get(attendanceRef);

      if (attendanceSnapshot.exists) {
        return { result: "already_checked_in", sessionId } as const;
      }

      const qr = qrSnapshot.data();
      if (
        !qrSnapshot.exists ||
        qr?.sessionId !== sessionId ||
        qr.teacherId !== session.teacherId ||
        typeof qr.tokenHash !== "string" ||
        !/^[a-f0-9]{64}$/.test(qr.tokenHash) ||
        !(qr.expiresAt instanceof Timestamp)
      ) {
        throw new HttpsError(
          "failed-precondition",
          "The attendance QR is invalid or unavailable."
        );
      }

      const suppliedTokenHash = createHash("sha256").update(token).digest();
      const storedTokenHash = Buffer.from(qr.tokenHash, "hex");
      if (!timingSafeEqual(suppliedTokenHash, storedTokenHash)) {
        throw new HttpsError(
          "failed-precondition",
          "The attendance QR is invalid or unavailable."
        );
      }
      if (qr.expiresAt.toMillis() <= Date.now()) {
        throw new HttpsError(
          "failed-precondition",
          "The attendance QR has expired."
        );
      }

      transaction.create(attendanceRef, {
        sessionId,
        learnerId,
        teacherId: session.teacherId,
        checkedInAt: FieldValue.serverTimestamp(),
      });

      return { result: "recorded", sessionId } as const;
    });
  }
);

// Member 5: Chat, Notifications, Gamification
export * from "./member5";
