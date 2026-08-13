import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";

import { ImportError, importFromHost } from "@/lib/api";
import { loadDemoData } from "@/lib/seed";
import { useBlocks } from "@/store/blocks";
import { useTodos } from "@/store/todos";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="gap-1">
      <Text className="text-xs font-semibold tracking-wide uppercase text-neutral-500">{label}</Text>
      <Text className="text-base text-neutral-200">{value}</Text>
    </View>
  );
}

export default function SettingsScreen() {
  const count = useTodos((s) => s.todos.length);
  const lastSync = useTodos((s) => s.lastSync);
  const reset = useTodos((s) => s.reset);
  const blockCount = useBlocks((s) => s.blocks.length);
  const resetBlocks = useBlocks((s) => s.reset);
  const [syncing, setSyncing] = useState(false);

  const confirmReset = () => {
    Alert.alert(
      "Clear all data?",
      "This removes every local todo and time block. Cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => {
            reset();
            resetBlocks();
          },
        },
      ],
    );
  };

  const loadDemo = () => {
    Alert.alert(
      "Load test data?",
      "Adds a sample set of todos and time blocks covering every field, status, priority, recurrence type and overlap case. Existing data is kept.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Load",
          onPress: () => {
            const { todos, blocks } = loadDemoData();
            Alert.alert("Test data loaded", `${todos} todos and ${blocks} time blocks added.`);
          },
        },
      ],
    );
  };

  const resync = async () => {
    if (!lastSync) return;
    setSyncing(true);
    try {
      const summary = await importFromHost(lastSync.host);
      const blocks = summary.blocksAvailable
        ? `\n${summary.blocksImported} new, ${summary.blocksUpdated} updated time blocks.`
        : "\nNo /blocks endpoint on this host.";
      Alert.alert("Synced", `${summary.imported} new, ${summary.updated} updated todos.${blocks}`);
    } catch (err) {
      const message = err instanceof ImportError ? err.message : "Something went wrong syncing.";
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
        label="Time blocks"
        value={`${blockCount} stored locally`}
      />
      <Row
        label="Last sync"
        value={lastSync ? `${lastSync.host}\n${new Date(lastSync.at * 1000).toLocaleString()}` : "Never synced"}
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
          className="flex-row gap-2 justify-center items-center py-3 rounded-lg border active:opacity-70 border-neutral-700">
          {syncing ? <ActivityIndicator color="#a3a3a3" /> : null}
          <Text className="font-semibold text-neutral-200">{syncing ? "Syncing…" : "Sync now from last host"}</Text>
        </Pressable>
      ) : null}

      <Pressable
        onPress={loadDemo}
        className="items-center py-3 rounded-lg border active:opacity-70 border-neutral-700">
        <Text className="font-semibold text-neutral-200">Load test data</Text>
      </Pressable>

      <Pressable
        onPress={confirmReset}
        className="items-center py-3 rounded-lg border active:opacity-70 border-red-500/40">
        <Text className="font-semibold text-red-400">Clear all data</Text>
      </Pressable>

      <Text className="mt-auto text-xs text-neutral-600">
        Dooing syncs from the Neovim plugin over your local network. Run the plugin&apos;s share action to expose
        http://&lt;ip&gt;:7283, then scan the QR.
      </Text>
    </View>
  );
}
