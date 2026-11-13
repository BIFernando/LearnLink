import {
  MODERATION_NOTE_MAX_LENGTH,
  REPORT_DESCRIPTION_MAX_LENGTH,
  REPORT_REASONS,
  REPORT_TARGET_TYPES,
  type ModerationAction,
  type ReportReason,
  type ReportSubmissionInput,
  type ReportTargetType,
} from "../../types/reports";

export class ReportInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReportInputError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  allowedKeys: readonly string[]
): boolean {
  return Object.keys(value).every((key) => allowedKeys.includes(key));
}

export function parseReportSubmission(value: unknown): ReportSubmissionInput {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ["targetType", "targetId", "reason", "description"])
  ) {
    throw new ReportInputError("The report submission is invalid.");
  }

  const targetType = value.targetType;
  const targetId =
    typeof value.targetId === "string" ? value.targetId.trim() : "";
  const reason = value.reason;

  if (
    typeof targetType !== "string" ||
    !REPORT_TARGET_TYPES.some((candidate) => candidate === targetType)
  ) {
    throw new ReportInputError("Select a valid report target.");
  }

  if (
    !targetId ||
    targetId.length > 128 ||
    targetId.includes("/")
  ) {
    throw new ReportInputError("The report target is invalid.");
  }

  if (
    typeof reason !== "string" ||
    !REPORT_REASONS.some((candidate) => candidate.value === reason)
  ) {
    throw new ReportInputError("Select a valid report reason.");
  }

  let description: string | undefined;
  if (value.description !== undefined) {
    if (typeof value.description !== "string") {
      throw new ReportInputError("The description must be text.");
    }

    description = value.description.trim();
    if (description.length > REPORT_DESCRIPTION_MAX_LENGTH) {
      throw new ReportInputError(
        `Descriptions must be ${REPORT_DESCRIPTION_MAX_LENGTH} characters or fewer.`
      );
    }
  }

  return {
    targetType: targetType as ReportTargetType,
    targetId,
    reason: reason as ReportReason,
    description,
  };
}

export interface ModerationInput {
  reportId: string;
  action: ModerationAction;
  moderationNote: string | null;
}

export function parseModerationInput(value: unknown): ModerationInput {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ["reportId", "action", "moderationNote"])
  ) {
    throw new ReportInputError("The moderation request is invalid.");
  }

  const reportId =
    typeof value.reportId === "string" ? value.reportId.trim() : "";
  if (!reportId || reportId.length > 128 || reportId.includes("/")) {
    throw new ReportInputError("The report ID is invalid.");
  }

  if (value.action !== "RESOLVE" && value.action !== "REJECT") {
    throw new ReportInputError("Select a valid moderation action.");
  }

  let moderationNote: string | null = null;
  if (value.moderationNote !== undefined && value.moderationNote !== null) {
    if (typeof value.moderationNote !== "string") {
      throw new ReportInputError("The moderation note must be text.");
    }

    moderationNote = value.moderationNote.trim();
    if (moderationNote.length > MODERATION_NOTE_MAX_LENGTH) {
      throw new ReportInputError(
        `Moderation notes must be ${MODERATION_NOTE_MAX_LENGTH} characters or fewer.`
      );
    }
  }

  return {
    reportId,
    action: value.action,
    moderationNote,
  };
}
