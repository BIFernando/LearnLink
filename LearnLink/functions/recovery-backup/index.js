"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyAttendanceQr = exports.generateAttendanceQr = exports.healthCheck = void 0;
const node_crypto_1 = require("node:crypto");
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
(0, app_1.initializeApp)();
const callableOptions = { region: "asia-south1" };
exports.healthCheck = (0, https_1.onCall)(callableOptions, (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Sign-in is required.");
    }
    return { status: "ok" };
});
exports.generateAttendanceQr = (0, https_1.onCall)(callableOptions, async (request) => {
    var _a;
    const uid = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!uid) {
        throw new https_1.HttpsError("unauthenticated", "Sign-in is required.");
    }
    const data = request.data;
    if (typeof data !== "object" ||
        data === null ||
        Array.isArray(data) ||
        Object.keys(data).length !== 1 ||
        !Object.prototype.hasOwnProperty.call(data, "sessionId")) {
        throw new https_1.HttpsError("invalid-argument", "Only a sessionId is accepted.");
    }
    const sessionId = data.sessionId;
    if (typeof sessionId !== "string" || sessionId.trim().length === 0) {
        throw new https_1.HttpsError("invalid-argument", "sessionId must be a non-empty string.");
    }
    const normalizedSessionId = sessionId.trim();
    const firestore = (0, firestore_1.getFirestore)();
    const sessionRef = firestore.collection("sessions").doc(normalizedSessionId);
    const qrRef = firestore.collection("attendanceQr").doc(normalizedSessionId);
    const { token, expiresAt } = await firestore.runTransaction(async (transaction) => {
        const sessionSnapshot = await transaction.get(sessionRef);
        if (!sessionSnapshot.exists) {
            throw new https_1.HttpsError("not-found", "Session not found.");
        }
        const session = sessionSnapshot.data();
        if ((session === null || session === void 0 ? void 0 : session.teacherId) !== uid) {
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
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
        transaction.set(qrRef, {
            sessionId: normalizedSessionId,
            teacherId: uid,
            tokenHash,
            expiresAt: firestore_1.Timestamp.fromDate(expiresAt),
        });
        return { token, expiresAt };
    });
    return {
        sessionId: normalizedSessionId,
        token,
        expiresAt: expiresAt.toISOString(),
    };
});
exports.verifyAttendanceQr = (0, https_1.onCall)(callableOptions, async (request) => {
    var _a;
    const learnerId = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!learnerId) {
        throw new https_1.HttpsError("unauthenticated", "Sign-in is required.");
    }
    const data = request.data;
    if (typeof data !== "object" ||
        data === null ||
        Array.isArray(data) ||
        Object.keys(data).length !== 2 ||
        !Object.prototype.hasOwnProperty.call(data, "sessionId") ||
        !Object.prototype.hasOwnProperty.call(data, "token")) {
        throw new https_1.HttpsError("invalid-argument", "Only sessionId and token are accepted.");
    }
    const { sessionId, token } = data;
    if (typeof sessionId !== "string" ||
        sessionId.length === 0 ||
        sessionId.trim() !== sessionId ||
        sessionId === "." ||
        sessionId === ".." ||
        sessionId.includes("/") ||
        Buffer.byteLength(sessionId, "utf8") > 1500) {
        throw new https_1.HttpsError("invalid-argument", "sessionId is invalid.");
    }
    if (typeof token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
        throw new https_1.HttpsError("invalid-argument", "token is invalid.");
    }
    const firestore = (0, firestore_1.getFirestore)();
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
        if ((session === null || session === void 0 ? void 0 : session.learnerId) !== learnerId) {
            throw new https_1.HttpsError("permission-denied", "Only the session learner can check in.");
        }
        if (session.sessionType !== "IN_PERSON") {
            throw new https_1.HttpsError("failed-precondition", "Attendance check-in is only available for in-person sessions.");
        }
        if (!["CONFIRMED", "IN_PROGRESS"].includes(session.status)) {
            throw new https_1.HttpsError("failed-precondition", "The session must be confirmed or in progress.");
        }
        const attendanceSnapshot = await transaction.get(attendanceRef);
        const qrSnapshot = await transaction.get(qrRef);
        if (attendanceSnapshot.exists) {
            return { result: "already_checked_in", sessionId };
        }
        const qr = qrSnapshot.data();
        if (!qrSnapshot.exists ||
            (qr === null || qr === void 0 ? void 0 : qr.sessionId) !== sessionId ||
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