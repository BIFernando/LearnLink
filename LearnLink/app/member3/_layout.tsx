import { Stack } from "expo-router";

import { StudentRouteGuard } from "@/components/auth/StudentRouteGuard";

export default function Member3Layout() {
  return (
    <StudentRouteGuard>
      <Stack />
    </StudentRouteGuard>
  );
}
