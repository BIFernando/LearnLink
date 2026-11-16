import { Stack } from "expo-router";

import { StudentRouteGuard } from "@/components/auth/StudentRouteGuard";

export default function NotificationsLayout() {
  return (
    <StudentRouteGuard>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ title: "Notifications" }} />
      </Stack>
    </StudentRouteGuard>
  );
}
