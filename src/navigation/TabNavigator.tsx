import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';

import HomeScreen from '../screens/HomeScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ProfileScreen from '../screens/ProfileScreen';
import EditVehicle from '../screens/EditVehicle';
import EditPersonalDetails from '../screens/EditPersonalDetails';
import RideDetails from '../screens/RideDetails';
import Notification from '../screens/Notification';
import HomeIcon from '../assets/svg/HomeIcon.svg';
import HistoryIcon from '../assets/svg/document.svg';
import TransactionsIcon from '../assets/svg/Transactions.svg';
import ProfileIcon from '../assets/svg/profilre.svg';
import TripIcon from '../assets/svg/vehicleTruck.svg';
import chatScreen from '../screens/chatScreen';
import { Colors } from '../constants/Colors';
import AllOrders from '../screens/AllOrders';
import TripCompletionScreen from '../screens/TripComplete';
import RatingScreen from '../screens/RatingScreen';
import Transactions from '../screens/Transactions';



const Tab = createBottomTabNavigator();
const HomeStack = createStackNavigator();
const TripsStack = createStackNavigator();
const ProfileStack = createStackNavigator();
const RootStack = createStackNavigator();

export default function AppNavigator() {
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="Tabs" component={TabNavigator} />
      <RootStack.Screen name="Notification" component={Notification} />
    </RootStack.Navigator>
  );
}
// Create a Home Stack Navigator
function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="HomeMain" component={HomeScreen} />
      <HomeStack.Screen name="AllOrders" component={AllOrders} />
      <HomeStack.Screen name="RideDetails" component={RideDetails} />
      <HomeStack.Screen name="ChatScreen" component={chatScreen} />
      <HomeStack.Screen name="TripComplete" component={TripCompletionScreen} />
      <HomeStack.Screen name="RatingScreen" component={RatingScreen} />
    </HomeStack.Navigator>
  );
}

// Create a Trips Stack Navigator
function TripsStackNavigator() {
  return (
    <TripsStack.Navigator screenOptions={{ headerShown: false }}>
      <TripsStack.Screen name="AllOrdersMain" component={AllOrders} />
      <TripsStack.Screen name="RideDetails" component={RideDetails} />
      <TripsStack.Screen name="ChatScreen" component={chatScreen} />
      <TripsStack.Screen name="TripComplete" component={TripCompletionScreen} />
      <TripsStack.Screen name="RatingScreen" component={RatingScreen} />
    </TripsStack.Navigator>
  );
}

function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} />
      <ProfileStack.Screen name="EditVehicle" component={EditVehicle} />
      <ProfileStack.Screen name="EditPersonalDetails" component={EditPersonalDetails} />
    </ProfileStack.Navigator>
  );
}

interface TabNavigatorProps {
  onLogout: () => void;
}

const TabNavigator: React.FC<TabNavigatorProps> = ({ onLogout }) => {
  return (
    <Tab.Navigator
    // initialRouteName="History"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: Colors.white,
        tabBarInactiveTintColor: Colors.gray,

        sceneContainerStyle: {
          backgroundColor: 'transparent',
        },

        tabBarStyle: {
          backgroundColor: Colors.secondaryDark,
          height: 60,
          paddingBottom: 5,
          paddingTop: 5,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          overflow: 'hidden',
        },

        tabBarItemStyle: {
          borderRadius: 10, // 👈 controls white rectangle radius
          marginHorizontal: 10,
          // marginVertical: 6, // 👈 important for spacing
          overflow: 'hidden', // 👈 ensures radius works properly
        },

        tabBarActiveBackgroundColor: 'rgba(255,255,255,0.2)',

        tabBarLabelStyle: {
          fontSize: 12,
        },

        tabBarIcon: ({ color, size }) => {
          let Icon;

          switch (route.name) {
            case 'Home':
              Icon = HomeIcon;
              break;
            case 'Trips':
              Icon = TripIcon;
              break;
            case 'History':
              Icon = HistoryIcon;
              break;
            case 'Profile':
              Icon = ProfileIcon;
              break;

              case 'Wallet':
              Icon = TransactionsIcon;
              break;
            default:
              return null;
          }

          return <Icon width={size} height={size} fill={color} />;
        },
      })}
    >
      {/* 1️⃣ Home (now with nested stack) */}
      <Tab.Screen
        name="Home"
        component={HomeStackNavigator}
        initialParams={{ onLogout }}
      />

      {/* 2️⃣ Trips */}
      <Tab.Screen name="Trips" component={TripsStackNavigator} />
      {/* 3Trips */}
      {/* <Tab.Screen name="Wallet" component={Transactions} /> */}

      {/* 3️⃣ History */}
      <Tab.Screen name="History" component={HistoryScreen} />

      {/* 4️⃣ Profile */}
      <Tab.Screen name="Profile" component={ProfileStackNavigator} />
      {/* <Tab.Screen name="Profile" component={ChatScreen} /> */}
    </Tab.Navigator>
  );
};

// export default TabNavigator;
