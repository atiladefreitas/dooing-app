import { router } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { CalendarDays, ListTodo } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

const BG = '#0a0a0a';

function HeaderButtons() {
  return (
    <View className="mr-4 flex-row items-center gap-5">
      <Pressable onPress={() => router.push('/scan')} hitSlop={8}>
        <Text className="text-base text-blue-400">Scan</Text>
      </Pressable>
      <Pressable onPress={() => router.push('/settings')} hitSlop={8}>
        <Text className="text-xl text-blue-400">⚙</Text>
      </Pressable>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: BG },
        headerTintColor: '#fff',
        headerShadowVisible: false,
        headerRight: HeaderButtons,
        sceneStyle: { backgroundColor: BG },
        tabBarActiveTintColor: '#60a5fa',
        tabBarInactiveTintColor: '#737373',
        tabBarStyle: {
          backgroundColor: BG,
          borderTopColor: '#262626',
        },
        tabBarLabelStyle: { fontSize: 11 },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Todos',
          tabBarIcon: ({ color, size }) => <ListTodo size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color, size }) => <CalendarDays size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
