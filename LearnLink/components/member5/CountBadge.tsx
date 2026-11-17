import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { m5Colors as colors } from "@/constants/member5Theme";

/**
 * Red unread badge for an icon. Place it inside the icon's (relatively positioned)
 * container; it sits at the top-right corner. Hidden when count is 0; "9+" above 9.
 */
export function CountBadge({ count, style }: { count: number; style?: StyleProp<ViewStyle> }) {
  if (count <= 0) return null;
  return (
    <View pointerEvents="none" style={[styles.badge, style]}>
      <Text style={styles.text}>{count > 9 ? "9+" : count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    top: 3,
    right: 1,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.error,
    borderWidth: 1.5,
    borderColor: colors.card,
  },
  text: { color: colors.white, fontSize: 10, fontWeight: "800" },
});
