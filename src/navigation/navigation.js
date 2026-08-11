import React from 'react';
import { Text, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import C from '../theme/colors';
import { useItemStore } from '../store/useItemStore';

// Screens
import AuthScreen from '../screens/AuthScreen';
import DashboardScreen from '../screens/DashboardScreen';
import AddItemScreen from '../screens/AddItemScreen';
import InventoryScreen from '../screens/InventoryScreen';
import SoldScreen from '../screens/SoldScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Main Bottom Tab Navigator
function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => {
          let emoji = '';
          if (route.name === 'Dashboard') emoji = '📊';
          else if (route.name === 'Add') emoji = '➕';
          else if (route.name === 'Inventory') emoji = '📦';
          else if (route.name === 'Sold') emoji = '🏷️';
          else if (route.name === 'Settings') emoji = '⚙️';
          return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>;
        },
        tabBarActiveTintColor: C.accent,
        tabBarInactiveTintColor: C.textMuted,
        tabBarStyle: {
          backgroundColor: C.surface,
          borderTopColor: C.border,
          borderTopWidth: 1,
          paddingTop: 10,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          height: Platform.OS === 'ios' ? 84 : 64,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: 2,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: '대시보드' }} />
      <Tab.Screen name="Add" component={AddItemScreen} options={{ title: '등록' }} />
      <Tab.Screen name="Inventory" component={InventoryScreen} options={{ title: '재고' }} />
      <Tab.Screen name="Sold" component={SoldScreen} options={{ title: '판매완료' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: '설정' }} />
    </Tab.Navigator>
  );
}

// Root Navigator choosing between Auth and MainTab
export default function RootNavigator() {
  const token = useItemStore((state) => state.token);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {token === null ? (
        <Stack.Screen name="Auth" component={AuthScreen} />
      ) : (
        <Stack.Screen name="Main" component={MainTabNavigator} />
      )}
    </Stack.Navigator>
  );
}
