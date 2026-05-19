import React, { useContext } from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AuthContext } from '../context/AuthContext';
import { View, Text, ActivityIndicator, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Auth Screens
import LoginScreen from '../screens/Auth/LoginScreen';
import PhoneInputScreen from '../screens/Auth/PhoneInputScreen';
import OTPScreen from '../screens/Auth/OTPScreen';
import RegisterScreen from '../screens/Auth/RegisterScreen';
import ResetPasswordScreen from '../screens/Auth/ResetPasswordScreen';
import VerifyEmailScreen from '../screens/Auth/VerifyEmailScreen';
import VerifyPhoneScreen from '../screens/Auth/VerifyPhoneScreen';

// Main Screens
import HomeScreen from '../screens/Main/HomeScreen';
import VenueDetailScreen from '../screens/Main/VenueDetailScreen';
import BookingSlotScreen from '../screens/Main/BookingSlotScreen';
import BookingConfirmScreen from '../screens/Main/BookingConfirmScreen';
import PaymentQRScreen from '../screens/Main/PaymentQRScreen';
import BookingHistoryScreen from '../screens/Main/BookingHistoryScreen';
import ProfileScreen from '../screens/Main/ProfileScreen';
import MapScreen from '../screens/Main/MapScreen';
import FeaturedScreen from '../screens/Main/FeaturedScreen';
import NotificationScreen from '../screens/Main/NotificationScreen';
import FavoriteScreen from '../screens/Main/FavoriteScreen';
import EditProfileScreen from '../screens/Main/EditProfileScreen';
import SecurityScreen from '../screens/Main/SecurityScreen';
import PaymentMethodsScreen from '../screens/Main/PaymentMethodsScreen';
import SettingsScreen from '../screens/Main/SettingsScreen';
import OwnerDashboardScreen from '../screens/Main/OwnerDashboardScreen';
import OwnerVenueDetailScreen from '../screens/Main/OwnerVenueDetailScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Override theme: mọi background đều tối, không có nền trắng
const AppTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#0F172A',
    card: '#0F172A',
    border: 'transparent',
    primary: '#10B981',
    text: '#F1F5F9',
    notification: '#10B981',
  },
};

const TAB_CONFIG = [
  { name: 'HomeTab',     label: 'Trang chủ', icon: 'grid',         iconOut: 'grid-outline' },
  { name: 'MapTab',      label: 'Bản đồ',    icon: 'map',          iconOut: 'map-outline' },
  { name: 'FeaturedTab', label: 'Nổi bật',   icon: 'flash',        iconOut: 'flash-outline' },
  { name: 'ProfileTab',  label: 'Cá nhân',   icon: 'person-circle',iconOut: 'person-circle-outline' },
];

// Custom background with rounded top corners - no white gap trick
const TabBarBackground = () => (
  <View style={navStyles.tabBarBg} />
);

const CustomTabButton = ({ children, onPress }) => (
  <TouchableOpacity
    style={navStyles.centerBtn}
    onPress={onPress}
    activeOpacity={0.85}
  >
    <View style={navStyles.centerBtnInner}>
      {children}
    </View>
  </TouchableOpacity>
);

const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
    <Stack.Screen name="PhoneInput" component={PhoneInputScreen} />
    <Stack.Screen name="OTP" component={OTPScreen} />
    <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
  </Stack.Navigator>
);

const VerificationStack = () => {
  const { userInfo } = useContext(AuthContext);
  const initialRoute = userInfo?.email_verified === 0 ? 'VerifyEmail' : 'VerifyPhone';

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRoute}>
      <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
      <Stack.Screen name="VerifyPhone" component={VerifyPhoneScreen} />
    </Stack.Navigator>
  );
};

const MainTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => {
      const tab = TAB_CONFIG.find(t => t.name === route.name);
      return {
        headerShown: false,
        tabBarActiveTintColor: '#10B981',
        tabBarInactiveTintColor: '#475569',
        tabBarShowLabel: true,
        tabBarStyle: navStyles.tabBar,
        tabBarLabelStyle: navStyles.tabLabel,
        tabBarBackground: () => <TabBarBackground />,
        tabBarIcon: ({ focused, color }) => {
          if (!tab) return null;
          return (
            <View style={navStyles.tabIconWrap}>
              <Ionicons
                name={focused ? tab.icon : tab.iconOut}
                size={24}
                color={color}
              />
              {focused && <View style={navStyles.tabDot} />}
            </View>
          );
        },
        tabBarLabel: ({ focused, color }) => (
          <Text style={[navStyles.tabLabel, { color }]}>
            {tab?.label || ''}
          </Text>
        ),
      };
    }}
  >
    <Tab.Screen name="HomeTab" component={HomeScreen} />
    <Tab.Screen name="MapTab" component={MapScreen} />

    {/* Center + button */}
    <Tab.Screen
      name="ExploreTab"
      component={BookingHistoryScreen}
      options={{
        tabBarLabel: () => null,
        tabBarIcon: () => (
          <Ionicons name="add" size={32} color="#FFF" />
        ),
        tabBarButton: (props) => <CustomTabButton {...props} />,
      }}
    />

    <Tab.Screen name="FeaturedTab" component={FeaturedScreen} />
    <Tab.Screen name="ProfileTab" component={ProfileScreen} />
  </Tab.Navigator>
);

const MainStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="MainTabs" component={MainTabs} />
    <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
    <Stack.Screen name="VerifyPhone" component={VerifyPhoneScreen} />
    <Stack.Screen name="VenueDetail" component={VenueDetailScreen} />
    <Stack.Screen name="BookingSlot" component={BookingSlotScreen} />
    <Stack.Screen name="BookingConfirm" component={BookingConfirmScreen} />
    <Stack.Screen name="PaymentQR" component={PaymentQRScreen} />
    <Stack.Screen name="BookingHistory" component={BookingHistoryScreen} />
    <Stack.Screen name="Notifications" component={NotificationScreen} />
    <Stack.Screen name="Favorites" component={FavoriteScreen} />
    <Stack.Screen name="EditProfile" component={EditProfileScreen} />
    <Stack.Screen name="Security" component={SecurityScreen} />
    <Stack.Screen name="PaymentMethods" component={PaymentMethodsScreen} />
    <Stack.Screen name="Settings" component={SettingsScreen} />
    <Stack.Screen name="OwnerDashboard" component={OwnerDashboardScreen} />
    <Stack.Screen name="OwnerVenueDetail" component={OwnerVenueDetailScreen} />
  </Stack.Navigator>
);

const AppNavigator = () => {
  const { isLoading, userToken, userInfo } = useContext(AuthContext);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A' }}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={{ color: '#475569', marginTop: 12, fontSize: 14 }}>Đang khởi động...</Text>
      </View>
    );
  }

  let currentStack = <AuthStack />;
  if (userToken && userInfo) {
    // Cho phép dùng app ngay; xác thực email/SĐT có thể làm sau trong Cá nhân (giống Alobo)
    currentStack = <MainStack />;
  }

  return (
    <NavigationContainer theme={AppTheme}>
      {currentStack}
    </NavigationContainer>
  );
};

const navStyles = StyleSheet.create({
  // tabBarBg handles the visible rounded background
  tabBarBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 20,
  },
  // tabBarStyle itself is transparent so no gap
  tabBar: {
    backgroundColor: 'transparent',
    height: 80,
    borderTopWidth: 0,
    paddingTop: 8,
    paddingBottom: 10,
    elevation: 0, // elevation goes on tabBarBg
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
    marginBottom: 2,
  },
  tabIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#10B981',
    marginTop: 3,
  },
  centerBtn: {
    top: -18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 12,
  },
  centerBtnInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#10B981',
    borderWidth: 3,
    borderColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AppNavigator;