import { Plus } from "lucide-react-native";
import { Pressable, ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

import { fabIn, Springs } from "@/constants/motion";
import { useThemeColors } from "@/constants/theme";

/**
 * The floating add button, shared by the todo and calendar screens: a lucide
 * Plus on an accent disc that eases in on mount and squishes underfinger.
 */
export function Fab({
  onPress,
  accessibilityLabel,
  style,
}: {
  onPress: () => void;
  accessibilityLabel: string;
  /** Screen-specific offsets ({ right, bottom }); the button positions absolutely. */
  style?: ViewStyle;
}) {
  const c = useThemeColors();
  const pressed = useSharedValue(0);

  const squish = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.value * 0.12 }],
  }));

  return (
    <Animated.View
      entering={fabIn}
      style={[{ position: "absolute" }, style, squish]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => (pressed.value = withSpring(1, Springs.press))}
        onPressOut={() => (pressed.value = withSpring(0, Springs.press))}
        accessibilityLabel={accessibilityLabel}
        style={{ elevation: 8 }}
        className="justify-center items-center w-14 h-14 rounded-full bg-accent">
        {/* canvas = the app background colour, which contrasts against the
            accent in BOTH themes; a literal white only works in light mode. */}
        <Plus
          size={26}
          color={c.canvas}
          strokeWidth={2.5}
        />
      </Pressable>
    </Animated.View>
  );
}
