import {
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { initializeApp } from "firebase-admin/app";
import {
  FieldValue,
  getFirestore,
  Timestamp,
} from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

initializeApp();

const callableOptions = { region: "asia-south1" } as const;

export const healthCheck = onCall(callableOptions, (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Sign-in is required.");
  }

  return { status: "ok" };
});

export const generateAttendanceQr = onCall(callableOptions, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "Sign-in is required.");
  }

  const data: unknown = request.data;
  if (
    typeof data !== "object" ||
    data === null ||
    Array.isArray(data) ||
    Object.keys(data).length !== 1 ||
    !Object.prototype.hasOwnProperty.call(data, "sessionId")
  ) {
    throw new HttpsError(
      "invalid-argument",
      "Only a sessionId is accepted."
    );
  }

  const sessionId = (data as { sessionId: unknown }).sessionId;
  if (typeof sessionId !== "string" || sessionId.trim().length === 0) {
    throw new HttpsError(
      "invalid-argument",
      "sessionId must be a non-empty string."
    );
  }

  const normalizedSessionId = sessionId.trim();
  const firestore = getFirestore();
  const sessionRef = firestore.collection("sessions").doc(normalizedSessionId);
  const qrRef = firestore.collection("attendanceQr").doc(normalizedSessionId);

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
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      transaction.set(qrRef, {
        sessionId: normalizedSessionId,
        teacherId: uid,
        tokenHash,
        expiresAt: Timestamp.fromDate(expiresAt),
      });

      return { token, expiresAt };
    }
  );

  return {
    sessionId: normalizedSessionId,
    token,
    expiresAt: expiresAt.toISOString(),
  };
});

export const verifyAttendanceQr = onCall(callableOptions, async (request) => {
  const learnerId = request.auth?.uid;
  if (!learnerId) {
    throw new HttpsError("unauthenticated", "Sign-in is required.");
  }

  const data: unknown = request.data;
  if (
    typeof data !== "object" ||
    data === null ||
    Array.isArray(data) ||
    Object.keys(data).length !== 2 ||
    !Object.prototype.hasOwnProperty.call(data, "sessionId") ||
    !Object.prototype.hasOwnProperty.call(data, "token")
  ) {
    throw new HttpsError(
      "invalid-argument",
      "Only sessionId and token are accepted."
    );
  }

  const { sessionId, token } = data as {
    sessionId: unknown;
    token: unknown;
  };
  if (
    typeof sessionId !== "string" ||
    sessionId.length === 0 ||
    sessionId.trim() !== sessionId ||
    sessionId === "." ||
    sessionId === ".." ||
    sessionId.includes("/") ||
    Buffer.byteLength(sessionId, "utf8") > 1500
  ) {
    throw new HttpsError("invalid-argument", "sessionId is invalid.");
  }

  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
    throw new HttpsError("invalid-argument", "token is invalid.");
  }

  const firestore = getFirestore();
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

    const attendanceSnapshot = await transaction.get(attendanceRef);
    const qrSnapshot = await transaction.get(qrRef);

    if (attendanceSnapshot.exists) {
      return { result: "already_checked_in", sessionId };
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

    return { result: "recorded", sessionId };
  });
});
