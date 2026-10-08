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

import {
  getExchangeRequest,
  updateExchangeStatus,
} from "../../services/member4/exchangeService";

import { ExchangeRequest } from "../../types/member4/member4";

export default function ExchangeRequestDetailsScreen() {
  const { requestId } = useLocalSearchParams<{
    requestId: string;
  }>();

  const [request, setRequest] =
    useState<ExchangeRequest | null>(null);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // TEMPORARY USER ID
  const currentUserId = "TEST_USER_ID";

  useEffect(() => {
    loadRequest();
  }, [requestId]);

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
          {request.senderId}
        </Text>

        <Text style={styles.label}>
          Receiver
        </Text>

        <Text style={styles.value}>
          {request.receiverId}
        </Text>

        <Text style={styles.label}>
          Offered Skill
        </Text>

        <Text style={styles.value}>
          {request.offeredSkillId}
        </Text>

        <Text style={styles.label}>
          Requested Skill
        </Text>

        <Text style={styles.value}>
          {request.requestedSkillId}
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