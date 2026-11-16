import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import type { ComponentProps, ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { m5Colors as c, m5Radius, m5Spacing } from "@/constants/member5Theme";

export type IoniconName = ComponentProps<typeof Ionicons>["name"];

// ============================================
// Screen states
// ============================================

export function LoadingState({ label }: { label?: string }) {
  return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color={c.primary} />
      {label ? <Text style={styles.stateText}>{label}</Text> : null}
    </View>
  );
}

export function EmptyState({
  icon = "file-tray-outline",
  title,
  message,
  action,
}: {
  icon?: IoniconName;
  title: string;
  message?: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.centered}>
      <View style={styles.stateIcon}>
        <Ionicons name={icon} size={28} color={c.primary} />
      </View>
      <Text style={styles.stateTitle}>{title}</Text>
      {message ? <Text style={styles.stateText}>{message}</Text> : null}
      {action}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.centered}>
      <View style={[styles.stateIcon, { backgroundColor: c.errorSoft }]}>
        <Ionicons name="alert-circle-outline" size={28} color={c.error} />
      </View>
      <Text style={styles.stateTitle}>Something went wrong</Text>
      <Text style={styles.stateText}>{message}</Text>
      {onRetry ? <Button label="Try again" variant="soft" onPress={onRetry} /> : null}
    </View>
  );
}

// ============================================
// Building blocks
// ============================================

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Avatar({
  uri,
  name,
  size = 48,
  online,
}: {
  uri?: string | null;
  name?: string;
  size?: number;
  online?: boolean;
}) {
  const initials = (name ?? "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <View style={{ width: size, height: size }}>
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          contentFit="cover"
        />
      ) : (
        <View
          style={[
            styles.avatarFallback,
            { width: size, height: size, borderRadius: size / 2 },
          ]}
        >
          <Text style={[styles.avatarInitials, { fontSize: size * 0.36 }]}>{initials || "?"}</Text>
        </View>
      )}
      {online ? <View style={styles.onlineDot} /> : null}
    </View>
  );
}

type ChipTone = "primary" | "mint" | "peach" | "neutral";

const chipTones: Record<ChipTone, { bg: string; fg: string }> = {
  primary: { bg: c.primarySoft, fg: c.primary },
  mint: { bg: c.mint, fg: "#08433D" },
  peach: { bg: c.peach, fg: c.amber },
  neutral: { bg: c.background, fg: c.textSecondary },
};

export function Chip({
  label,
  tone = "primary",
  icon,
  selected,
  onPress,
  disabled,
}: {
  label: string;
  tone?: ChipTone;
  icon?: IoniconName;
  selected?: boolean;
  onPress?: () => void;
  disabled?: boolean;
}) {
  const colors = selected ? { bg: c.primary, fg: c.white } : chipTones[tone];
  const content = (
    <View
      style={[
        styles.chip,
        { backgroundColor: colors.bg, opacity: disabled ? 0.45 : 1 },
      ]}
    >
      {icon ? <Ionicons name={icon} size={14} color={colors.fg} /> : null}
      <Text style={[styles.chipText, { color: colors.fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );

  if (!onPress) return content;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
    >
      {content}
    </Pressable>
  );
}

export function ProgressBar({
  progress,
  color = c.primary,
  track = c.primarySoft,
  height = 8,
}: {
  progress: number;
  color?: string;
  track?: string;
  height?: number;
}) {
  const clamped = Math.min(1, Math.max(0, progress));
  return (
    <View style={{ height, borderRadius: height, backgroundColor: track, overflow: "hidden" }}>
      <View style={{ width: `${clamped * 100}%`, height, borderRadius: height, backgroundColor: color }} />
    </View>
  );
}

export function Button({
  label,
  onPress,
  icon,
  variant = "primary",
  disabled,
  loading,
  style,
}: {
  label: string;
  onPress: () => void;
  icon?: IoniconName;
  variant?: "primary" | "soft" | "teal" | "ghost";
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const palette = {
    primary: { bg: c.primary, fg: c.white },
    soft: { bg: c.primarySoft, fg: c.primary },
    teal: { bg: c.teal, fg: c.white },
    ghost: { bg: "transparent", fg: c.textSecondary },
  }[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: palette.bg, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={palette.fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={18} color={palette.fg} /> : null}
          <Text style={[styles.buttonText, { color: palette.fg }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

export function StarRating({
  value,
  size = 18,
  onChange,
}: {
  value: number;
  size?: number;
  onChange?: (value: number) => void;
}) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((star) => {
        const name: IoniconName =
          value >= star ? "star" : value >= star - 0.5 ? "star-half" : "star-outline";
        const icon = <Ionicons name={name} size={size} color={c.star} />;
        return onChange ? (
          <Pressable
            key={star}
            onPress={() => onChange(star)}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={`${star} star${star > 1 ? "s" : ""}`}
            style={{ marginHorizontal: size * 0.12 }}
          >
            {icon}
          </Pressable>
        ) : (
          <View key={star}>{icon}</View>
        );
      })}
    </View>
  );
}

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action}
    </View>
  );
}

export function IconBubble({
  icon,
  bg = c.primarySoft,
  fg = c.primary,
  size = 44,
}: {
  icon: IoniconName;
  bg?: string;
  fg?: string;
  size?: number;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons name={icon} size={size * 0.48} color={fg} />
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: m5Spacing.xl,
    gap: m5Spacing.sm,
    backgroundColor: c.background,
  },
  stateIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: c.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: m5Spacing.xs,
  },
  stateTitle: { fontSize: 17, fontWeight: "700", color: c.textPrimary, textAlign: "center" },
  stateText: { fontSize: 14, color: c.textSecondary, textAlign: "center", marginBottom: m5Spacing.sm },
  card: {
    backgroundColor: c.card,
    borderRadius: m5Radius.lg,
    padding: m5Spacing.lg,
    shadowColor: "#1A1B2E",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  avatarFallback: { backgroundColor: c.primary, alignItems: "center", justifyContent: "center" },
  avatarInitials: { color: c.white, fontWeight: "700" },
  onlineDot: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: c.online,
    borderWidth: 2,
    borderColor: c.white,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: m5Radius.pill,
    alignSelf: "flex-start",
  },
  chipText: { fontSize: 13, fontWeight: "600" },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: m5Radius.md,
  },
  buttonText: { fontSize: 15, fontWeight: "700" },
  row: { flexDirection: "row", alignItems: "center" },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: m5Spacing.sm,
  },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: c.textPrimary },
});
