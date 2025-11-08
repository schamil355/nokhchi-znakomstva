import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import SignInScreen from "../screens/SignInScreen";
import RegisterScreen from "../screens/RegisterScreen";
import DiscoveryScreen from "../screens/DiscoveryScreen";
import MatchesScreen from "../screens/MatchesScreen";
import ProfileScreen from "../screens/ProfileScreen";
import ChatScreen from "../screens/ChatScreen";
import SettingsScreen from "../screens/SettingsScreen";

type AppNavigatorProps = {
  isAuthenticated: boolean;
};

type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Chat: { matchId: string; participantId: string };
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const AuthNavigator = () => (
  <AuthStack.Navigator screenOptions={{ headerShown: false }}>
    <AuthStack.Screen name="SignIn" component={SignInScreen} />
    <AuthStack.Screen name="Register" component={RegisterScreen} />
  </AuthStack.Navigator>
);

const MainTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: "#2f5d62",
      tabBarInactiveTintColor: "#999",
      tabBarIcon: ({ color, size }) => {
        const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
          Discovery: "flame",
          Matches: "heart",
          Profile: "person",
          Settings: "settings"
        };
        const iconName = iconMap[route.name] ?? "ellipse";
        return <Ionicons name={iconName} size={size} color={color} />;
      }
    })}
  >
    <Tab.Screen name="Discovery" component={DiscoveryScreen} />
    <Tab.Screen name="Matches" component={MatchesScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
    <Tab.Screen name="Settings" component={SettingsScreen} />
  </Tab.Navigator>
);

const AppNavigator = ({ isAuthenticated }: AppNavigatorProps) => (
  <RootStack.Navigator screenOptions={{ headerShown: false }}>
    {isAuthenticated ? (
      <>
        <RootStack.Screen name="Main" component={MainTabs} />
        <RootStack.Screen name="Chat" component={ChatScreen} />
      </>
    ) : (
      <RootStack.Screen name="Auth" component={AuthNavigator} />
    )}
  </RootStack.Navigator>
);

export default AppNavigator;
