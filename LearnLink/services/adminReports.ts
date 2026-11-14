import {
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
  type DocumentData,
  type QueryConstraint,
  type QueryDocumentSnapshot,
  Timestamp,
} from "firebase/firestore";
import { httpsCallable, getFunctions } from "firebase/functions";
import type { User } from "firebase/auth";

import { auth, db } from "../config/firebase";
import { verifyAdminAccess } from "./adminAuth";
import {
  REPORT_REASONS,
  REPORT_STATUSES,
  REPORT_TARGET_TYPES,
  type ModerateReportInput,
  type ModerationAction,
  type ModerationHistoryRecord,
  type ReportFilter,
  type ReportReason,
  type ReportRecord,
  type ReportStatus,
  type ReportTargetType,
} from "../types/reports";

const REPORT_PAGE_SIZE = 25;
const HISTORY_LIMIT = 100;

export interface AdminReportPage {
  reports: ReportRecord[];
  lastDocument: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}

export interface ReportPersonSummary {
  id: string;
  name?: string;
  email?: string;
}

export interface ReportTargetSummary {
  title: string;
  fields: { label: string; value: string }[];
}

export interface AdminReportDetails {
  report: ReportRecord;
  reporter: ReportPersonSummary | null;
  target: ReportTargetSummary | null;
}

export class AdminReportsAccessError extends Error {
  constructor() {
    super("Administrator access is required to manage reports.");
    this.name = "AdminReportsAccessError";
  }
}

export class AdminReportNotFoundError extends Error {
  constructor() {
    super("The selected report could not be found.");
    this.name = "AdminReportNotFoundError";
  }
}

async function assertAdmin(): Promise<User> {
  const user = auth.currentUser;
  if (!user || !(await verifyAdminAccess(user))) {
    throw new AdminReportsAccessError();
  }
  if (auth.currentUser?.uid !== user.uid) {
    throw new AdminReportsAccessError();
  }
  return user;
}

function isReportStatus(value: unknown): value is ReportStatus {
  return (
    typeof value === "string" &&
    REPORT_STATUSES.some((status) => status === value)
  );
}

function isReportReason(value: unknown): value is ReportReason {
  return (
    typeof value === "string" &&
    REPORT_REASONS.some((reason) => reason.value === value)
  );
}

function isReportTargetType(value: unknown): value is ReportTargetType {
  return (
    typeof value === "string" &&
    REPORT_TARGET_TYPES.some((targetType) => targetType === value)
  );
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function optionalDate(value: unknown): Date | undefined {
  return value instanceof Timestamp ? value.toDate() : undefined;
}

function hasExpectedReportSchema(data: DocumentData): boolean {
  const status = data.status;
  const reviewFieldsMatchStatus =
    status === "OPEN"
      ? (data.reviewedBy === null || data.reviewedBy === undefined) &&
        (data.reviewedAt === null || data.reviewedAt === undefined)
      : typeof data.reviewedBy === "string" &&
        data.reviewedAt instanceof Timestamp;

  return (
    typeof data.reporterId === "string" &&
    isReportTargetType(data.targetType) &&
    typeof data.targetId === "string" &&
    isReportReason(data.reason) &&
    isReportStatus(status) &&
    data.createdAt instanceof Timestamp &&
    (data.description === null || typeof data.description === "string") &&
    reviewFieldsMatchStatus
  );
}

function mapReport(id: string, data: DocumentData): ReportRecord {
  const targetType = isReportTargetType(data.targetType)
    ? data.targetType
    : undefined;
  const reason = isReportReason(data.reason) ? data.reason : undefined;

  return {
    id,
    reporterId: optionalString(data.reporterId),
    targetType,
    targetId: optionalString(data.targetId),
    reason,
    description: optionalString(data.description),
    status: optionalString(data.status),
    createdAt: optionalDate(data.createdAt),
    reviewedBy: optionalString(data.reviewedBy),
    reviewedAt: optionalDate(data.reviewedAt),
    recognized: hasExpectedReportSchema(data),
  };
}

export async function getAdminReportsPage(
  status: ReportFilter,
  lastDocument: QueryDocumentSnapshot<DocumentData> | null
): Promise<AdminReportPage> {
  await assertAdmin();

  const constraints: QueryConstraint[] = [];
  if (status !== "ALL") {
    constraints.push(where("status", "==", status));
  }
  constraints.push(orderBy(documentId()));
  if (lastDocument) {
    constraints.push(startAfter(lastDocument));
  }
  constraints.push(limit(REPORT_PAGE_SIZE + 1));

  const snapshot = await getDocs(
    query(collection(db, "reports"), ...constraints)
  );
  const visibleDocuments = snapshot.docs.slice(0, REPORT_PAGE_SIZE);

  return {
    reports: visibleDocuments.map((report) =>
      mapReport(report.id, report.data())
    ),
    lastDocument:
      visibleDocuments.length > 0
        ? visibleDocuments[visibleDocuments.length - 1]
        : null,
    hasMore: snapshot.docs.length > REPORT_PAGE_SIZE,
  };
}

function personSummary(
  id: string,
  data: DocumentData | undefined
): ReportPersonSummary {
  return {
    id,
    name:
      optionalString(data?.displayName) ??
      optionalString(data?.name),
    email: optionalString(data?.email),
  };
}

function stringFields(
  data: DocumentData | undefined,
  fields: readonly [string, string][]
): { label: string; value: string }[] {
  if (!data) {
    return [];
  }
  return fields.flatMap(([field, label]) => {
    const value = optionalString(data[field]);
    return value ? [{ label, value }] : [];
  });
}

function targetSummary(
  targetType: ReportTargetType,
  targetId: string,
  data: DocumentData | undefined
): ReportTargetSummary {
  if (!data) {
    return {
      title: "Target record unavailable",
      fields: [{ label: "Target ID", value: targetId }],
    };
  }

  if (targetType === "USER") {
    return {
      title: optionalString(data.displayName) ?? optionalString(data.name) ?? "Reported user",
      fields: [
        { label: "User ID", value: targetId },
        ...stringFields(data, [["email", "Email"]]),
      ],
    };
  }

  if (targetType === "EXCHANGE_REQUEST") {
    return {
      title: "Exchange request",
      fields: [
        { label: "Request ID", value: targetId },
        ...stringFields(data, [
          ["status", "Status"],
          ["senderId", "Sender ID"],
          ["receiverId", "Receiver ID"],
          ["exchangeType", "Exchange type"],
          ["offeredSkillId", "Offered skill"],
          ["requestedSkillId", "Requested skill"],
          ["message", "Message"],
        ]),
      ],
    };
  }

  const scheduledAt =
    data.scheduledAt instanceof Timestamp
      ? data.scheduledAt.toDate().toLocaleString()
      : undefined;

  return {
    title: "Session",
    fields: [
      { label: "Session ID", value: targetId },
      ...stringFields(data, [
        ["status", "Status"],
        ["teacherId", "Teacher ID"],
        ["learnerId", "Learner ID"],
        ["skillId", "Skill ID"],
        ["sessionType", "Session type"],
      ]),
      ...(scheduledAt ? [{ label: "Scheduled at", value: scheduledAt }] : []),
    ],
  };
}

export async function getAdminReportDetails(
  reportId: string
): Promise<AdminReportDetails> {
  await assertAdmin();

  const reportSnapshot = await getDoc(doc(db, "reports", reportId));
  if (!reportSnapshot.exists()) {
    throw new AdminReportNotFoundError();
  }

  const report = mapReport(reportSnapshot.id, reportSnapshot.data());
  const reporterSnapshotPromise = report.reporterId
    ? getDoc(doc(db, "users", report.reporterId))
    : Promise.resolve(null);
  const targetCollection = report.targetType
    ? report.targetType === "USER"
      ? "users"
      : report.targetType === "EXCHANGE_REQUEST"
        ? "exchangeRequests"
        : "sessions"
    : null;
  const targetSnapshotPromise =
    targetCollection && report.targetId
      ? getDoc(doc(db, targetCollection, report.targetId))
      : Promise.resolve(null);
  const [reporterSnapshot, targetSnapshot] = await Promise.all([
    reporterSnapshotPromise,
    targetSnapshotPromise,
  ]);

  return {
    report,
    reporter:
      reporterSnapshot?.exists() && report.reporterId
        ? personSummary(report.reporterId, reporterSnapshot.data())
        : null,
    target:
      report.targetType && report.targetId
        ? targetSummary(
            report.targetType,
            report.targetId,
            targetSnapshot?.exists() ? targetSnapshot.data() : undefined
          )
        : null,
  };
}

export async function getAdminModerationHistory(
  reportId: string
): Promise<ModerationHistoryRecord[]> {
  await assertAdmin();
  const historyQuery = query(
    collection(db, "reports", reportId, "moderationHistory"),
    orderBy("timestamp", "desc"),
    limit(HISTORY_LIMIT)
  );
  const snapshot = await getDocs(historyQuery);

  return snapshot.docs.map((event) => {
    const data = event.data();
    const action =
      data.action === "RESOLVE" || data.action === "REJECT"
        ? (data.action as ModerationAction)
        : undefined;
    return {
      id: event.id,
      reportId: optionalString(data.reportId),
      adminUid: optionalString(data.adminUid),
      action,
      previousStatus: optionalString(data.previousStatus),
      newStatus: optionalString(data.newStatus),
      moderationNote: optionalString(data.moderationNote),
      timestamp: optionalDate(data.timestamp),
    };
  });
}

export async function moderateAdminReport(
  input: ModerateReportInput
): Promise<ReportStatus> {
  await assertAdmin();
  const moderate = httpsCallable<
    ModerateReportInput,
    { reportId: string; status: ReportStatus }
  >(getFunctions(auth.app), "moderateReport");
  const response = await moderate(input);
  return response.data.status;
}
