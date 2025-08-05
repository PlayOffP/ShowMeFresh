import { Tabs } from 'expo-router';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { Bookmark, Home, Users } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  
  // Landscape detection
  const isLandscape = width > height;

  return (
    <QueryClientProvider client={queryClient}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 40,
            backgroundColor: 'transparent',
            borderTopWidth: 0,
            height: isLandscape ? 50 + insets.bottom : 60 + insets.bottom,
            paddingBottom: insets.bottom,
            paddingTop: isLandscape ? 5 : 10,
          },
          tabBarActiveTintColor: '#FF0050',
          tabBarInactiveTintColor: '#FFFFFF',
          tabBarLabelStyle: {
            fontFamily: 'Inter-Medium',
            fontSize: isLandscape ? 10 : 12,
            marginBottom: isLandscape ? 3 : 6,
          },
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size }) => (
              <Home size={isLandscape ? size * 0.8 : size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="must-watch"
          options={{
            title: 'Must-Watch',
            tabBarIcon: ({ color, size }) => (
              <Bookmark size={isLandscape ? size * 0.8 : size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="friends"
          options={{
            title: 'Friends',
            tabBarIcon: ({ color, size }) => (
              <Users size={isLandscape ? size * 0.8 : size} color={color} />
            ),
          }}
        />
      </Tabs>
    </QueryClientProvider>
  );
}