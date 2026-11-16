import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";

import { verifyAttendanceQr } from "../../services/member4/attendanceService";
import type { AttendanceQrPayload } from "../../types/member4/member4";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAttendanceQrPayload(
  value: unknown
): value is AttendanceQrPayload {
  return (
    isRecord(value) &&
    Object.keys(value).length === 2 &&
    Object.prototype.hasOwnProperty.call(value, "sessionId") &&
    Object.prototype.hasOwnProperty.call(value, "token") &&
    typeof value.sessionId === "string" &&
    value.sessionId.trim().length > 0 &&
    typeof value.token === "string" &&
    /^[A-Za-z0-9_-]{43}$/.test(value.token)
  );
}

function getVerificationErrorMessage(error: unknown): string {
  const code =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
      ? error.code
      : "";

  switch (code) {
    case "functions/unauthenticated":
      return "Please sign in before checking in.";
    case "functions/invalid-argument":
      return "This QR code is invalid. Scan a current attendance QR code.";
    case "functions/not-found":
      return "The session for this QR code could not be found.";
    case "functions/permission-denied":
      return "Only the learner assigned to this session can check in.";
    case "functions/failed-precondition":
      return "This QR code is invalid, unavailable, or expired.";
    default:
      return "Could not verify attendance. Check your connection and try again.";
  }
}

export default function AttendanceScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [requestingPermission, setRequestingPermission] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<
    "recorded" | "already_checked_in" | null
  >(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mounted = useRef(false);
  const verificationInProgress = useRef(false);
  const checkInComplete = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  async function handleRequestPermission() {
    setRequestingPermission(true);
    setPermissionError(null);

    try {
      const updatedPermission = await requestPermission();
      if (!mounted.current) return;

      if (!updatedPermission.granted) {
        setPermissionError(
          updatedPermission.canAskAgain
            ? "Camera permission was not granted. You can try again to scan the attendance QR code."
            : "Camera access is disabled. Enable it in your device settings to scan attendance QR codes."
        );
      }
    } catch {
      if (mounted.current) {
        setPermissionError("Could not request camera permission. Please try again.");
      }
    } finally {
      if (mounted.current) {
        setRequestingPermission(false);
      }
    }
  }

  async function handleBarcodeScanned({ data }: { data: string }) {
    if (
      !mounted.current ||
      verificationInProgress.current ||
      checkInComplete.current
    ) {
      return;
    }

    verificationInProgress.current = true;
    setVerifying(true);
    setErrorMessage(null);

    try {
      let payload: unknown;
      try {
        payload = JSON.parse(data);
      } catch {
        if (mounted.current) {
          setErrorMessage("This QR code is not valid attendance data. Please scan an attendance QR code.");
        }
        return;
      }

      if (!isAttendanceQrPayload(payload)) {
        if (mounted.current) {
          setErrorMessage("This QR code is malformed. Please scan an attendance QR code.");
        }
        return;
      }

      const result = await verifyAttendanceQr(payload.sessionId, payload.token);
      if (!mounted.current) return;

      setVerificationResult(result.result);
      checkInComplete.current = true;
    } catch (error) {
      if (mounted.current) {
        setErrorMessage(getVerificationErrorMessage(error));
      }
    } finally {
      if (mounted.current) {
        setVerifying(false);
      }
      if (!checkInComplete.current) {
        verificationInProgress.current = false;
      }
    }
  }

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Checking camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    const canRequestPermission = permission.canAskAgain;

    return (
      <View style={styles.center}>
        <Text style={styles.header}>Camera Permission Needed</Text>
        <Text style={styles.permissionMessage}>
          LearnLink needs camera access to scan the attendance QR code. The QR
          code is verified securely by the server.
        </Text>
        {permissionError ? (
          <Text style={styles.error}>{permissionError}</Text>
        ) : null}
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={
            canRequestPermission
              ? handleRequestPermission
              : () => Linking.openSettings()
          }
          disabled={requestingPermission}
        >
          {requestingPermission ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {canRequestPermission
                ? "Grant Camera Permission"
                : "Open Device Settings"}
            </Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.header}>Scan Attendance QR</Text>
      <Text style={styles.instructions}>
        Place the teacher&apos;s attendance QR code inside the frame. The server
        will verify your check-in.
      </Text>

      <View style={styles.cameraContainer}>
        {verificationResult ? (
          <View style={styles.resultPanel}>
            <Text style={styles.resultTitle}>
              {verificationResult === "recorded"
                ? "Check-in Successful"
                : "Attendance Already Recorded"}
            </Text>
            <Text style={styles.resultMessage}>
              {verificationResult === "recorded"
                ? "Your attendance has been recorded for this session."
                : "Your attendance was already recorded for this session."}
            </Text>
          </View>
        ) : (
          <>
            <CameraView
              style={styles.camera}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              onBarcodeScanned={
                verifying ||
                verificationInProgress.current ||
                checkInComplete.current
                  ? undefined
                  : handleBarcodeScanned
              }
            />
            <View pointerEvents="none" style={styles.scanGuide}>
              <View style={styles.scanFrame} />
              <Text style={styles.guideText}>Align the QR code within the frame</Text>
            </View>
            {verifying ? (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.loadingText}>Verifying attendance...</Text>
              </View>
            ) : null}
          </>
        )}
      </View>

      {errorMessage ? (
        <Text style={styles.error}>{errorMessage}</Text>
      ) : null}

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Text>Back</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  header: { fontSize: 27, fontWeight: "bold", marginBottom: 16, textAlign: "center" },
  instructions: { textAlign: "center", marginBottom: 18, color: "#555" },
  permissionMessage: { textAlign: "center", marginBottom: 16, color: "#555" },
  cameraContainer: { height: 440, overflow: "hidden", borderRadius: 10, backgroundColor: "#111", justifyContent: "center", alignItems: "center" },
  camera: { ...StyleSheet.absoluteFillObject },
  scanGuide: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  scanFrame: { width: 250, height: 250, borderWidth: 3, borderColor: "#fff", borderRadius: 12 },
  guideText: { color: "#fff", backgroundColor: "#0009", marginTop: 16, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "#0009", alignItems: "center", justifyContent: "center" },
  loadingText: { color: "#fff", fontSize: 16, fontWeight: "600", marginTop: 12 },
  resultPanel: { padding: 24, alignItems: "center" },
  resultTitle: { color: "#fff", fontSize: 22, fontWeight: "bold", textAlign: "center" },
  resultMessage: { color: "#fff", fontSize: 16, textAlign: "center", marginTop: 12 },
  error: { color: "#c62828", textAlign: "center", marginVertical: 12 },
  primaryButton: { backgroundColor: "#2563eb", padding: 15, borderRadius: 8, alignItems: "center", marginVertical: 12, minWidth: 220 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  backButton: { borderWidth: 1, borderRadius: 8, padding: 14, alignItems: "center", marginTop: 16 },
});
