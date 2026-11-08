import { Tabs } from 'expo-router';

import { TabBar } from '@/components/tab-bar';
import { C } from '@/lib/theme';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: C.bg } }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="driver" />
      <Tabs.Screen name="packages" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
