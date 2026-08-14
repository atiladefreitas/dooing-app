import { router } from 'expo-router';
import { BottomTabBar, Tabs } from 'expo-router/js-tabs';
import { CalendarDays, ListTodo } from 'lucide-react-native';
import { ColorValue, Pressable, Text, View } from 'react-native';

import { StatusLine } from '@/components/status-line';
import { Type, useThemeColors } from '@/constants/theme';

function HeaderButtons() {
  return (
    <View className="mr-4 flex-row items-center gap-5">
      <Pressable onPress={() => router.push('/scan')} hitSlop={8}>
        <Text style={Type.meta} className="text-accent">
          scan
        </Text>
      </Pressable>
      <Pressable onPress={() => router.push('/settings')} hitSlop={8}>
        <Text style={Type.body} className="text-accent">
          ⚙
        </Text>
      </Pressable>
    </View>
  );
}

/**
 * Bracket-wrapped active label — DESIGN.md §4.6. The inactive form pads with
 * spaces so both states occupy the same monospace width and the label never
 * shifts when you switch tabs.
 */
function monoLabel(label: string) {
  return function TabLabel({ focused, color }: { focused: boolean; color: ColorValue }) {
    return <Text style={[Type.status, { color }]}>{focused ? `[${label}]` : ` ${label} `}</Text>;
  };
}

export default function TabsLayout() {
  const c = useThemeColors();

  return (
    <Tabs
      // The status line rides above the real tab bar rather than replacing it:
      // navigation stays platform-conventional and thumb-friendly.
      tabBar={(props) => (
        <View>
          <StatusLine />
          <BottomTabBar {...props} />
        </View>
      )}
      screenOptions={{
        headerStyle: { backgroundColor: c.canvas },
        headerTintColor: c.fg,
        headerTitleStyle: { fontFamily: Type.section.fontFamily, fontSize: 15 },
        headerShadowVisible: false,
        headerRight: HeaderButtons,
        sceneStyle: { backgroundColor: c.canvas },
        tabBarActiveTintColor: c.accent,
        tabBarInactiveTintColor: c.fgMuted,
        tabBarStyle: {
          backgroundColor: c.canvas,
          // The status line already draws the separating hairline.
          borderTopWidth: 0,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'todos',
          tabBarLabel: monoLabel('todos'),
          tabBarIcon: ({ color, size }) => <ListTodo size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'calendar',
          tabBarLabel: monoLabel('calendar'),
          tabBarIcon: ({ color, size }) => <CalendarDays size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
