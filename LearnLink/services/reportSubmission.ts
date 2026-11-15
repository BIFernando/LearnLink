import { getFunctions, httpsCallable } from "firebase/functions";

import { auth } from "../config/firebase";
import type { ReportSubmissionInput } from "../types/reports";

interface SubmitReportResponse {
  reportId: string;
}

export async function submitReport(
  input: ReportSubmissionInput
): Promise<string> {
  if (!auth.currentUser) {
    throw new Error("Sign in before submitting a report.");
  }

  const submit = httpsCallable<ReportSubmissionInput, SubmitReportResponse>(
    getFunctions(auth.app),
    "submitReport"
  );
  const response = await submit(input);
  return response.data.reportId;
}
