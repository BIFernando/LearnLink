import { Pressable, StyleSheet, Text } from "react-native";
import { useRouter } from "expo-router";

import type { ReportTargetType } from "../../types/reports";

interface ReportActionButtonProps {
  targetType: ReportTargetType;
  targetId: string;
  label: string;
}

export function ReportActionButton({
  targetType,
  targetId,
  label,
}: ReportActionButtonProps) {
  const router = useRouter();

  return (
    <Pressable
      accessibilityRole="button"
      disabled={!targetId}
      onPress={() =>
        router.push({
          pathname: "/reports/new",
          params: { targetType, targetId },
        })
      }
      style={({ pressed }) => [
        styles.button,
        pressed && styles.pressed,
        !targetId && styles.disabled,
      ]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderColor: "#CBD5E1",
    borderRadius: 9,
    borderWidth: 1,
    justifyContent: "center",
    marginTop: 10,
    minHeight: 44,
    paddingHorizontal: 14,
  },
  pressed: {
    backgroundColor: "#F1F5F9",
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    color: "#475569",
    fontSize: 14,
    fontWeight: "600",
  },
});
