import { Slot } from "expo-router";

import { StudentRouteGuard } from "@/components/auth/StudentRouteGuard";

export default function SkillsLayout() {
  return (
    <StudentRouteGuard>
      <Slot />
    </StudentRouteGuard>
  );
}
