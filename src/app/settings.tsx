import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";

import { Type, useThemeColors } from "@/constants/theme";
import { ImportError, importFromHost } from "@/lib/api";
import { loadDemoData } from "@/lib/seed";
import { useBlocks } from "@/store/blocks";
import { Appearance, useTheme } from "@/store/theme";
import { useTodos } from "@/store/todos";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="gap-1">
      <Text className="text-xs font-semibold tracking-wide uppercase text-fg-muted">{label}</Text>
      <Text className="text-base text-fg">{value}</Text>
    </View>
  );
}

const APPEARANCES: Appearance[] = ["system", "night", "light"];

function AppearanceControl() {
  const appearance = useTheme((s) => s.appearance);
  const setAppearance = useTheme((s) => s.setAppearance);

  return (
    <View>
      <Text
        style={Type.section}
        className="text-fg-muted">
        appearance
      </Text>
      <View className="my-2 border-t border-line" />
      {APPEARANCES.map((option) => {
        const active = appearance === option;
        return (
          <Pressable
            key={option}
            hitSlop={8}
            onPress={() => setAppearance(option)}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            className="flex-row gap-2 items-center py-2 active:bg-elevated">
            <Text
              style={Type.marker}
              className={active ? "text-accent" : "text-fg-muted"}>
              {active ? "[•]" : "[ ]"}
            </Text>
            <Text
              style={Type.meta}
              className={active ? "text-fg" : "text-fg-dim"}>
              {option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function SettingsScreen() {
  const c = useThemeColors();
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
    <View className="flex-1 gap-6 p-4 bg-canvas">
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

      <AppearanceControl />

      <Pressable
        onPress={() => router.push("/scan")}
        className="items-center py-3 bg-accent rounded-lg active:opacity-80">
        <Text className="font-semibold text-canvas">Scan QR to import</Text>
      </Pressable>

      {lastSync ? (
        <Pressable
          onPress={resync}
          disabled={syncing}
          className="flex-row gap-2 justify-center items-center py-3 rounded-lg border active:opacity-70 border-line">
          {syncing ? <ActivityIndicator color={c.fgMuted} /> : null}
          <Text className="font-semibold text-fg">{syncing ? "Syncing…" : "Sync now from last host"}</Text>
        </Pressable>
      ) : null}

      <Pressable
        onPress={loadDemo}
        className="items-center py-3 rounded-lg border active:opacity-70 border-line">
        <Text className="font-semibold text-fg">Load test data</Text>
      </Pressable>

      <Pressable
        onPress={confirmReset}
        className="items-center py-3 rounded-lg border active:opacity-70 border-danger/40">
        <Text className="font-semibold text-danger">Clear all data</Text>
      </Pressable>

      <Text className="mt-auto text-xs text-fg-muted">
        Dooing syncs from the Neovim plugin over your local network. Run the plugin&apos;s share action to expose
        http://&lt;ip&gt;:7283, then scan the QR.
      </Text>
    </View>
  );
}
