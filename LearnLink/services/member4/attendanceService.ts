import { httpsCallable } from "firebase/functions";

import { functions } from "../../config/firebase";
import type { AttendanceQrPayload } from "../../types/member4/member4";

export interface GenerateAttendanceQrResult extends AttendanceQrPayload {
  expiresAt: string;
}

export interface VerifyAttendanceQrResult {
  result: "recorded" | "already_checked_in";
  sessionId: string;
}

export async function generateAttendanceQr(
  sessionId: string
): Promise<GenerateAttendanceQrResult> {
  const callable = httpsCallable<
    { sessionId: string },
    GenerateAttendanceQrResult
  >(functions, "generateAttendanceQr");

  const response = await callable({ sessionId });
  return response.data;
}

export async function verifyAttendanceQr(
  sessionId: string,
  token: string
): Promise<VerifyAttendanceQrResult> {
  const callable = httpsCallable<
    { sessionId: string; token: string },
    VerifyAttendanceQrResult
  >(functions, "verifyAttendanceQr");

  const response = await callable({ sessionId, token });
  return response.data;
}
