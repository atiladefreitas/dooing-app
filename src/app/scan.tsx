import { Text, View } from 'react-native';

// M3 will replace this stub with the expo-camera QR scanner + import flow.
export default function ScanScreen() {
  return (
    <View className="flex-1 items-center justify-center gap-2 bg-neutral-950 p-6">
      <Text className="text-lg text-neutral-200">Scan &amp; import</Text>
      <Text className="text-center text-sm text-neutral-500">
        QR scanning and Neovim import arrive in M3. In Neovim, run the plugin&apos;s
        share action to expose http://&lt;ip&gt;:7283.
      </Text>
    </View>
  );
}
