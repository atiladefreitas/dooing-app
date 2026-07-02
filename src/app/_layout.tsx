import '@/global.css';

import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useTodos } from '@/store/todos';

SplashScreen.preventAutoHideAsync();

const BG = '#0a0a0a';

export default function RootLayout() {
  const hydrated = useTodos((s) => s.hydrated);

  useEffect(() => {
    if (hydrated) SplashScreen.hideAsync();
  }, [hydrated]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: BG },
            headerTintColor: '#fff',
            headerShadowVisible: false,
            contentStyle: { backgroundColor: BG },
          }}>
          <Stack.Screen name="index" options={{ title: 'Dooing' }} />
          <Stack.Screen name="todo/[id]" options={{ title: 'Edit todo' }} />
          <Stack.Screen
            name="scan"
            options={{ presentation: 'modal', headerShown: false }}
          />
          <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        </Stack>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}
