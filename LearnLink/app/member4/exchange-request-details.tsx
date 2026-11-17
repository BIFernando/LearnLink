import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { router, useLocalSearchParams } from "expo-router";

import { getSkillName } from "../../services/chatService";
import {
  getExchangeRequest,
  updateExchangeStatus,
} from "../../services/member4/exchangeService";
import {
  displayNameOf,
  useUserProfiles,
} from "../../services/member5/userService";

import { ExchangeRequest } from "../../types/member4/member4";
import { getCurrentUserId } from "../../services/member4/currentUser";
import { ReportActionButton } from "../../components/reports/ReportActionButton";

export default function ExchangeRequestDetailsScreen() {
  const { requestId } = useLocalSearchParams<{
    requestId: string;
  }>();

  const [request, setRequest] =
    useState<ExchangeRequest | null>(null);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const userProfiles = useUserProfiles(
    request
      ? [request.senderId, request.receiverId].filter((userId) => userId.length > 0)
      : []
  );
  const [skillNames, setSkillNames] = useState<Record<string, string | null>>(
    {}
  );

  const currentUserId = getCurrentUserId();

  useEffect(() => {
    loadRequest();
  }, [requestId]);

  useEffect(() => {
    let active = true;
    const skillIds = [
      ...new Set(
        [request?.offeredSkillId, request?.requestedSkillId].filter(
          (skillId): skillId is string =>
            typeof skillId === "string" && skillId.length > 0
        )
      ),
    ];

    Promise.all(
      skillIds.map(async (skillId) => [skillId, await getSkillName(skillId)] as const)
    )
      .then((entries) => {
        if (active) {
          setSkillNames((current) => ({
            ...current,
            ...Object.fromEntries(entries),
          }));
        }
      })
      .catch((error: unknown) => {
        console.error("Failed to load request skill names:", error);
        if (active) {
          setSkillNames((current) => ({
            ...current,
            ...Object.fromEntries(skillIds.map((skillId) => [skillId, null])),
          }));
        }
      });

    return () => {
      active = false;
    };
  }, [request?.offeredSkillId, request?.requestedSkillId]);

  function getStudentDisplayName(userId: string): string {
    if (!userId) return "Student unavailable";
    return Object.prototype.hasOwnProperty.call(userProfiles, userId)
      ? displayNameOf(userProfiles[userId])
      : "Loading student...";
  }

  function getSkillDisplayName(skillId: string): string {
    if (!skillId) return "Skill unavailable";
    if (!Object.prototype.hasOwnProperty.call(skillNames, skillId)) {
      return "Loading skill...";
    }
    return skillNames[skillId] ?? "Skill unavailable";
  }

  async function loadRequest() {
    if (!requestId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const data = await getExchangeRequest(requestId);

      setRequest(data);
    } catch (error) {
      console.error(
        "Failed to load exchange request:",
        error
      );

      Alert.alert(
        "Error",
        "Could not load the exchange request."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(
    newStatus: ExchangeRequest["status"]
  ) {
    if (!request) {
      return;
    }

    try {
      setActionLoading(true);

      await updateExchangeStatus(
        request.id,
        newStatus
      );

      setRequest({
        ...request,
        status: newStatus,
      });

      Alert.alert(
        "Success",
        `Request ${newStatus.toLowerCase()}.`
      );
    } catch (error) {
      console.error(
        "Failed to update request:",
        error
      );

      Alert.alert(
        "Error",
        "Could not update the request."
      );
    } finally {
      setActionLoading(false);
    }
  }

  function handleAccept() {
    Alert.alert(
      "Accept Request",
      "Are you sure you want to accept this exchange request?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Accept",
          onPress: () =>
            handleStatusChange("ACCEPTED"),
        },
      ]
    );
  }

  function handleReject() {
    Alert.alert(
      "Reject Request",
      "Are you sure you want to reject this exchange request?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Reject",
          style: "destructive",
          onPress: () =>
            handleStatusChange("REJECTED"),
        },
      ]
    );
  }

  function handleCancel() {
    Alert.alert(
      "Cancel Request",
      "Are you sure you want to cancel this request?",
      [
        {
          text: "No",
          style: "cancel",
        },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: () =>
            handleStatusChange("CANCELLED"),
        },
      ]
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Loading request...</Text>
      </View>
    );
  }

  if (!request) {
    return (
      <View style={styles.center}>
        <Text>Exchange request not found.</Text>
      </View>
    );
  }

  const isIncoming =
    request.receiverId === currentUserId;

  const isOutgoing =
    request.senderId === currentUserId;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>
        Exchange Request Details
      </Text>

      <View style={styles.card}>
        <Text style={styles.label}>
          Sender
        </Text>

        <Text style={styles.value}>
          {getStudentDisplayName(request.senderId)}
        </Text>

        <Text style={styles.label}>
          Receiver
        </Text>

        <Text style={styles.value}>
          {getStudentDisplayName(request.receiverId)}
        </Text>

        <Text style={styles.label}>
          Offered Skill
        </Text>

        <Text style={styles.value}>
          {getSkillDisplayName(request.offeredSkillId)}
        </Text>

        <Text style={styles.label}>
          Requested Skill
        </Text>

        <Text style={styles.value}>
          {getSkillDisplayName(request.requestedSkillId)}
        </Text>

        <Text style={styles.label}>
          Exchange Type
        </Text>

        <Text style={styles.value}>
          {request.exchangeType}
        </Text>

        {request.exchangeType === "CREDIT" && (
          <>
            <Text style={styles.label}>
              Credit Amount
            </Text>

            <Text style={styles.value}>
              {request.creditAmount}
            </Text>
          </>
        )}

        <Text style={styles.label}>
          Message
        </Text>

        <Text style={styles.value}>
          {request.message || "No message"}
        </Text>

        <Text style={styles.label}>
          Status
        </Text>

        <Text style={styles.status}>
          {request.status}
        </Text>
      </View>

      {actionLoading ? (
        <ActivityIndicator
          size="large"
          style={styles.loader}
        />
      ) : (
        <View style={styles.actions}>
          {isIncoming &&
            request.status === "PENDING" && (
              <>
                <TouchableOpacity
                  style={styles.acceptButton}
                  onPress={handleAccept}
                >
                  <Text style={styles.buttonText}>
                    Accept
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.rejectButton}
                  onPress={handleReject}
                >
                  <Text style={styles.buttonText}>
                    Reject
                  </Text>
                </TouchableOpacity>
              </>
            )}

          {isOutgoing &&
            request.status === "PENDING" && (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancel}
              >
                <Text style={styles.buttonText}>
                  Cancel Request
                </Text>
              </TouchableOpacity>
            )}
        </View>
      )}

      {(isIncoming || isOutgoing) ? (
        <View style={styles.reportActions}>
            <ReportActionButton
              targetType="USER"
              targetId={isIncoming ? request.senderId : request.receiverId}
              label="Report the other participant"
            />
            <ReportActionButton
              targetType="EXCHANGE_REQUEST"
              targetId={request.id}
              label="Report this exchange request"
            />
        </View>
      ) : null}

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Text>Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  header: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 20,
  },

  card: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 16,
  },

  label: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 12,
  },

  value: {
    fontSize: 16,
    marginTop: 4,
  },

  status: {
    fontSize: 17,
    fontWeight: "bold",
    marginTop: 4,
  },

  actions: {
    marginTop: 20,
    gap: 10,
  },
  reportActions: {
    marginTop: 12,
  },

  acceptButton: {
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: "#2e7d32",
  },

  rejectButton: {
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: "#c62828",
  },

  cancelButton: {
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: "#ef6c00",
  },

  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },

  loader: {
    marginTop: 20,
  },

  backButton: {
    marginTop: 20,
    padding: 14,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: "center",
  },
});