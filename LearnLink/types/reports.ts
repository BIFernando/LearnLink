export const REPORT_TARGET_TYPES = [
  "USER",
  "EXCHANGE_REQUEST",
  "SESSION",
] as const;

export type ReportTargetType = (typeof REPORT_TARGET_TYPES)[number];

export const REPORT_REASONS = [
  { value: "HARASSMENT", label: "Harassment or bullying" },
  { value: "SPAM", label: "Spam or scam" },
  { value: "INAPPROPRIATE_CONTENT", label: "Inappropriate content" },
  { value: "SAFETY_CONCERN", label: "Safety concern" },
  { value: "OTHER", label: "Other" },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]["value"];

export const REPORT_STATUSES = ["OPEN", "RESOLVED", "REJECTED"] as const;

export type ReportStatus = (typeof REPORT_STATUSES)[number];
export type ReportFilter = ReportStatus | "ALL";

export const REPORT_DESCRIPTION_MAX_LENGTH = 1000;
export const MODERATION_NOTE_MAX_LENGTH = 1000;

export interface ReportSubmissionInput {
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  description?: string;
}

export interface ReportRecord {
  id: string;
  reporterId?: string;
  targetType?: ReportTargetType;
  targetId?: string;
  reason?: ReportReason;
  description?: string;
  status?: string;
  createdAt?: Date;
  reviewedBy?: string;
  reviewedAt?: Date;
  recognized: boolean;
}

export type ModerationAction = "RESOLVE" | "REJECT";

export interface ModerateReportInput {
  reportId: string;
  action: ModerationAction;
  moderationNote?: string;
}

export interface ModerationHistoryRecord {
  id: string;
  reportId?: string;
  adminUid?: string;
  action?: ModerationAction;
  previousStatus?: string;
  newStatus?: string;
  moderationNote?: string;
  timestamp?: Date;
}
