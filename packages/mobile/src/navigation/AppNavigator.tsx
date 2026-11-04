import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';

// Screens
import SplashScreen from '../screens/SplashScreen';
import LanguageSelectScreen from '../screens/LanguageSelectScreen';
import HomeScreen from '../screens/HomeScreen';
import ScannerScreen from '../screens/ScannerScreen';
import VerificationScreen from '../screens/VerificationScreen';
import ProductPassportScreen from '../screens/ProductPassportScreen';
import ReportScreen from '../screens/ReportScreen';
import HistoryScreen from '../screens/HistoryScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

/** Simple emoji-based tab icon */
function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <View style={[tabStyles.iconContainer, focused && tabStyles.iconFocused]}>
      <Text style={tabStyles.emoji}>{emoji}</Text>
    </View>
  );
}

/** Home stack — includes Verification, Passport, Report sub-screens */
function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: true, headerTitleStyle: { fontWeight: '700' } }}>
      <Stack.Screen name="HomeMain" component={HomeScreen} options={{ title: 'SmartSeed', headerShown: false }} />
      <Stack.Screen name="Verification" component={VerificationScreen} options={{ title: 'Verification Result' }} />
      <Stack.Screen name="ProductPassport" component={ProductPassportScreen} options={{ title: 'Product Passport' }} />
      <Stack.Screen name="Report" component={ReportScreen} options={{ title: 'Report Issue' }} />
    </Stack.Navigator>
  );
}

/** History stack */
function HistoryStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HistoryMain" component={HistoryScreen} />
      <Stack.Screen name="Verification" component={VerificationScreen} options={{ headerShown: true, title: 'Verification' }} />
    </Stack.Navigator>
  );
}

/** Main bottom tabs */
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#f3f4f6',
          borderTopWidth: 1,
          height: 70,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        tabBarActiveTintColor: '#16a34a',
        tabBarInactiveTintColor: '#9ca3af',
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Scanner"
        component={ScannerScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={tabStyles.scanButtonOuter}>
              <View style={tabStyles.scanButtonInner}>
                <Text style={tabStyles.scanEmoji}>📷</Text>
              </View>
            </View>
          ),
          tabBarLabel: 'Scan',
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryStack}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="📋" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

/** Root navigator — splash → language → main app */
export default function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="LanguageSelect" component={LanguageSelectScreen} />
      <Stack.Screen name="MainTabs" component={MainTabs} />
    </Stack.Navigator>
  );
}

const tabStyles = StyleSheet.create({
  iconContainer: { padding: 4 },
  iconFocused: {},
  emoji: { fontSize: 22 },
  scanButtonOuter: {
    position: 'absolute', top: -20,
    backgroundColor: '#16a34a', width: 60, height: 60,
    borderRadius: 30, justifyContent: 'center', alignItems: 'center',
    shadowColor: '#16a34a', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 6,
  },
  scanButtonInner: { justifyContent: 'center', alignItems: 'center' },
  scanEmoji: { fontSize: 28 },
});

