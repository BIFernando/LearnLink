import { Slot } from "expo-router";

import { StudentRouteGuard } from "@/components/auth/StudentRouteGuard";

export default function StudentsLayout() {
  return (
    <StudentRouteGuard>
      <Slot />
    </StudentRouteGuard>
  );
}
