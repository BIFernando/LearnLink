import React, { useEffect, useState} from "react";
import{
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  getIncomingRequests,
  getOutgoingRequests,
} from "../../services/member4/exchangeService";

import {ExchangeRequest} from "../../types/member4/member4";

export default function ExchangeRequestScreen(){

  const [incomingRequests, setIncomingRequests] = useState<ExchangeRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests]=useState<ExchangeRequest[]>([]);
  const [loading,setLoading] =useState(true);

  //TEMPORARY USER ID
  const currentUserId= "TEST_USER_ID";

  useEffect(()=>{
    loadRequests();
  },[]);

  //Data loading function
  async function loadRequests(){
    try{
      setLoading(true);

      const incoming = await getIncomingRequests(currentUserId);
      const outgoing = await getOutgoingRequests(currentUserId);

      setIncomingRequests(incoming);
      setOutgoingRequests(outgoing);
    }catch(error){
      console.error("Failed to load exchange requests: ", error);
    }finally{
      setLoading(false);
    }
  }

  //Render function for each request
  function renderRequest({item}:{item: ExchangeRequest}){
    return(
      <TouchableOpacity style={styles.card}>
        <Text style={styles.title}>Exchange Request</Text>
        <Text>From: {item.senderId}</Text>
        <Text>To: {item.receiverId}</Text>
        <Text>Status {item.status}</Text>
        <Text>Message {item.message}</Text>
      </TouchableOpacity>
    );
  }

  //Loading state
  if(loading){
    return(
      <View style={styles.center}>
        <ActivityIndicator size="large"/>
        <Text>Loading requests...</Text>
      </View>
    );
  }

  //Main UI
  return(
    <View style={styles.container}>
      <Text style={styles.header}>Exchange Requests</Text>
      <Text style={styles.sectionTitle}>Incoming Requests</Text>

      {/*Conditional rendering for incoming requests*/}
      {incomingRequests.length===0 ? (
        <Text style={styles.empty}>No incoming requests</Text>
      ):(
        <FlatList
        data={incomingRequests}
        keyExtractor={(item)=>item.id}
        renderItem={renderRequest}/>
      )}

      <Text style={styles.sectionTitle}>Outgoing Requests</Text>
      
      {/*Conditional rendering for outgoing requests*/}
      {outgoingRequests.length===0 ? (
        <Text style={styles.empty}>No outgoing requests</Text>
      ):(
        <FlatList
        data={outgoingRequests}
        keyExtractor={(item)=>item.id}
        renderItem={renderRequest}/>
      )}

    </View>
  )
}

//Styles
const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { fontSize: 28, fontWeight: "bold", marginBottom: 20 },
  sectionTitle: { fontSize: 20, fontWeight: "bold", marginTop: 15, marginBottom: 10 },
  card: { padding: 15, borderWidth: 1, borderRadius: 10, marginBottom: 10 },
  title: { fontSize: 17, fontWeight: "bold", marginBottom: 8 },
  empty: { marginBottom: 10 },
});
