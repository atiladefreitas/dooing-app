import { Check } from "lucide-react-native";
import { Pressable, View } from "react-native";

import { TodoStatus } from "@/types/todo";

interface Props {
  status: TodoStatus;
  onPress: () => void;
  size?: number;
}

export function StatusCheckbox({ status, onPress, size = 20 }: Props) {
  const box = { width: size, height: size, borderRadius: size / 2 };
  const border = Math.max(2, Math.round(size * 0.125));

  return (
    <Pressable
      hitSlop={12}
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: status === "done" }}
      className="active:opacity-60">
      {status === "done" ? (
        <View
          style={box}
          className="justify-center items-center bg-green-500">
          <Check
            size={Math.round(size * 0.6)}
            color="#0a0a0a"
            strokeWidth={3.5}
          />
        </View>
      ) : status === "in_progress" ? (
        <View
          style={[box, { borderWidth: border }]}
          className="justify-center items-center border-priority-urgent">
          <View
            style={{ width: size * 0.5, height: size * 0.5, borderRadius: size }}
            className="bg-priority-urgent"
          />
        </View>
      ) : (
        <View
          style={[box, { borderWidth: border }]}
          className="border-neutral-600"
        />
      )}
    </Pressable>
  );
}
