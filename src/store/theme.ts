import AsyncStorage from '@react-native-async-storage/async-storage';
import { colorScheme } from 'nativewind';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * Appearance preference — see DESIGN.md §6.
 *
 * NativeWind's own colorScheme is in-memory only, so the choice is persisted here
 * and re-applied on rehydrate. `system` defers to the OS and keeps tracking it.
 */
export type Appearance = 'system' | 'night' | 'light';

const NATIVEWIND_SCHEME: Record<Appearance, 'system' | 'dark' | 'light'> = {
  system: 'system',
  night: 'dark',
  light: 'light',
};

interface ThemeState {
  appearance: Appearance;
  hydrated: boolean;
  setAppearance: (next: Appearance) => void;
}

/** Push the preference into NativeWind. Requires `darkMode: 'class'` or this throws. */
function apply(appearance: Appearance) {
  colorScheme.set(NATIVEWIND_SCHEME[appearance]);
}

export const useTheme = create<ThemeState>()(
  persist(
    (set) => ({
      appearance: 'system',
      hydrated: false,

      setAppearance: (next) => {
        apply(next);
        set({ appearance: next });
      },
    }),
    {
      name: 'dooing-theme',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ appearance: s.appearance }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // Persisted value only reaches NativeWind once storage has been read —
        // until then the app renders at the OS default.
        apply(state.appearance);
        state.hydrated = true;
      },
    }
  )
);
