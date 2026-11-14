import { Stack } from "expo-router";

export default function ReviewsLayout() {
  return (
    <Stack>
      <Stack.Screen name="give/[sessionId]" options={{ title: "Give Review" }} />
      <Stack.Screen name="[userId]" options={{ title: "View Reviews" }} />
    </Stack>
  );
}
