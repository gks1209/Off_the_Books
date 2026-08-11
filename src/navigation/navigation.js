import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import C from '../theme/colors';
import { useItemStore } from '../store/useItemStore';

// Screens
import DashboardScreen from '../screens/DashboardScreen';
import AddItemScreen from '../screens/AddItemScreen';
import InventoryScreen from '../screens/InventoryScreen';
import SoldScreen from '../screens/SoldScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Temporary Mock Auth Screen (will be replaced with AuthScreen in Step 3)
function MockAuthScreen() {
  const setToken = useItemStore((state) => state.setToken);
  return (
    <View style={styles.mockAuth}>
      <Text style={styles.mockAuthTitle}>📖 Off the Books</Text>
      <Text style={styles.mockAuthSubtitle}>임시 로그인 페이지 (Step 2)</Text>
      <TouchableOpacity
        style={styles.mockAuthBtn}
        onPress={() => setToken('mock-token')}
        activeOpacity={0.8}
      >
        <Text style={styles.mockAuthBtnText}>로그인하기 (Mock)</Text>
      </TouchableOpacity>
    </View>
  );
}

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
    </Tab.Navigator>
  );
}

// Root Navigator choosing between Auth and MainTab
export default function RootNavigator() {
  const token = useItemStore((state) => state.token);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {token === null ? (
        <Stack.Screen name="Auth" component={MockAuthScreen} />
      ) : (
        <Stack.Screen name="Main" component={MainTabNavigator} />
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  mockAuth: {
    flex: 1,
    backgroundColor: C.bg,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  mockAuthTitle: {
    color: C.accent,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
  },
  mockAuthSubtitle: {
    color: C.textSec,
    fontSize: 14,
    marginBottom: 32,
  },
  mockAuthBtn: {
    backgroundColor: C.accent,
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  mockAuthBtnText: {
    color: C.bg,
    fontSize: 15,
    fontWeight: '700',
  },
});
