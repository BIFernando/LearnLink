import { Stack } from "expo-router";

export default function AdminLayout() {
  return (
    <Stack>
      <Stack.Screen name="login" options={{ title: "Admin Login" }} />
      <Stack.Screen
        name="(protected)"
        options={{ headerShown: false }}
      />
     
    </Stack>
  );
}
