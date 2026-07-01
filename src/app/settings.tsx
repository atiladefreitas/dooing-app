import { Alert, Pressable, Text, View } from 'react-native';

import { useTodos } from '@/store/todos';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="gap-1">
      <Text className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
        {label}
      </Text>
      <Text className="text-base text-neutral-200">{value}</Text>
    </View>
  );
}

export default function SettingsScreen() {
  const count = useTodos((s) => s.todos.length);
  const lastSync = useTodos((s) => s.lastSync);
  const reset = useTodos((s) => s.reset);

  const confirmReset = () => {
    Alert.alert('Clear all todos?', 'This removes every local todo. Cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: reset },
    ]);
  };

  return (
    <View className="flex-1 gap-6 bg-neutral-950 p-4">
      <Row label="Todos" value={`${count} stored locally`} />
      <Row
        label="Last sync"
        value={
          lastSync
            ? `${lastSync.host}\n${new Date(lastSync.at * 1000).toLocaleString()}`
            : 'Never synced'
        }
      />

      <Pressable
        onPress={confirmReset}
        className="items-center rounded-lg border border-red-500/40 py-3 active:opacity-70">
        <Text className="font-semibold text-red-400">Clear all data</Text>
      </Pressable>

      <Text className="mt-auto text-xs text-neutral-600">
        Dooing syncs from the Neovim plugin over your local network.
      </Text>
    </View>
  );
}
