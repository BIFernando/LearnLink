import { Stack } from "expo-router";

export default function ChatLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Chats" }} />
      <Stack.Screen name="new" options={{ title: "New Chat" }} />
      <Stack.Screen name="[conversationId]" options={{ title: "Conversation" }} />
    </Stack>
  );
}
