import { Stack } from "expo-router";

import { StudentRouteGuard } from "@/components/auth/StudentRouteGuard";

export default function ReportsLayout() {
  return (
    <StudentRouteGuard>
      <Stack screenOptions={{ headerShown: false }} />
    </StudentRouteGuard>
  );
}
