import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { router, useLocalSearchParams } from "expo-router";

import { getCurrentUserId } from "../../services/member4/currentUser";
import { generateAttendanceQr } from "../../services/member4/attendanceService";
import { getSession } from "../../services/member4/sessionService";
import type { Session } from "../../types/member4/member4";

export default function AttendanceQrScreen() {
  const { sessionId: sessionIdParam } = useLocalSearchParams<{
    sessionId: string | string[];
  }>();
  const sessionId =
    typeof sessionIdParam === "string" ? sessionIdParam : undefined;

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [sessionEligible, setSessionEligible] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [qrContent, setQrContent] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const generationInProgress = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      setLoading(true);
      setSessionEligible(false);
      setErrorMessage(null);
      setSession(null);
      setQrContent(null);
      setExpiresAt(null);

      if (!sessionId) {
        setErrorMessage("A valid session ID was not provided.");
        setLoading(false);
        return;
      }

      try {
        const currentUserId = getCurrentUserId();
        const result = await getSession(sessionId);

        if (cancelled) return;

        if (!result) {
          setErrorMessage("Session not found.");
          return;
        }

        if (result.teacherId !== currentUserId) {
          setErrorMessage("Only the assigned teacher can generate this QR code.");
          return;
        }

        setSession(result);

        if (result.sessionType !== "IN_PERSON") {
          setErrorMessage("Attendance QR codes are only available for in-person sessions.");
          return;
        }

        if (!["CONFIRMED", "IN_PROGRESS"].includes(result.status)) {
          setErrorMessage("The session must be confirmed or in progress to generate an attendance QR code.");
          return;
        }

        setSessionEligible(true);
      } catch {
        if (!cancelled) {
          setErrorMessage("Could not load or validate the session.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadSession();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  useEffect(() => {
    if (expiresAt === null) return;

    const updateRemaining = () => {
      const seconds = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
      setRemainingSeconds(seconds);
      return seconds;
    };

    if (updateRemaining() === 0) return;

    const intervalId = setInterval(() => {
      if (updateRemaining() === 0) {
        clearInterval(intervalId);
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [expiresAt]);

  async function handleGenerateQr() {
    if (
      !sessionId ||
      !session ||
      !sessionEligible ||
      generating ||
      generationInProgress.current
    ) {
      return;
    }

    generationInProgress.current = true;
    setGenerating(true);
    setErrorMessage(null);

    try {
      const result = await generateAttendanceQr(sessionId);
      const expirationTime = Date.parse(result.expiresAt);

      if (!Number.isFinite(expirationTime) || expirationTime <= Date.now()) {
        throw new Error("The server returned an invalid QR expiration time.");
      }

      setQrContent(JSON.stringify({
        sessionId: result.sessionId,
        token: result.token,
      }));
      setExpiresAt(expirationTime);
      setRemainingSeconds(Math.max(0, Math.ceil((expirationTime - Date.now()) / 1000)));
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not generate the attendance QR code."
      );
    } finally {
      generationInProgress.current = false;
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Loading session...</Text>
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{errorMessage || "Session not found."}</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const qrExpired = remainingSeconds <= 0;
  const qrIsVisible = qrContent !== null && !qrExpired;
  const scheduledDate =
    typeof session.scheduledAt?.toDate === "function"
      ? session.scheduledAt.toDate()
      : new Date(session.scheduledAt);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.header}>Attendance QR Code</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Session ID</Text>
        <Text style={styles.value}>{session.id}</Text>

        <Text style={styles.label}>Session Type</Text>
        <Text style={styles.value}>{session.sessionType}</Text>

        <Text style={styles.label}>Status</Text>
        <Text style={styles.value}>{session.status}</Text>

        <Text style={styles.label}>Date and Time</Text>
        <Text style={styles.value}>
          {Number.isNaN(scheduledDate.getTime())
            ? "Date unavailable"
            : scheduledDate.toLocaleString()}
        </Text>

        <Text style={styles.label}>Duration</Text>
        <Text style={styles.value}>{session.duration} minutes</Text>
      </View>

      {errorMessage ? (
        <Text style={styles.error}>{errorMessage}</Text>
      ) : null}

      {qrIsVisible && qrContent ? (
        <View style={styles.qrCard}>
          <QRCode value={qrContent} size={240} />
          <Text style={styles.countdown}>
            QR expires in {Math.floor(remainingSeconds / 60)}:
            {String(remainingSeconds % 60).padStart(2, "0")}
          </Text>
          <Text style={styles.success}>
            Show this code to the learner to check in.
          </Text>
        </View>
      ) : qrContent && qrExpired ? (
        <Text style={styles.notice}>
          This QR code has expired. Generate a new one to continue.
        </Text>
      ) : null}

      {sessionEligible ? (
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleGenerateQr}
          disabled={generating}
        >
          {generating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {qrContent ? "Generate New QR Code" : "Generate QR Code"}
            </Text>
          )}
        </TouchableOpacity>
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
  header: { fontSize: 27, fontWeight: "bold", marginBottom: 20 },
  card: { borderWidth: 1, borderColor: "#ddd", borderRadius: 10, padding: 16, marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "600", marginTop: 12, color: "#666" },
  value: { fontSize: 16, marginTop: 4 },
  qrCard: { alignItems: "center", borderWidth: 1, borderColor: "#ddd", borderRadius: 10, padding: 20, marginVertical: 16 },
  countdown: { fontSize: 18, fontWeight: "bold", marginTop: 18 },
  success: { marginTop: 10, textAlign: "center", color: "#2e7d32" },
  error: { color: "#c62828", textAlign: "center", marginVertical: 12 },
  notice: { textAlign: "center", marginVertical: 12 },
  primaryButton: { backgroundColor: "#2563eb", padding: 15, borderRadius: 8, alignItems: "center", marginBottom: 12 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  backButton: { borderWidth: 1, borderRadius: 8, padding: 14, alignItems: "center", marginTop: 8 },
});
