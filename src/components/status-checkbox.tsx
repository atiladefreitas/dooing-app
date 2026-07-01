import { Check } from "lucide-react-native";
import { Pressable, View } from "react-native";

import { TodoStatus } from "@/types/todo";

interface Props {
  status: TodoStatus;
  onPress: () => void;
}

export function StatusCheckbox({ status, onPress }: Props) {
  return (
    <Pressable
      hitSlop={12}
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: status === "done" }}
      className="active:opacity-60">
      {status === "done" ? (
        <View className="justify-center items-center w-5 h-5 bg-green-500 rounded-full">
          <Check
            size={12}
            color="#0a0a0a"
            strokeWidth={3.5}
          />
        </View>
      ) : status === "in_progress" ? (
        <View className="justify-center items-center w-5 h-5 rounded-full border-[2.5px] border-priority-urgent">
          <View className="w-2.5 h-2.5 rounded-full bg-priority-urgent" />
        </View>
      ) : (
        <View className="w-5 h-5 rounded-full border-[2.5px] border-neutral-600" />
      )}
    </Pressable>
  );
}
