import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";

import { ImportError, importFromHost } from "@/lib/api";
import { useTodos } from "@/store/todos";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="gap-1">
      <Text className="text-xs font-semibold tracking-wide uppercase text-neutral-500">
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
  const [syncing, setSyncing] = useState(false);

  const confirmReset = () => {
    Alert.alert("Clear all todos?", "This removes every local todo. Cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", style: "destructive", onPress: reset },
    ]);
  };

  const resync = async () => {
    if (!lastSync) return;
    setSyncing(true);
    try {
      const { imported, updated } = await importFromHost(lastSync.host);
      Alert.alert("Synced", `${imported} new, ${updated} updated.`);
    } catch (err) {
      const message =
        err instanceof ImportError ? err.message : "Something went wrong syncing.";
      Alert.alert("Sync failed", message);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <View className="flex-1 gap-6 p-4 bg-neutral-950">
      <Row
        label="Todos"
        value={`${count} stored locally`}
      />
      <Row
        label="Last sync"
        value={
          lastSync
            ? `${lastSync.host}\n${new Date(lastSync.at * 1000).toLocaleString()}`
            : "Never synced"
        }
      />

      <Pressable
        onPress={() => router.push("/scan")}
        className="items-center py-3 bg-blue-500 rounded-lg active:opacity-80">
        <Text className="font-semibold text-white">Scan QR to import</Text>
      </Pressable>

      {lastSync ? (
        <Pressable
          onPress={resync}
          disabled={syncing}
          className="flex-row gap-2 justify-center items-center py-3 rounded-lg border border-neutral-700 active:opacity-70">
          {syncing ? <ActivityIndicator color="#a3a3a3" /> : null}
          <Text className="font-semibold text-neutral-200">
            {syncing ? "Syncing…" : "Sync now from last host"}
          </Text>
        </Pressable>
      ) : null}

      <Pressable
        onPress={confirmReset}
        className="items-center py-3 rounded-lg border border-red-500/40 active:opacity-70">
        <Text className="font-semibold text-red-400">Clear all data</Text>
      </Pressable>

      <Text className="mt-auto text-xs text-neutral-600">
        Dooing syncs from the Neovim plugin over your local network. Run the plugin&apos;s
        share action to expose http://&lt;ip&gt;:7283, then scan the QR.
      </Text>
    </View>
  );
}
