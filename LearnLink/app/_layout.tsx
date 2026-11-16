import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { NotificationBanner } from '@/components/member5/NotificationBanner';
import { LearnLinkNavigation } from '@/components/navigation/LearnLinkNavigation';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider } from '@/providers/AuthProvider';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <ThemeProvider
        value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
      >
        <LearnLinkNavigation />
        <NotificationBanner />
        <StatusBar style="auto" />
      </ThemeProvider>
    </AuthProvider>
  );
}
