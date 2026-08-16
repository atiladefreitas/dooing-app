import '@/global.css';

import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
// Per-weight subpaths, NOT the package root. The root index require()s every
// weight and italic at module scope, so importing it bundles ~2MB of unused TTFs.
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono/400Regular';
import { JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono/500Medium';
import { JetBrainsMono_700Bold } from '@expo-google-fonts/jetbrains-mono/700Bold';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import { useCallback, useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';

import { AnimatedSplash } from '@/components/animated-splash';
import { Font, useThemeColors } from '@/constants/theme';
import { useBlocks } from '@/store/blocks';
import { useTheme } from '@/store/theme';
import { useTodos } from '@/store/todos';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const hydrated = useTodos((s) => s.hydrated);
  const blocksHydrated = useBlocks((s) => s.hydrated);
  const themeHydrated = useTheme((s) => s.hydrated);
  const { colorScheme } = useColorScheme();
  const c = useThemeColors();
  const [splashDone, setSplashDone] = useState(false);
  const finishSplash = useCallback(() => setSplashDone(true), []);

  const [fontsLoaded, fontError] = useFonts({
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    JetBrainsMono_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  // Hold the splash until stores AND fonts are ready, so the first frame is not
  // a flash of system type in the wrong theme. A font error still releases it —
  // shipping fallback type beats hanging on the splash forever.
  const ready = hydrated && blocksHydrated && themeHydrated && (fontsLoaded || !!fontError);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: c.canvas }}>
      <KeyboardProvider>
        <BottomSheetModalProvider>
          {/* The splash backdrop is always dark, so the bar stays light until it clears. */}
          <StatusBar style={!splashDone || colorScheme === 'dark' ? 'light' : 'dark'} />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: c.canvas },
              headerTintColor: c.fg,
              headerTitleStyle: { fontFamily: Font.monoMedium, fontSize: 15 },
              headerShadowVisible: false,
              contentStyle: { backgroundColor: c.canvas },
            }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="todo/[id]" options={{ title: 'edit todo' }} />
            <Stack.Screen name="scan" options={{ presentation: 'modal', headerShown: false }} />
            <Stack.Screen name="settings" options={{ title: 'settings' }} />
          </Stack>
        </BottomSheetModalProvider>
      </KeyboardProvider>

      {/* The app renders (and settles) UNDER the splash, so the fade-out reveals
          a finished first frame instead of catching layout mid-flight. */}
      {!splashDone ? <AnimatedSplash onDone={finishSplash} /> : null}
    </GestureHandlerRootView>
  );
}
