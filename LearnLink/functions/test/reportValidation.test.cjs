const assert = require("node:assert/strict");
const { test } = require("node:test");

const {
  parseModerationInput,
  parseReportSubmission,
  ReportInputError,
} = require("../lib/functions/src/reportValidation.js");

test("report submission accepts a supported target and trims optional text", () => {
  assert.deepEqual(
    parseReportSubmission({
      targetType: "USER",
      targetId: " user-1 ",
      reason: "SPAM",
      description: "  Repeated spam  ",
    }),
    {
      targetType: "USER",
      targetId: "user-1",
      reason: "SPAM",
      description: "Repeated spam",
    }
  );
});

test("report submission rejects client-supplied identity and status fields", () => {
  assert.throws(
    () =>
      parseReportSubmission({
        targetType: "USER",
        targetId: "user-1",
        reason: "SPAM",
        reporterId: "forged-user",
        status: "RESOLVED",
      }),
    ReportInputError
  );
});

test("report submission rejects unsupported targets and oversized descriptions", () => {
  assert.throws(
    () =>
      parseReportSubmission({
        targetType: "MATCH",
        targetId: "match-1",
        reason: "SPAM",
      }),
    ReportInputError
  );
  assert.throws(
    () =>
      parseReportSubmission({
        targetType: "USER",
        targetId: "user-1",
        reason: "SPAM",
        description: "x".repeat(1001),
      }),
    ReportInputError
  );
});

test("moderation accepts only the expected action and request fields", () => {
  assert.deepEqual(
    parseModerationInput({
      reportId: "report-1",
      action: "REJECT",
      moderationNote: "  Not actionable  ",
    }),
    {
      reportId: "report-1",
      action: "REJECT",
      moderationNote: "Not actionable",
    }
  );
  assert.throws(
    () =>
      parseModerationInput({
        reportId: "report-1",
        action: "DELETE",
      }),
    ReportInputError
  );
});
