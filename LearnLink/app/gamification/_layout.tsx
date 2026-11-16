import { Stack } from "expo-router";

import { StudentRouteGuard } from "@/components/auth/StudentRouteGuard";

export default function GamificationLayout() {
  return (
    <StudentRouteGuard>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ title: "XP & Progress" }} />
        <Stack.Screen name="badges" options={{ title: "Badges" }} />
        <Stack.Screen name="leaderboard" options={{ title: "Leaderboard" }} />
        <Stack.Screen name="challenges/index" options={{ title: "Challenges" }} />
        <Stack.Screen name="challenges/[challengeId]" options={{ title: "Daily Challenge" }} />
      </Stack>
    </StudentRouteGuard>
  );
}
