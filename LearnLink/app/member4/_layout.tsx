
import { Stack } from "expo-router";

import { StudentRouteGuard } from "@/components/auth/StudentRouteGuard";

export default function Member4Layout() {
  return (
    <StudentRouteGuard>
      <Stack>
        <Stack.Screen
          name="exchange-requests"
          options={{ title: "Exchange Requests" }}
        />

        <Stack.Screen
          name="exchange-request-details"
          options={{ title: "Request Details" }}
        />

        <Stack.Screen
          name="create-exchange-request"
          options={{ title: "Create Request" }}
        />

        <Stack.Screen
          name="my-exchanges"
          options={{ title: "My Exchanges" }}
        />

        <Stack.Screen
          name="schedule-session"
          options={{ title: "Schedule Session" }}
        />

        <Stack.Screen
          name="sessions"
          options={{ title: "My Sessions" }}
        />

        <Stack.Screen
          name="session-details"
          options={{ title: "Session Details" }}
        />

        <Stack.Screen
          name="credit-wallet"
          options={{ title: "Credit Wallet" }}
        />
      </Stack>
    </StudentRouteGuard>
  );
}
