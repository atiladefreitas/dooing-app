import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Type } from "@/constants/theme";
import { ImportError, importFromHost } from "@/lib/api";
import { pairWithHost } from "@/lib/pairing";
import { parseShareUrl } from "@/lib/qr";

/**
 * QR import — DESIGN.md §4.7.
 *
 * The pull renders as terminal process output rather than a spinner and an
 * alert. This is the app's one genuinely technical feat (reaching a Neovim
 * instance over the LAN), so it should read like one.
 */

type Tone = "dim" | "info" | "ok" | "error";

interface LogLine {
  text: string;
  tone: Tone;
}

const TONE: Record<Tone, string> = {
  dim: "text-fg-muted",
  info: "text-accent",
  ok: "text-ok",
  error: "text-danger",
};

const SHADES = "░▒▓█▓▒░";

/** Block-shade bar that rotates while the pull is in flight. */
function ShadeSpinner() {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setFrame((f) => f + 1), 120);
    return () => clearInterval(id);
  }, []);
  const offset = frame % SHADES.length;
  return (
    <Text
      style={Type.meta}
      className="text-accent">
      {SHADES.slice(offset) + SHADES.slice(0, offset)}
    </Text>
  );
}

function ProcessLog({ lines, running }: { lines: LogLine[]; running: boolean }) {
  return (
    <View className="gap-0.5 px-4 py-3 rounded-md bg-overlay/90">
      {lines.map((line, i) => (
        <Text
          key={i}
          style={Type.meta}
          className={TONE[line.tone]}>
          {line.text}
        </Text>
      ))}
      {running ? (
        <View className="flex-row gap-2 items-center">
          <ShadeSpinner />
          <Text
            style={Type.meta}
            className="text-fg-dim">
            pulling
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [lines, setLines] = useState<LogLine[]>([]);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  // Guards against the camera firing onBarcodeScanned many times per second.
  const locked = useRef(false);

  const append = (text: string, tone: Tone = "dim") =>
    setLines((prev) => [...prev, { text, tone }]);

  const handleScan = async ({ data }: { data: string }) => {
    if (locked.current) return;
    const share = parseShareUrl(data);
    if (!share) return; // ignore non-Dooing QR codes; keep scanning

    locked.current = true;
    const startedAt = Date.now();
    setRunning(true);
    append(`→ ${share.host}`, "info");

    try {
      if (share.version === 2) {
        await pairWithHost(share);
        append("✓ paired", "ok");
      } else {
        append("· v1 QR — read-only import (update the plugin to pair)", "dim");
      }
      const summary = await importFromHost(share.host);
      append(`✓ ${summary.imported} new · ${summary.updated} updated todos`, "ok");
      if (summary.blocksAvailable) {
        append(
          `✓ ${summary.blocksImported} new · ${summary.blocksUpdated} updated blocks`,
          "ok",
        );
      } else {
        append("· no /blocks endpoint on this host", "dim");
      }
      append(`done in ${((Date.now() - startedAt) / 1000).toFixed(1)}s`, "dim");
      setFinished(true);
    } catch (err) {
      const message =
        err instanceof ImportError ? err.message : "Something went wrong importing.";
      append(`✗ ${message}`, "error");
      // Unlock so the user can simply point at the code again.
      locked.current = false;
    } finally {
      setRunning(false);
    }
  };

  // Permission still resolving.
  if (!permission) {
    return (
      <View className="flex-1 justify-center items-center bg-canvas">
        <Text
          style={Type.meta}
          className="text-fg-muted">
          checking camera permission…
        </Text>
      </View>
    );
  }

  // Permission not granted yet.
  if (!permission.granted) {
    return (
      <SafeAreaView className="flex-1 gap-4 justify-center items-center p-8 bg-canvas">
        <Text
          style={Type.body}
          className="text-center text-fg">
          Camera access is needed to scan the Dooing QR code.
        </Text>
        {permission.canAskAgain ? (
          <Pressable
            onPress={requestPermission}
            className="px-6 py-3 rounded-md bg-accent active:opacity-80">
            <Text
              style={Type.meta}
              className="text-canvas">
              grant camera access
            </Text>
          </Pressable>
        ) : (
          <Text
            style={Type.meta}
            className="text-center text-fg-muted">
            Enable camera access for Dooing in your system settings, then reopen this
            screen.
          </Text>
        )}
        <Pressable
          onPress={() => router.back()}
          className="active:opacity-70">
          <Text
            style={Type.meta}
            className="text-fg-dim">
            cancel
          </Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const scanning = !running && !finished;

  return (
    <View className="flex-1 bg-overlay">
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={running || finished ? undefined : handleScan}
      />

      {/* Framing + process log overlay */}
      <SafeAreaView
        pointerEvents="box-none"
        className="absolute inset-0 justify-between items-center py-6">
        <Text
          style={Type.meta}
          className="px-4 py-2 rounded-md text-fg bg-overlay/80">
          {scanning ? "scanning… point at the QR code in Neovim" : "importing"}
        </Text>

        {scanning ? (
          <View className="w-64 h-64 rounded-lg border-2 border-accent/70" />
        ) : (
          <View className="px-6 w-full">
            <ProcessLog
              lines={lines}
              running={running}
            />
          </View>
        )}

        <Pressable
          onPress={() => router.back()}
          className="px-6 py-3 rounded-md bg-overlay/80 active:opacity-70">
          <Text
            style={Type.meta}
            className="text-fg">
            {finished ? "done" : "cancel"}
          </Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}
