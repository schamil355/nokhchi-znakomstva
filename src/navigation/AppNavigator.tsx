import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import {
  createBottomTabNavigator,
  type BottomTabNavigationOptions
} from "@react-navigation/bottom-tabs";
import { useAuthStore } from "../state/authStore";
import { useOnboardingStore } from "../state/onboardingStore";
import { Image, StyleSheet, View } from "react-native";
import type { ImageSourcePropType } from "react-native";
import type { SvgProps } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import HomePng from "../../assets/tab-icons/ICONS/home-filled.png";
import MatchesPng from "../../assets/tab-icons/ICONS/matches.png";
import SettingsPng from "../../assets/tab-icons/ICONS/settings.png";
import ProfilePng from "../../assets/tab-icons/ICONS/profile.png";
import SignInScreen from "../screens/SignInScreen";
import DiscoveryScreen from "../screens/DiscoveryScreen";
import MatchesScreen from "../screens/MatchesScreen";
import LikesSimpleScreen from "../screens/LikesSimpleScreen";
import ProfileScreen from "../screens/ProfileScreen";
import ChatScreen from "../screens/ChatScreen";
import DirectChatScreen from "../screens/DirectChatScreen";
import LegalScreen from "../screens/LegalScreen";
import SettingsScreen from "../screens/SettingsScreen";
import WelcomeScreen from "../screens/WelcomeScreen";
import NotificationsScreen from "../screens/NotificationsScreen";
import OnboardingGenderScreen from "../screens/OnboardingGenderScreen";
import OnboardingNameScreen from "../screens/OnboardingNameScreen";
import OnboardingBirthdayScreen from "../screens/OnboardingBirthdayScreen";
import OnboardingNotificationsScreen from "../screens/OnboardingNotificationsScreen";
import OnboardingLocationScreen from "../screens/OnboardingLocationScreen";
import OnboardingPhotosScreen from "../screens/OnboardingPhotosScreen";
import OnboardingVerifyScreen from "../screens/OnboardingVerifyScreen";
import OnboardingVerifySuccessScreen from "../screens/OnboardingVerifySuccessScreen";
import SelfieScanScreen from "../screens/SelfieScanScreen";
import OnboardingNextScreen from "../screens/OnboardingNextScreen";
import CreateAccountScreen from "../screens/CreateAccountScreen";
import RegisterChoiceScreen from "../screens/RegisterChoiceScreen";
import EmailPendingScreen from "../screens/EmailPendingScreen";

type AppNavigatorProps = {
  isAuthenticated: boolean;
};

type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Chat: { matchId: string; participantId: string };
  DirectChat: { conversationId: string; otherUserId: string };
  Notifications: undefined;
  Legal: { screen?: "terms" | "privacy" } | undefined;
};

type TabParamList = {
  Discovery: undefined;
  Matches: undefined;
  Likes: undefined;
  Settings: undefined;
  Profile: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator<TabParamList>();

const AuthNavigator = () => {
  const session = useAuthStore((state) => state.session);
  const profile = useAuthStore((state) => state.profile);
  const verifiedOverride = useAuthStore((state) => state.verifiedOverride);
  const startOnboarding = Boolean(
    session && profile && !(profile.verified || verifiedOverride)
  );
  return (
    <AuthStack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={startOnboarding ? "OnboardingPhotos" : "Welcome"}
    >
      <AuthStack.Screen name="Welcome" component={WelcomeScreen} />
      <AuthStack.Screen name="SignIn" component={SignInScreen} />
      <AuthStack.Screen name="RegisterChoice" component={RegisterChoiceScreen} />
      <AuthStack.Screen name="CreateAccount" component={CreateAccountScreen} />
      <AuthStack.Screen name="OnboardingGender" component={OnboardingGenderScreen} />
      <AuthStack.Screen name="OnboardingName" component={OnboardingNameScreen} />
      <AuthStack.Screen name="OnboardingBirthday" component={OnboardingBirthdayScreen} />
      <AuthStack.Screen name="OnboardingNotifications" component={OnboardingNotificationsScreen} />
      <AuthStack.Screen name="OnboardingLocation" component={OnboardingLocationScreen} />
      <AuthStack.Screen name="OnboardingPhotos" component={OnboardingPhotosScreen} />
      <AuthStack.Screen name="OnboardingVerify" component={OnboardingVerifyScreen} />
      <AuthStack.Screen name="OnboardingVerifySuccess" component={OnboardingVerifySuccessScreen} />
      <AuthStack.Screen name="SelfieScan" component={SelfieScanScreen} />
      <AuthStack.Screen name="OnboardingNext" component={OnboardingNextScreen} />
      <AuthStack.Screen name="EmailPending" component={EmailPendingScreen} />
    </AuthStack.Navigator>
  );
};

const TAB_ACCENT = "#ffffff";
const TAB_INACTIVE = "#a8adb4";
const TAB_ICON_SIZE = 33;
const TAB_BACKGROUND = "#0b1f16";

type TabConfig = {
  name: keyof TabParamList;
  component: React.ComponentType<any>;
  icon?: React.ComponentType<SvgProps>;
  ioniconName?: keyof typeof Ionicons.glyphMap;
  imageSource?: ImageSourcePropType;
};

const tabsConfig: TabConfig[] = [
  {
    name: "Discovery",
    component: DiscoveryScreen,
    imageSource: HomePng
  },
  {
    name: "Matches",
    component: MatchesScreen,
    imageSource: MatchesPng
  },
  {
    name: "Likes",
    component: LikesSimpleScreen,
    ioniconName: "lock-open-outline"
  },
  {
    name: "Settings",
    component: SettingsScreen,
    imageSource: SettingsPng
  },
  {
    name: "Profile",
    component: ProfileScreen,
    imageSource: ProfilePng
  }
];


const MainTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }: { route: { name: keyof TabParamList } }): BottomTabNavigationOptions => ({
      headerShown: false,
      tabBarShowLabel: false,
      tabBarStyle: tabStyles.bar,
      tabBarItemStyle: tabStyles.item,
      tabBarHideOnKeyboard: true,
      tabBarIcon: ({ focused }: { focused: boolean }) => {
        const tab = tabsConfig.find((config) => config.name === route.name);
        const iconColor = focused ? TAB_ACCENT : TAB_INACTIVE;
        if (tab?.imageSource) {
          return (
            <View style={tabStyles.iconWrapper}>
              <Image
                source={tab.imageSource}
                style={[tabStyles.image, { tintColor: iconColor }, !focused && tabStyles.imageInactive]}
                resizeMode="contain"
              />
            </View>
          );
        }
        const IconComponent = tab?.icon;
        return (
          <TabIcon
            IconComponent={IconComponent}
            ioniconName={tab?.ioniconName}
            active={focused}
            color={iconColor}
          />
        );
      }
    })}
    tabBarBackground={() => <View style={tabStyles.background} />}
  >
    {tabsConfig.map((tab) => (
      <Tab.Screen key={tab.name} name={tab.name} component={tab.component} />
    ))}
  </Tab.Navigator>
);

const AppNavigator = ({ isAuthenticated }: AppNavigatorProps) => {
  const profile = useAuthStore((state) => state.profile);
  const verifiedOverride = useAuthStore((state) => state.verifiedOverride);
  const showVerifySuccess = useOnboardingStore((state) => state.showVerifySuccess);
  const isVerified = Boolean(profile?.verified) || verifiedOverride;
  const needsOnboarding = !profile || !isVerified;
  const shouldStayInOnboarding = !isAuthenticated || needsOnboarding || showVerifySuccess;

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {shouldStayInOnboarding ? (
        <RootStack.Screen name="Auth" component={AuthNavigator} />
      ) : (
        <>
          <RootStack.Screen name="Main" component={MainTabs} />
          <RootStack.Screen name="Chat" component={ChatScreen} />
          <RootStack.Screen name="DirectChat" component={DirectChatScreen} />
          <RootStack.Screen
            name="Filters"
            component={SettingsScreen}
            options={{ presentation: "fullScreenModal", animation: "slide_from_right" }}
          />
        </>
      )}
      <RootStack.Screen
        name="Legal"
        component={LegalScreen}
        options={{ presentation: "fullScreenModal", animation: "slide_from_right" }}
      />
      <RootStack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ presentation: "fullScreenModal", animation: "slide_from_right" }}
      />
    </RootStack.Navigator>
  );
};

export default AppNavigator;

const tabStyles = StyleSheet.create({
  bar: {
    height: 72,
    borderTopWidth: 0,
    backgroundColor: TAB_BACKGROUND,
    borderTopColor: "transparent",
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 0,
    paddingBottom: 14,
    paddingTop: 10,
    elevation: 0
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: TAB_BACKGROUND
  },
  item: {
    paddingVertical: 4,
    flex: 1
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center"
  },
  image: {
    width: TAB_ICON_SIZE,
    height: TAB_ICON_SIZE
  },
  imageInactive: {
    opacity: 0.45
  }
});

const TabIcon = ({
  IconComponent,
  ioniconName,
  active,
  color
}: {
  IconComponent?: React.ComponentType<SvgProps>;
  ioniconName?: keyof typeof Ionicons.glyphMap;
  active: boolean;
  color?: string;
}) => {
  const tint = color ?? (active ? TAB_ACCENT : TAB_INACTIVE);
  return (
    <View style={tabStyles.iconWrapper}>
      {ioniconName ? (
        <Ionicons name={ioniconName} size={TAB_ICON_SIZE} color={tint} />
      ) : (
        IconComponent && <IconComponent width={TAB_ICON_SIZE} height={TAB_ICON_SIZE} stroke={tint} />
      )}
    </View>
  );
};
