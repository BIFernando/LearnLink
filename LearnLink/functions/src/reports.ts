import { initializeApp } from "firebase-admin/app";
import {
  FieldValue,
  getFirestore,
  Timestamp,
} from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

import {
  REPORT_REASONS,
  REPORT_TARGET_TYPES,
  type ReportReason,
  type ReportTargetType,
} from "../../types/reports";
import {
  parseModerationInput,
  parseReportSubmission,
  ReportInputError,
} from "./reportValidation";

initializeApp();

const db = getFirestore();

function requireUser(request: { auth?: { uid: string } | null }): string {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Sign in to submit a report.");
  }
  return request.auth.uid;
}

function isTargetType(value: unknown): value is ReportTargetType {
  return (
    typeof value === "string" &&
    REPORT_TARGET_TYPES.some((targetType) => targetType === value)
  );
}

function isReason(value: unknown): value is ReportReason {
  return (
    typeof value === "string" &&
    REPORT_REASONS.some((reason) => reason.value === value)
  );
}

function isRecognizedOpenReport(data: FirebaseFirestore.DocumentData): boolean {
  return (
    data.status === "OPEN" &&
    typeof data.reporterId === "string" &&
    isTargetType(data.targetType) &&
    typeof data.targetId === "string" &&
    isReason(data.reason) &&
    data.createdAt instanceof Timestamp &&
    (data.reviewedBy === null || data.reviewedBy === undefined) &&
    (data.reviewedAt === null || data.reviewedAt === undefined)
  );
}

export const submitReport = onCall(async (request) => {
  const reporterId = requireUser(request);
  let input;

  try {
    input = parseReportSubmission(request.data);
  } catch (error) {
    if (error instanceof ReportInputError) {
      throw new HttpsError("invalid-argument", error.message);
    }
    throw error;
  }

  if (input.targetType === "USER") {
    if (input.targetId === reporterId) {
      throw new HttpsError("invalid-argument", "You cannot report yourself.");
    }
    const userSnapshot = await db.collection("users").doc(input.targetId).get();
    if (!userSnapshot.exists) {
      throw new HttpsError("not-found", "The reported user was not found.");
    }
  } else if (input.targetType === "EXCHANGE_REQUEST") {
    const targetSnapshot = await db
      .collection("exchangeRequests")
      .doc(input.targetId)
      .get();
    if (!targetSnapshot.exists) {
      throw new HttpsError("not-found", "The exchange request was not found.");
    }

    const target = targetSnapshot.data();
    if (target?.senderId !== reporterId && target?.receiverId !== reporterId) {
      throw new HttpsError(
        "permission-denied",
        "Only exchange participants can report this request."
      );
    }
  } else if (input.targetType === "SESSION") {
    const targetSnapshot = await db
      .collection("sessions")
      .doc(input.targetId)
      .get();
    if (!targetSnapshot.exists) {
      throw new HttpsError("not-found", "The session was not found.");
    }

    const target = targetSnapshot.data();
    if (
      target?.teacherId !== reporterId &&
      target?.learnerId !== reporterId
    ) {
      throw new HttpsError(
        "permission-denied",
        "Only session participants can report this session."
      );
    }
  }

  const reportReference = db.collection("reports").doc();
  await reportReference.create({
    reporterId,
    targetType: input.targetType,
    targetId: input.targetId,
    reason: input.reason,
    description: input.description ?? null,
    status: "OPEN",
    createdAt: FieldValue.serverTimestamp(),
    reviewedBy: null,
    reviewedAt: null,
  });

  return { reportId: reportReference.id };
});

export const moderateReport = onCall(async (request) => {
  const adminUid = requireUser(request);
  if (request.auth?.token.admin !== true) {
    throw new HttpsError("permission-denied", "Administrator access is required.");
  }

  let input;
  try {
    input = parseModerationInput(request.data);
  } catch (error) {
    if (error instanceof ReportInputError) {
      throw new HttpsError("invalid-argument", error.message);
    }
    throw error;
  }

  const reportReference = db.collection("reports").doc(input.reportId);
  const historyReference = reportReference
    .collection("moderationHistory")
    .doc();
  const newStatus = input.action === "RESOLVE" ? "RESOLVED" : "REJECTED";

  await db.runTransaction(async (transaction) => {
    const reportSnapshot = await transaction.get(reportReference);
    if (!reportSnapshot.exists) {
      throw new HttpsError("not-found", "The report was not found.");
    }

    const reportData = reportSnapshot.data();
    if (!reportData || !isRecognizedOpenReport(reportData)) {
      throw new HttpsError(
        "failed-precondition",
        "This report is unrecognized or is no longer open."
      );
    }

    const timestamp = FieldValue.serverTimestamp();
    transaction.update(reportReference, {
      status: newStatus,
      reviewedBy: adminUid,
      reviewedAt: timestamp,
    });
    transaction.create(historyReference, {
      reportId: reportReference.id,
      adminUid,
      action: input.action,
      previousStatus: "OPEN",
      newStatus,
      moderationNote: input.moderationNote,
      timestamp,
    });
  });

  return { reportId: reportReference.id, status: newStatus };
});
