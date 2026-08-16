import LottieView from "lottie-react-native";
import { useEffect } from "react";
import { StyleSheet } from "react-native";
import Animated, { FadeOut } from "react-native-reanimated";

import { Palette } from "@/constants/theme";

/**
 * Animated launch screen: the Dooing wordmark Lottie, played once over the app
 * while it sits ready underneath, then a quick fade-out reveals it.
 *
 * The mark is white with a light-blue stroke, so the backdrop is always the
 * night canvas regardless of theme — matching the native splash colour in
 * app.json so the native → animated handoff is invisible.
 */

/** Frames 0–300 at fr 100 ≈ 3s; if Lottie never reports back, bail shortly after. */
const FAILSAFE_MS = 4000;

export function AnimatedSplash({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const failsafe = setTimeout(onDone, FAILSAFE_MS);
    return () => clearTimeout(failsafe);
  }, [onDone]);

  return (
    <Animated.View
      exiting={FadeOut.duration(350)}
      style={[
        StyleSheet.absoluteFill,
        {
          backgroundColor: Palette.night.canvas,
          alignItems: "center",
          justifyContent: "center",
          zIndex: 100,
        },
      ]}>
      <LottieView
        source={require("../../assets/lottie.json")}
        autoPlay
        loop={false}
        style={{ width: "150%", height: "150%" }}
        onAnimationFinish={(isCancelled) => {
          if (!isCancelled) onDone();
        }}
      />
    </Animated.View>
  );
}
