import React, { useCallback, useEffect, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  getIncomingRequests,
  getOutgoingRequests,
} from "../../services/member4/exchangeService";

import { getCurrentUserId } from "../../services/member4/currentUser";

import { ExchangeRequest } from "../../types/member4/member4";

export default function ExchangeRequestScreen() {
  const [incomingRequests, setIncomingRequests] = useState<ExchangeRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<ExchangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadRequests = useCallback(async (isRefresh = false) => {
  try {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    const currentUserId = getCurrentUserId();

    const [incoming, outgoing] = await Promise.all([
      getIncomingRequests(currentUserId),
      getOutgoingRequests(currentUserId),
    ]);

    setIncomingRequests(incoming);
    setOutgoingRequests(outgoing);
  } catch (error) {
    console.error("Failed to load exchange requests:", error);
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
}, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  // Reload requests when the user returns to this screen.
  useFocusEffect(
    useCallback(() => {
      loadRequests();
    }, [loadRequests])
  );

  function renderRequest({ item }: { item: ExchangeRequest }) {
    return (
      <TouchableOpacity
        style={styles.requestCard}
        activeOpacity={0.75}
        onPress={() =>
          router.push({
            pathname: "/member4/exchange-request-details",
            params: { requestId: item.id },
          })
        }
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Exchange Request</Text>
          <Text style={styles.status}>{item.status}</Text>
        </View>

        <Text style={styles.detail}>From: {item.senderId}</Text>
        <Text style={styles.detail}>To: {item.receiverId}</Text>

        {item.message ? (
          <Text style={styles.message}>{item.message}</Text>
        ) : null}

        <Text style={styles.openDetails}>Tap to view details →</Text>
      </TouchableOpacity>
    );
  }

  function renderEmpty(message: string) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyTitle}>{message}</Text>
        <Text style={styles.emptyDescription}>
          Exchange requests will appear here when available.
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Loading exchange requests...</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={[]}
      renderItem={() => null}
      keyExtractor={(_, index) => String(index)}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadRequests(true)}
        />
      }
      ListHeaderComponent={
        <View>
          <Text style={styles.header}>Exchange Requests</Text>
          <Text style={styles.subtitle}>
            Manage your incoming and outgoing skill exchanges.
          </Text>

          <TouchableOpacity
            style={styles.createButton}
            activeOpacity={0.8}
            onPress={() => router.push("/member4/create-exchange-request")}
          >
            <Text style={styles.createButtonText}>+ Create Exchange Request</Text>
          </TouchableOpacity>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Incoming Requests</Text>
            <Text style={styles.count}>{incomingRequests.length}</Text>
          </View>

          {incomingRequests.length === 0
            ? renderEmpty("No incoming requests")
            : incomingRequests.map((item) => (
                <View key={item.id}>{renderRequest({ item })}</View>
              ))}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Outgoing Requests</Text>
            <Text style={styles.count}>{outgoingRequests.length}</Text>
          </View>

          {outgoingRequests.length === 0
            ? renderEmpty("No outgoing requests")
            : outgoingRequests.map((item) => (
                <View key={item.id}>{renderRequest({ item })}</View>
              ))}
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  loadingText: {
    marginTop: 12,
    color: "#475569",
  },
  header: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#0F172A",
  },
  subtitle: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 6,
    marginBottom: 20,
    lineHeight: 21,
  },
  createButton: {
    backgroundColor: "#2563EB",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 24,
  },
  createButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "bold",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: "bold",
    color: "#0F172A",
  },
  count: {
    color: "#1D4ED8",
    backgroundColor: "#DBEAFE",
    overflow: "hidden",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontWeight: "bold",
  },
  requestCard: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0F172A",
    flexShrink: 1,
  },
  status: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#1D4ED8",
  },
  detail: {
    color: "#475569",
    marginBottom: 5,
    fontSize: 14,
  },
  message: {
    marginTop: 8,
    color: "#334155",
  },
  openDetails: {
    color: "#2563EB",
    marginTop: 12,
    fontWeight: "600",
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 18,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#334155",
  },
  emptyDescription: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 6,
    lineHeight: 19,
  },
});