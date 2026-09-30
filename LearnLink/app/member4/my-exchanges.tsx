import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  getIncomingRequests,
  getOutgoingRequests,
} from "../../services/member4/exchangeService";

import { ExchangeRequest } from "../../types/member4/member4";

export default function MyExchangesScreen() {
  const [ exchanges, setExchanges ] = useState<ExchangeRequest[]>([]);
  const [ loading, setLoading ] = useState(true);

  //TEMOPORARY USER ID
  const currentUserId = "TEST_USER_ID";

  useEffect(() => {
    loadExchanges();
  }, []);

  //Data loading function
  async function loadExchanges() {
    try {
      setLoading(true);

      const incoming = await getIncomingRequests(currentUserId);
      const outgoing = await getOutgoingRequests(currentUserId);

      //Combine incoming and outgoing requests
      const allExchanges = [...incoming, ...outgoing];

       //Remove duplicates
      const uniqueExchanges = Array.from(
        new Map(
          allExchanges.map((exchange) => [
            exchange.id,
            exchange,
          ])
        ).values()
      );
      setExchanges(uniqueExchanges);
    } catch (error) {
      console.error("Error loading exchanges:", error);
    } finally {
      setLoading(false);
    }
  }

  //Render function for each exchange
  function renderExchange({ item }: { item: ExchangeRequest }) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Exchange</Text>
        <Text>From: {item.senderId}</Text>
        <Text>To: {item.receiverId}</Text>
        <Text>Offered Skill: {item.offeredSkillId}</Text>
        <Text>Requested Skill: {item.requestedSkillId}</Text>
        <Text style={styles.status}>Status: {item.status}</Text>
        {item.message?(
          <Text>Message : {item.message}</Text>
        ):null}
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large"/>
        <Text>Loading exchanges...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>
        My Exchanges
      </Text>

      {exchanges.length === 0 ? (
        <Text style={styles.empty}>
          You don't have any exchanges yet.
        </Text>
      ) : (
        <FlatList
          data={exchanges}
          keyExtractor={(item) => item.id}
          renderItem={renderExchange}
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
  },

  header: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
  },

  card: {
    padding: 15,
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 12,
  },

  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },

  status: {
    fontWeight: "bold",
    marginTop: 8,
    marginBottom: 5,
  },

  empty: {
    fontSize: 16,
  },
});
   