
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";

import { createSession } from "../../services/member4/sessionService";
import { SessionType } from "../../types/member4/member4";

export default function ScheduleSessionScreen() {
  const [exchangeRequestId, setExchangeRequestId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [learnerId, setLearnerId] = useState("");
  const [skillId, setSkillId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState("60");
  const [sessionType, setSessionType] =
    useState<SessionType>("ONLINE");
  const [meetingLink, setMeetingLink] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSchedule() {
    if (
      !exchangeRequestId.trim() ||
      !teacherId.trim() ||
      !learnerId.trim() ||
      !skillId.trim() ||
      !date.trim() ||
      !time.trim()
    ) {
      Alert.alert("Missing information", "Please fill in all required fields.");
      return;
    }

    if (teacherId.trim() === learnerId.trim()) {
      Alert.alert("Invalid participants", "The teacher and learner must be different users.");
      return;
    }

    const durationMinutes = Number(duration);
    if (!Number.isInteger(durationMinutes) ||
        durationMinutes < 15 ||
        durationMinutes > 240) {
      Alert.alert("Invalid duration", "Choose a duration between 15 and 240 minutes.");
      return;
    }

    // Expect a local date in YYYY-MM-DD and time in HH:mm format.
    const scheduledAt = new Date(`${date.trim()}T${time.trim()}`);

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date.trim()) ||
      !/^\d{2}:\d{2}$/.test(time.trim()) ||
      Number.isNaN(scheduledAt.getTime()) ||
      scheduledAt.getFullYear() !== Number(date.slice(0, 4)) ||
      scheduledAt.getMonth() + 1 !== Number(date.slice(5, 7)) ||
      scheduledAt.getDate() !== Number(date.slice(8, 10)) ||
      scheduledAt.getHours() !== Number(time.slice(0, 2)) ||
      scheduledAt.getMinutes() !== Number(time.slice(3, 5))
    ) {
      Alert.alert("Invalid date or time", "Use YYYY-MM-DD for the date and 24-hour HH:mm for the time.");
      return;
    }

    if (scheduledAt.getTime() <= Date.now()) {
      Alert.alert("Invalid schedule", "Choose a future date and time.");
      return;
    }

    if (sessionType === "ONLINE" && !meetingLink.trim()) {
      Alert.alert("Missing meeting link", "Enter a meeting link for an online session.");
      return;
    }

    if (sessionType === "IN_PERSON" && !location.trim()) {
      Alert.alert("Missing location", "Enter a location for an in-person session.");
      return;
    }

    try {
      setLoading(true);

      const sessionId = await createSession({
        exchangeRequestId: exchangeRequestId.trim(),
        teacherId: teacherId.trim(),
        learnerId: learnerId.trim(),
        skillId: skillId.trim(),
        scheduledAt,
        duration: durationMinutes,
        sessionType,
        ...(sessionType === "ONLINE"
          ? { meetingLink: meetingLink.trim() }
          : { location: location.trim() }),
        status: "PROPOSED",
        completedBy: [],
      });

      Alert.alert(
        "Session proposed",
        `Session ID: ${sessionId}\nThe session has been saved.`,
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error("Failed to schedule session:", error);
      Alert.alert(
        "Could not schedule",
        "The session could not be saved. Check your Firebase connection and permissions."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.header}>Schedule a Session</Text>
      <Text style={styles.help}>
        Enter the accepted exchange details and propose a time.
      </Text>

      <Text style={styles.label}>Exchange Request ID</Text>
      <TextInput
        style={styles.input}
        value={exchangeRequestId}
        onChangeText={setExchangeRequestId}
        placeholder="Enter request document ID"
        autoCapitalize="none"
      />

      <Text style={styles.label}>Teacher User ID</Text>
      <TextInput
        style={styles.input}
        value={teacherId}
        onChangeText={setTeacherId}
        placeholder="Enter teacher UID"
        autoCapitalize="none"
      />

      <Text style={styles.label}>Learner User ID</Text>
      <TextInput
        style={styles.input}
        value={learnerId}
        onChangeText={setLearnerId}
        placeholder="Enter learner UID"
        autoCapitalize="none"
      />

      <Text style={styles.label}>Skill ID</Text>
      <TextInput
        style={styles.input}
        value={skillId}
        onChangeText={setSkillId}
        placeholder="Enter skill document ID"
        autoCapitalize="none"
      />

      <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
      <TextInput
        style={styles.input}
        value={date}
        onChangeText={setDate}
        placeholder="2026-12-15"
        autoCapitalize="none"
      />

      <Text style={styles.label}>Time (24-hour HH:mm)</Text>
      <TextInput
        style={styles.input}
        value={time}
        onChangeText={setTime}
        placeholder="14:30"
      />

      <Text style={styles.label}>Duration in minutes (15–240)</Text>
      <TextInput
        style={styles.input}
        value={duration}
        onChangeText={setDuration}
        keyboardType="numeric"
        placeholder="60"
      />

      <Text style={styles.label}>Session Type</Text>
      <View style={styles.typeRow}>
        <TouchableOpacity
          style={[
            styles.typeButton,
            sessionType === "ONLINE" && styles.selected,
          ]}
          onPress={() => setSessionType("ONLINE")}
        >
          <Text>Online</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.typeButton,
            sessionType === "IN_PERSON" && styles.selected,
          ]}
          onPress={() => setSessionType("IN_PERSON")}
        >
          <Text>In person</Text>
        </TouchableOpacity>
      </View>

      {sessionType === "ONLINE" ? (
        <>
          <Text style={styles.label}>Meeting Link</Text>
          <TextInput
            style={styles.input}
            value={meetingLink}
            onChangeText={setMeetingLink}
            placeholder="https://..."
            autoCapitalize="none"
            keyboardType="url"
          />
        </>
      ) : (
        <>
          <Text style={styles.label}>Meeting Location</Text>
          <TextInput
            style={styles.input}
            value={location}
            onChangeText={setLocation}
            placeholder="Enter meeting location"
          />
        </>
      )}

      <TouchableOpacity
        style={[styles.submitButton, loading && styles.disabled]}
        onPress={handleSchedule}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>Propose Session</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  header: { fontSize: 27, fontWeight: "bold", marginBottom: 8 },
  help: { fontSize: 14, color: "#666", marginBottom: 12 },
  label: { fontSize: 15, fontWeight: "600", marginTop: 16, marginBottom: 7 },
  input: { borderWidth: 1, borderColor: "#aaa", borderRadius: 8, padding: 12, fontSize: 16 },
  typeRow: { flexDirection: "row", gap: 10 },
  typeButton: { flex: 1, padding: 14, borderWidth: 1, borderColor: "#aaa", borderRadius: 8, alignItems: "center" },
  selected: { borderColor: "#2563eb", borderWidth: 2, backgroundColor: "#eff6ff" },
  submitButton: { marginTop: 28, padding: 16, borderRadius: 8, backgroundColor: "#222", alignItems: "center" },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  disabled: { opacity: 0.6 },
});