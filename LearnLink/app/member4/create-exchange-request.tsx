import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { createExchangeRequest } from '../../services/member4/exchangeService';
import { ExchangeType } from "../../types/member4/member4";

export default function CreateExchangeRequest() {
  const [receiverId, setReceiverId] = useState('');
  const [offeredSkillId, setOfferedSkillId] = useState('');
  const [requestedSkillId, setRequestedSkillId] = useState('');
  const [creditAmount, setCreditAmount] = useState('0');
  const [message, setMessage] = useState('');
  const [exchangeType, setExchangeType] = useState<ExchangeType>('DIRECT');
  const [loading, setLoading] = useState(false);

  //TEMPORARY USERID
  const senderId = 'TEST_USER_ID'; 

  //Submit function
  async function handleSubmit() {
    //Validation
    if (!receiverId.trim() || !offeredSkillId.trim() || !requestedSkillId.trim()) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

  //Preventing self sending
  if(receiverId.trim()=== senderId){
    Alert.alert(
      "Invalid request",
      "You cannot send an exchange request to yourself."
    );
    return;
  } 
  
  try{
    setLoading(true);

    await createExchangeRequest({
      senderId:senderId.trim(),
      receiverId: receiverId.trim(),
      exchangeType,
      offeredSkillId: offeredSkillId.trim(),
      requestedSkillId: requestedSkillId.trim(),
      creditAmount:
         exchangeType === "CREDIT" ?
         Number(creditAmount) || 0 :
         0,
      message: message.trim(),
      status: "PENDING",
    });

    Alert.alert('Success', 'Exchange request sent successfully.',
      [
        {
          text: 'OK',
          onPress:()=>{
            router.back();
          },
        },
      ]
    );

  }catch(error){
    console.error('Error creating exchange request:', error);

    Alert.alert('Error', 'Failed to send exchange request. Please try again.');
  }finally{
    setLoading(false);
  }
}

return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.header}>
        Create Exchange Request
      </Text>

      <Text style={styles.label}>
        Student ID
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Enter student ID"
        value={receiverId}
        onChangeText={setReceiverId}
        autoCapitalize="none"
      />

      <Text style={styles.label}>
        Skill You Offer
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Enter offered skill ID"
        value={offeredSkillId}
        onChangeText={setOfferedSkillId}
        autoCapitalize="none"
      />

      <Text style={styles.label}>
        Skill You Want
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Enter requested skill ID"
        value={requestedSkillId}
        onChangeText={setRequestedSkillId}
        autoCapitalize="none"
      />

      <Text style={styles.label}>
        Exchange Type
      </Text>

      <View style={styles.typeContainer}>
        <TouchableOpacity
          style={[
            styles.typeButton,
            exchangeType === "DIRECT" &&
              styles.selectedType,
          ]}
          onPress={() => setExchangeType("DIRECT")}
        >
          <Text>Direct Skill Swap</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.typeButton,
            exchangeType === "CREDIT" &&
              styles.selectedType,
          ]}
          onPress={() => setExchangeType("CREDIT")}
        >
          <Text>Credit Exchange</Text>
        </TouchableOpacity>
      </View>

      {exchangeType === "CREDIT" && (
        <>
          <Text style={styles.label}>
            Credit Amount
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Enter credit amount"
            value={creditAmount}
            onChangeText={setCreditAmount}
            keyboardType="numeric"
          />
        </>
      )}

      <Text style={styles.label}>
        Message
      </Text>

      <TextInput
        style={[styles.input, styles.messageInput]}
        placeholder="Write a message..."
        value={message}
        onChangeText={setMessage}
        multiline
        numberOfLines={4}
      />

      <TouchableOpacity
        style={styles.submitButton}
        onPress={handleSubmit}
        disabled={loading}
      >
        <Text style={styles.submitText}>
          {loading
            ? "Sending..."
            : "Send Exchange Request"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  content: {
    padding: 20,
  },

  header: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 25,
  },

  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 15,
  },

  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },

  messageInput: {
    height: 100,
    textAlignVertical: "top",
  },

  typeContainer: {
    flexDirection: "row",
    gap: 10,
  },

  typeButton: {
    flex: 1,
    padding: 14,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: "center",
  },

  selectedType: {
    borderWidth: 2,
  },

  submitButton: {
    marginTop: 30,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: "#222",
  },

  submitText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});