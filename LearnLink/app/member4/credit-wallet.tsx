
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";

import {
  getCreditBalance,
  getCreditTransactions,
} from "../../services/member4/creditService";

import { getCurrentUserId } from "../../services/member4/currentUser";
import { CreditTransaction } from "../../types/member4/member4";

export default function CreditWalletScreen() {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadWallet = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");
      const currentUserId = getCurrentUserId();

      const [currentBalance, history] = await Promise.all([
        getCreditBalance(currentUserId),
        getCreditTransactions(currentUserId),
      ]);

      setBalance(currentBalance);
      setTransactions(history);
    } catch (err) {
      console.error("Failed to load credit wallet:", err);
      setError("Could not load your wallet. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadWallet();
    }, [loadWallet])
  );

  function getTransactionLabel(type: CreditTransaction["type"]) {
    switch (type) {
      case "EARN":
        return "Credits Earned";
      case "SPEND":
        return "Credits Spent";
      case "REFUND":
        return "Credit Refund";
      case "ADJUSTMENT":
        return "Balance Adjustment";
      default:
        return "Transaction";
    }
  }

  function renderTransaction({
    item,
  }: {
    item: CreditTransaction;
  }) {
    const isPositive =
      item.type === "EARN" || item.type === "REFUND";

    const dateValue =
      typeof item.createdAt?.toDate === "function"
        ? item.createdAt.toDate()
        : item.createdAt
          ? new Date(item.createdAt)
          : null;

    return (
      <View style={styles.transactionCard}>
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionTitle}>
            {getTransactionLabel(item.type)}
          </Text>

          <Text style={styles.description}>
            {item.description || "No description provided"}
          </Text>

          <Text style={styles.date}>
            {dateValue && !Number.isNaN(dateValue.getTime())
              ? dateValue.toLocaleString()
              : "Date unavailable"}
          </Text>
        </View>

        <Text
          style={[
            styles.amount,
            isPositive ? styles.positive : styles.negative,
          ]}
        >
          {isPositive ? "+" : "-"}
          {Math.abs(item.amount)} credits
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Loading credit wallet...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Credit Wallet</Text>

      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Available Credits</Text>
        <Text style={styles.balance}>{balance}</Text>
        <Text style={styles.balanceCaption}>
          Your current skill-exchange balance
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Transaction History</Text>

      {error ? (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : transactions.length === 0 ? (
        <FlatList
          data={[]}
          renderItem={renderTransaction}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <Text style={styles.empty}>
              No credit transactions yet.
            </Text>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadWallet(true)}
            />
          }
        />
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          renderItem={renderTransaction}
          contentContainerStyle={styles.transactionList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadWallet(true)}
            />
          }
        />
      )}
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
    padding: 20,
  },
  header: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
  },
  balanceCard: {
    padding: 24,
    borderRadius: 14,
    backgroundColor: "#1d4ed8",
    marginBottom: 28,
  },
  balanceLabel: {
    color: "#fff",
    fontSize: 16,
  },
  balance: {
    color: "#fff",
    fontSize: 42,
    fontWeight: "bold",
    marginTop: 8,
  },
  balanceCaption: {
    color: "#dbeafe",
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
  },
  transactionList: {
    paddingBottom: 24,
  },
  transactionCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    gap: 10,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  description: {
    marginTop: 4,
  },
  date: {
    color: "#777",
    fontSize: 12,
    marginTop: 6,
  },
  amount: {
    fontWeight: "bold",
    flexShrink: 0,
  },
  positive: {
    color: "#15803d",
  },
  negative: {
    color: "#b91c1c",
  },
  empty: {
    textAlign: "center",
    marginTop: 20,
    color: "#666",
  },
  error: {
    color: "#b91c1c",
    textAlign: "center",
  },
});
