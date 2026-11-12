"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyAttendanceQr = exports.generateAttendanceQr = exports.healthCheck = void 0;
const node_crypto_1 = require("node:crypto");
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
if ((0, app_1.getApps)().length === 0) {
    (0, app_1.initializeApp)();
}
const callableOptions = { region: "asia-south1" };
const firestore = (0, firestore_1.getFirestore)();
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isValidSessionId(value) {
    return (typeof value === "string" &&
        value.length > 0 &&
        value.trim() === value &&
        !value.includes("/") &&
        Buffer.byteLength(value, "utf8") <= 1500);
}
function requireAuthenticatedUid(uid) {
    if (!uid) {
        throw new https_1.HttpsError("unauthenticated", "Sign-in is required.");
    }
    return uid;
}
exports.healthCheck = (0, https_1.onCall)(callableOptions, (request) => {
    const uid = requireAuthenticatedUid(request.auth?.uid);
    return { status: "ok", uid };
});
exports.generateAttendanceQr = (0, https_1.onCall)(callableOptions, async (request) => {
    const uid = requireAuthenticatedUid(request.auth?.uid);
    const data = request.data;
    if (!isRecord(data) ||
        Object.keys(data).length !== 1 ||
        !Object.prototype.hasOwnProperty.call(data, "sessionId")) {
        throw new https_1.HttpsError("invalid-argument", "Only a sessionId is accepted.");
    }
    const rawSessionId = data.sessionId;
    if (typeof rawSessionId !== "string" || rawSessionId.trim().length === 0) {
        throw new https_1.HttpsError("invalid-argument", "sessionId must be a non-empty string.");
    }
    const sessionId = rawSessionId.trim();
    if (!isValidSessionId(sessionId)) {
        throw new https_1.HttpsError("invalid-argument", "sessionId is invalid.");
    }
    const sessionRef = firestore.collection("sessions").doc(sessionId);
    const qrRef = firestore.collection("attendanceQr").doc(sessionId);
    const { token, expiresAt } = await firestore.runTransaction(async (transaction) => {
        const sessionSnapshot = await transaction.get(sessionRef);
        if (!sessionSnapshot.exists) {
            throw new https_1.HttpsError("not-found", "Session not found.");
        }
        const session = sessionSnapshot.data();
        if (session?.teacherId !== uid) {
            throw new https_1.HttpsError("permission-denied", "Only the session teacher can generate its attendance QR.");
        }
        if (session.sessionType !== "IN_PERSON") {
            throw new https_1.HttpsError("failed-precondition", "Attendance QR codes are only available for in-person sessions.");
        }
        if (!["CONFIRMED", "IN_PROGRESS"].includes(session.status)) {
            throw new https_1.HttpsError("failed-precondition", "The session must be confirmed or in progress.");
        }
        const token = (0, node_crypto_1.randomBytes)(32).toString("base64url");
        const tokenHash = (0, node_crypto_1.createHash)("sha256").update(token).digest("hex");
        const expiresAt = firestore_1.Timestamp.fromMillis(Date.now() + 15 * 60 * 1000);
        transaction.set(qrRef, {
            sessionId,
            teacherId: uid,
            tokenHash,
            expiresAt,
        });
        return { token, expiresAt };
    });
    return { sessionId, token, expiresAt: expiresAt.toDate().toISOString() };
});
exports.verifyAttendanceQr = (0, https_1.onCall)(callableOptions, async (request) => {
    const learnerId = requireAuthenticatedUid(request.auth?.uid);
    const data = request.data;
    if (!isRecord(data) ||
        Object.keys(data).length !== 2 ||
        !Object.prototype.hasOwnProperty.call(data, "sessionId") ||
        !Object.prototype.hasOwnProperty.call(data, "token")) {
        throw new https_1.HttpsError("invalid-argument", "Only sessionId and token are accepted.");
    }
    const { sessionId, token } = data;
    if (!isValidSessionId(sessionId)) {
        throw new https_1.HttpsError("invalid-argument", "sessionId is invalid.");
    }
    if (typeof token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
        throw new https_1.HttpsError("invalid-argument", "token is invalid.");
    }
    const sessionRef = firestore.collection("sessions").doc(sessionId);
    const qrRef = firestore.collection("attendanceQr").doc(sessionId);
    const attendanceId = (0, node_crypto_1.createHash)("sha256")
        .update(JSON.stringify([sessionId, learnerId]))
        .digest("hex");
    const attendanceRef = firestore
        .collection("attendance")
        .doc(attendanceId);
    return firestore.runTransaction(async (transaction) => {
        const sessionSnapshot = await transaction.get(sessionRef);
        if (!sessionSnapshot.exists) {
            throw new https_1.HttpsError("not-found", "Session not found.");
        }
        const session = sessionSnapshot.data();
        if (session?.learnerId !== learnerId) {
            throw new https_1.HttpsError("permission-denied", "Only the session learner can check in.");
        }
        if (session.sessionType !== "IN_PERSON") {
            throw new https_1.HttpsError("failed-precondition", "Attendance check-in is only available for in-person sessions.");
        }
        if (!["CONFIRMED", "IN_PROGRESS"].includes(session.status)) {
            throw new https_1.HttpsError("failed-precondition", "The session must be confirmed or in progress.");
        }
        const qrSnapshot = await transaction.get(qrRef);
        const attendanceSnapshot = await transaction.get(attendanceRef);
        if (attendanceSnapshot.exists) {
            return { result: "already_checked_in", sessionId };
        }
        const qr = qrSnapshot.data();
        if (!qrSnapshot.exists ||
            qr?.sessionId !== sessionId ||
            qr.teacherId !== session.teacherId ||
            typeof qr.tokenHash !== "string" ||
            !/^[a-f0-9]{64}$/.test(qr.tokenHash) ||
            !(qr.expiresAt instanceof firestore_1.Timestamp)) {
            throw new https_1.HttpsError("failed-precondition", "The attendance QR is invalid or unavailable.");
        }
        const suppliedTokenHash = (0, node_crypto_1.createHash)("sha256").update(token).digest();
        const storedTokenHash = Buffer.from(qr.tokenHash, "hex");
        if (!(0, node_crypto_1.timingSafeEqual)(suppliedTokenHash, storedTokenHash)) {
            throw new https_1.HttpsError("failed-precondition", "The attendance QR is invalid or unavailable.");
        }
        if (qr.expiresAt.toMillis() <= Date.now()) {
            throw new https_1.HttpsError("failed-precondition", "The attendance QR has expired.");
        }
        transaction.create(attendanceRef, {
            sessionId,
            learnerId,
            teacherId: session.teacherId,
            checkedInAt: firestore_1.FieldValue.serverTimestamp(),
        });
        return { result: "recorded", sessionId };
    });
});
//# sourceMappingURL=index.js.map