import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ImportError, importFromHost } from "@/lib/api";
import { parseShareUrl } from "@/lib/qr";

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  // Guards against the camera firing onBarcodeScanned many times per second.
  const locked = useRef(false);

  const handleScan = async ({ data }: { data: string }) => {
    if (locked.current) return;
    const share = parseShareUrl(data);
    if (!share) return; // ignore non-Dooing QR codes; keep scanning

    locked.current = true;
    setBusy(true);
    try {
      const { imported, updated } = await importFromHost(share.host);
      Alert.alert(
        "Imported",
        `${imported} new, ${updated} updated from ${share.host}.`,
        [{ text: "Done", onPress: () => router.back() }],
      );
    } catch (err) {
      const message =
        err instanceof ImportError ? err.message : "Something went wrong importing.";
      Alert.alert("Import failed", message, [
        { text: "Cancel", style: "cancel", onPress: () => router.back() },
        {
          text: "Try again",
          onPress: () => {
            locked.current = false;
            setBusy(false);
          },
        },
      ]);
    }
  };

  // Permission still resolving.
  if (!permission) {
    return (
      <View className="flex-1 justify-center items-center bg-neutral-950">
        <ActivityIndicator color="#60a5fa" />
      </View>
    );
  }

  // Permission not granted yet.
  if (!permission.granted) {
    return (
      <SafeAreaView className="flex-1 gap-4 justify-center items-center p-8 bg-neutral-950">
        <Text className="text-lg text-center text-neutral-100">
          Camera access is needed to scan the Dooing QR code.
        </Text>
        {permission.canAskAgain ? (
          <Pressable
            onPress={requestPermission}
            className="px-6 py-3 bg-blue-500 rounded-full active:opacity-80">
            <Text className="font-semibold text-white">Grant camera access</Text>
          </Pressable>
        ) : (
          <Text className="text-sm text-center text-neutral-500">
            Enable camera access for Dooing in your system settings, then reopen this
            screen.
          </Text>
        )}
        <Pressable
          onPress={() => router.back()}
          className="active:opacity-70">
          <Text className="text-base text-neutral-400">Cancel</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={busy ? undefined : handleScan}
      />

      {/* Framing + instructions overlay */}
      <SafeAreaView
        pointerEvents="box-none"
        className="absolute inset-0 justify-between items-center py-6">
        <Text className="px-6 py-2 text-base text-neutral-100 rounded-full bg-black/60">
          Point at the QR code in Neovim
        </Text>

        <View className="w-64 h-64 rounded-3xl border-2 border-white/80" />

        <View className="items-center gap-3">
          {busy ? (
            <View className="flex-row gap-2 items-center px-4 py-2 rounded-full bg-black/60">
              <ActivityIndicator color="#60a5fa" />
              <Text className="text-neutral-100">Importing…</Text>
            </View>
          ) : null}
          <Pressable
            onPress={() => router.back()}
            className="px-6 py-3 rounded-full bg-white/15 active:opacity-70">
            <Text className="text-base font-medium text-white">Cancel</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}
