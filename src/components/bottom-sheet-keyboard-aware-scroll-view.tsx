import {
  createBottomSheetScrollableComponent,
  SCROLLABLE_TYPE,
  type BottomSheetScrollViewMethods,
} from '@gorhom/bottom-sheet';
import { ComponentProps } from 'react';
import Reanimated from 'react-native-reanimated';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

/**
 * gorhom's built-in keyboard handling (keyboardBehavior="interactive") is broken
 * on Android under the New Architecture + edge-to-edge (Expo SDK 54+), and once
 * the app is wrapped in <KeyboardProvider> the sheet's default push-up stops too.
 *
 * The fix is to let react-native-keyboard-controller do the avoidance from INSIDE
 * the sheet: wrap its KeyboardAwareScrollView with gorhom's scrollable factory so
 * it still participates in the sheet's gesture/scroll coordination.
 */
const AnimatedKeyboardAwareScrollView =
  Reanimated.createAnimatedComponent(KeyboardAwareScrollView);

type Props = ComponentProps<typeof AnimatedKeyboardAwareScrollView>;

export const BottomSheetKeyboardAwareScrollView = createBottomSheetScrollableComponent<
  BottomSheetScrollViewMethods,
  Props
>(SCROLLABLE_TYPE.SCROLLVIEW, AnimatedKeyboardAwareScrollView);
