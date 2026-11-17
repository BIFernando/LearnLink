import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { getSkillName } from '../../services/chatService';
import { createExchangeRequest } from '../../services/member4/exchangeService';
import {
  displayNameOf,
  useUserProfiles,
} from '../../services/member5/userService';
import { ExchangeType } from "../../types/member4/member4";
import { getCurrentUserId } from "../../services/member4/currentUser";
import { CREDITS_PER_SESSION } from "../../services/member4/creditService";

export default function CreateExchangeRequest() {
  const params = useLocalSearchParams<{
    receiverId?: string;
    receiverName?: string;
    offeredSkillId?: string;
    offeredSkillName?: string;
    requestedSkillId?: string;
    requestedSkillName?: string;
  }>();
  const [receiverId, setReceiverId] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [offeredSkillId, setOfferedSkillId] = useState('');
  const [offeredSkillName, setOfferedSkillName] = useState('');
  const [requestedSkillId, setRequestedSkillId] = useState('');
  const [requestedSkillName, setRequestedSkillName] = useState('');
  const [message, setMessage] = useState('');
  const [exchangeType, setExchangeType] = useState<ExchangeType>('DIRECT');
  const [loading, setLoading] = useState(false);
  const userProfiles = useUserProfiles(receiverId ? [receiverId] : []);
  const [resolvedSkillNames, setResolvedSkillNames] = useState<
    Record<string, string | null>
  >({});

  useEffect(() => {
    if (typeof params.receiverId === "string") {
      setReceiverId(params.receiverId);
    }
    if (typeof params.receiverName === "string") {
      setReceiverName(params.receiverName);
    }
    if (typeof params.offeredSkillId === "string") {
      setOfferedSkillId(params.offeredSkillId);
    }
    if (typeof params.offeredSkillName === "string") {
      setOfferedSkillName(params.offeredSkillName);
    }
    if (typeof params.requestedSkillId === "string") {
      setRequestedSkillId(params.requestedSkillId);
    }
    if (typeof params.requestedSkillName === "string") {
      setRequestedSkillName(params.requestedSkillName);
    }
  }, [
    params.offeredSkillId,
    params.offeredSkillName,
    params.receiverId,
    params.receiverName,
    params.requestedSkillId,
    params.requestedSkillName,
  ]);

  useEffect(() => {
    let active = true;
    const skillIds = [
      ...new Set(
        [
          ...(offeredSkillId &&
          (!offeredSkillName.trim() || offeredSkillName.trim() === offeredSkillId)
            ? [offeredSkillId]
            : []),
          ...(requestedSkillId &&
          (!requestedSkillName.trim() ||
            requestedSkillName.trim() === requestedSkillId)
            ? [requestedSkillId]
            : []),
        ]
      ),
    ];

    Promise.all(
      skillIds.map(async (skillId) => [skillId, await getSkillName(skillId)] as const)
    )
      .then((entries) => {
        if (active) {
          setResolvedSkillNames((current) => ({
            ...current,
            ...Object.fromEntries(entries),
          }));
        }
      })
      .catch((error: unknown) => {
        console.error("Failed to load selected skill names:", error);
        if (active) {
          setResolvedSkillNames((current) => ({
            ...current,
            ...Object.fromEntries(skillIds.map((skillId) => [skillId, null])),
          }));
        }
      });

    return () => {
      active = false;
    };
  }, [
    offeredSkillId,
    offeredSkillName,
    requestedSkillId,
    requestedSkillName,
  ]);

  function getReceiverDisplayName(): string {
    if (!receiverId) return "No student selected.";
    if (!Object.prototype.hasOwnProperty.call(userProfiles, receiverId)) {
      return receiverName && receiverName !== receiverId
        ? receiverName
        : "Loading student...";
    }

    const profile = userProfiles[receiverId];
    const profileName = displayNameOf(profile);
    return profileName === "LearnLink Peer" &&
      receiverName &&
      receiverName !== receiverId
      ? receiverName
      : profileName;
  }

  function getSkillDisplayName(skillId: string, providedName: string): string {
    if (!skillId) return "No skill selected.";

    const friendlyProvidedName =
      providedName.trim() && providedName.trim() !== skillId
        ? providedName.trim()
        : null;
    if (friendlyProvidedName) return friendlyProvidedName;

    if (!Object.prototype.hasOwnProperty.call(resolvedSkillNames, skillId)) {
      return "Loading skill...";
    }
    return resolvedSkillNames[skillId] ?? "Skill unavailable";
  }

  //Submit function
  async function handleSubmit() {
    //Validation
    if (!receiverId.trim() || !offeredSkillId.trim() || !requestedSkillId.trim()) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }
    const senderId = getCurrentUserId();
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
   exchangeType === "CREDIT"
     ? CREDITS_PER_SESSION
     : 0,
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

      <View style={styles.selectionCard}>
        <Text style={styles.label}>Student</Text>
        <Text style={styles.selectionValue}>{getReceiverDisplayName()}</Text>

        <Text style={styles.label}>Skill You Offer</Text>
        <Text style={styles.selectionValue}>
          {getSkillDisplayName(offeredSkillId, offeredSkillName)}
        </Text>

        <Text style={styles.label}>Skill You Want</Text>
        <Text style={styles.selectionValue}>
          {getSkillDisplayName(requestedSkillId, requestedSkillName)}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.selectionButton}
        onPress={() => router.push("/explore")}
      >
        <Text style={styles.selectionButtonText}>
          {receiverId ? "Choose a different student or skill" : "Browse students and skills"}
        </Text>
      </TouchableOpacity>

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

  selectionCard: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
  },

  selectionValue: {
    fontSize: 16,
    marginBottom: 4,
  },

  selectionButton: {
    alignSelf: "flex-start",
    marginTop: 12,
    paddingVertical: 8,
  },

  selectionButtonText: {
    color: "#2563EB",
    fontWeight: "600",
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