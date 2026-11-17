
import React, { useEffect, useState } from "react";
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
import { router, useLocalSearchParams } from "expo-router";

import { getSkillName } from "../../services/chatService";
import { createSession } from "../../services/member4/sessionService";
import { SessionType } from "../../types/member4/member4";
import { getCurrentUserId } from "@/services/member4/currentUser";
import { getExchangeRequest } from "@/services/member4/exchangeService";
import {
  displayNameOf,
  useUserProfiles,
} from "@/services/member5/userService";
import type { ExchangeRequest } from "@/types/member4/member4";

export default function ScheduleSessionScreen() {
  const {
    exchangeRequestId: exchangeRequestIdParam,
    skillId: skillIdParam,
  } = useLocalSearchParams<{
    exchangeRequestId?: string | string[];
    skillId?: string | string[];
  }>();
  const [exchangeRequestId, setExchangeRequestId] = useState("");
  const [skillId, setSkillId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState("60");
  const [sessionType, setSessionType] =
    useState<SessionType>("ONLINE");
  const [meetingLink, setMeetingLink] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [exchangeInfo, setExchangeInfo] = useState<ExchangeRequest | null>(null);
  const [exchangeInfoLoading, setExchangeInfoLoading] = useState(false);
  const [exchangeInfoError, setExchangeInfoError] = useState<string | null>(null);
  const [skillName, setSkillName] = useState<string | null | undefined>(undefined);
  const [skillNameLoading, setSkillNameLoading] = useState(false);

  const currentUserId = getCurrentUserId();
  const normalizedExchangeRequestId = exchangeRequestId.trim();
  const normalizedSkillId = skillId.trim();
  const selectedExchange =
    exchangeInfo?.id === normalizedExchangeRequestId ? exchangeInfo : null;
  const otherParticipantId = selectedExchange
    ? selectedExchange.senderId === currentUserId
      ? selectedExchange.receiverId
      : selectedExchange.senderId
    : "";
  const userProfiles = useUserProfiles(
    otherParticipantId ? [otherParticipantId] : []
  );
  const skillBelongsToExchange =
    selectedExchange !== null &&
    (normalizedSkillId === selectedExchange.offeredSkillId ||
      normalizedSkillId === selectedExchange.requestedSkillId);
  const otherParticipantName = otherParticipantId
    ? Object.prototype.hasOwnProperty.call(userProfiles, otherParticipantId)
      ? displayNameOf(userProfiles[otherParticipantId])
      : "Loading student..."
    : "Participant unavailable";
  const skillDisplayName = !skillBelongsToExchange
    ? "Choose a skill from the selected exchange."
    : skillNameLoading || skillName === undefined
      ? "Loading skill..."
      : skillName ?? "Skill unavailable";

  useEffect(() => {
    const requestId = Array.isArray(exchangeRequestIdParam)
      ? exchangeRequestIdParam[0]
      : exchangeRequestIdParam;
    const selectedSkillId = Array.isArray(skillIdParam)
      ? skillIdParam[0]
      : skillIdParam;

    if (requestId !== undefined) {
      setExchangeRequestId(requestId);
    }

    if (selectedSkillId !== undefined) {
      setSkillId(selectedSkillId);
    }
  }, [exchangeRequestIdParam, skillIdParam]);

  useEffect(() => {
    let active = true;

    if (!normalizedExchangeRequestId) {
      setExchangeInfo(null);
      setExchangeInfoLoading(false);
      setExchangeInfoError(null);
      return () => {
        active = false;
      };
    }

    setExchangeInfo(null);
    setExchangeInfoLoading(true);
    setExchangeInfoError(null);
    getExchangeRequest(normalizedExchangeRequestId)
      .then((request) => {
        if (!active) return;
        setExchangeInfo(request);
        if (!request) {
          setExchangeInfoError(
            "Exchange not found. Choose an accepted exchange to continue."
          );
        }
      })
      .catch((error: unknown) => {
        console.error("Failed to load selected exchange:", error);
        if (active) {
          setExchangeInfoError("Could not load the selected exchange.");
        }
      })
      .finally(() => {
        if (active) setExchangeInfoLoading(false);
      });

    return () => {
      active = false;
    };
  }, [normalizedExchangeRequestId]);

  useEffect(() => {
    let active = true;

    if (!skillBelongsToExchange) {
      setSkillName(null);
      setSkillNameLoading(false);
      return () => {
        active = false;
      };
    }

    setSkillName(undefined);
    setSkillNameLoading(true);
    getSkillName(normalizedSkillId)
      .then((name) => {
        if (active) setSkillName(name);
      })
      .catch((error: unknown) => {
        console.error("Failed to load selected skill name:", error);
        if (active) setSkillName(null);
      })
      .finally(() => {
        if (active) setSkillNameLoading(false);
      });

    return () => {
      active = false;
    };
  }, [normalizedSkillId, skillBelongsToExchange]);

  async function handleSchedule() {
    if (
      !exchangeRequestId.trim() ||
      !skillId.trim() ||
      !date.trim() ||
      !time.trim()
    ) {
      Alert.alert("Missing information", "Please fill in all required fields.");
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
      const request = selectedExchange;

      if (!request) {
        throw new Error(
          exchangeInfoError ?? "Choose an accepted exchange to continue."
        );
      }

      if (request.status !== "ACCEPTED") {
        throw new Error("Only accepted exchange requests can be scheduled.");
      }

      // Only participants in the exchange can schedule its session.
      if (
        currentUserId !== request.senderId &&
        currentUserId !== request.receiverId
      ) {
        throw new Error("You are not a participant in this exchange.");
      }

      // Determine the teacher and learner based on the selected skill.
      let sessionTeacherId: string;
      let sessionLearnerId: string;

      if (skillId.trim() === request.offeredSkillId) {
        sessionTeacherId = request.senderId;
        sessionLearnerId = request.receiverId;
      } else if (skillId.trim() === request.requestedSkillId) {
        sessionTeacherId = request.receiverId;
        sessionLearnerId = request.senderId;
      } else {
        throw new Error("The selected skill does not belong to this exchange.");
      }

      await createSession({
        exchangeRequestId: exchangeRequestId.trim(),
        teacherId: sessionTeacherId,
        learnerId: sessionLearnerId,
        proposedBy: currentUserId,
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
        "The session has been saved.",
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
        Review the selected exchange and propose a time.
      </Text>

      <View style={styles.selectionCard}>
        <Text style={styles.label}>Accepted exchange</Text>
        {exchangeInfoLoading ? (
          <Text style={styles.selectionDetail}>Loading exchange...</Text>
        ) : selectedExchange ? (
          <>
            <Text style={styles.selectionTitle}>{otherParticipantName}</Text>
            <Text style={styles.selectionDetail}>
              {selectedExchange.exchangeType === "CREDIT"
                ? `Credit exchange · ${selectedExchange.creditAmount} credits`
                : "Direct exchange"}
            </Text>
          </>
        ) : (
          <Text style={styles.selectionDetail}>
            {exchangeInfoError ?? "Select an accepted exchange to continue."}
          </Text>
        )}
        <TouchableOpacity
          style={styles.selectionButton}
          onPress={() => router.push("/member4/select-exchange-for-session")}
        >
          <Text style={styles.selectionButtonText}>
            {selectedExchange ? "Change exchange" : "Choose an accepted exchange"}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Selected skill</Text>
      <Text style={styles.selectionDetail}>{skillDisplayName}</Text>

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
  selectionCard: { borderWidth: 1, borderColor: "#aaa", borderRadius: 8, padding: 12 },
  selectionTitle: { fontSize: 16, fontWeight: "600", marginTop: 6 },
  selectionDetail: { color: "#555", marginTop: 6 },
  selectionButton: { alignSelf: "flex-start", marginTop: 12, paddingVertical: 6 },
  selectionButtonText: { color: "#2563eb", fontWeight: "600" },
  typeRow: { flexDirection: "row", gap: 10 },
  typeButton: { flex: 1, padding: 14, borderWidth: 1, borderColor: "#aaa", borderRadius: 8, alignItems: "center" },
  selected: { borderColor: "#2563eb", borderWidth: 2, backgroundColor: "#eff6ff" },
  submitButton: { marginTop: 28, padding: 16, borderRadius: 8, backgroundColor: "#222", alignItems: "center" },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  disabled: { opacity: 0.6 },
});