import { Stack } from "expo-router";

import { StudentRouteGuard } from "@/components/auth/StudentRouteGuard";

export default function ReviewsLayout() {
  return (
    <StudentRouteGuard>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="give/[sessionId]" options={{ title: "Give Review" }} />
        <Stack.Screen name="[userId]" options={{ title: "View Reviews" }} />
      </Stack>
    </StudentRouteGuard>
  );
}
