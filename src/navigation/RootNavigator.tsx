import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from '../theme';
import { Dumbbell, Calendar, LayoutList, Layers, User } from 'lucide-react-native';

import ActiveWorkoutScreen from '../screens/ActiveWorkoutScreen';
import ExerciseListScreen from '../screens/ExerciseListScreen';
import HomeScreen from '../screens/HomeScreen';
import HistoryScreen from '../screens/history/HistoryScreen';
import ProfileScreen from '../screens/ProfileScreen';
import PlansScreen from '../screens/PlansScreen';
import CreatePlanScreen from '../screens/plans/CreatePlanScreen';
import PlanDetailsScreen from '../screens/plans/PlanDetailsScreen';
import RoutineEditorScreen from '../screens/plans/RoutineEditorScreen';
import HistoryDetailsScreen from '../screens/history/HistoryDetailsScreen';
import SessionEditorScreen from '../screens/history/SessionEditorScreen';
import AnalyticsScreen from '../screens/analytics/AnalyticsScreen';
import PaywallScreen from '../screens/PaywallScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { navigationRef } from './navigationRef';

// ── Tab stacks ────────────────────────────────────────────────────────────

const WorkoutStack = createNativeStackNavigator();
function WorkoutStackNavigator() {
    return (
        <WorkoutStack.Navigator screenOptions={{ headerShown: false }}>
            <WorkoutStack.Screen name="Home" component={HomeScreen} />
            <WorkoutStack.Screen name="ActiveWorkout" component={ActiveWorkoutScreen} />
        </WorkoutStack.Navigator>
    );
}

const PlansStack = createNativeStackNavigator();
function PlansStackNavigator() {
    return (
        <PlansStack.Navigator screenOptions={{ headerShown: false }}>
            <PlansStack.Screen name="PlansList" component={PlansScreen} />
            <PlansStack.Screen name="CreatePlan" component={CreatePlanScreen} />
            <PlansStack.Screen name="PlanDetails" component={PlanDetailsScreen} />
            <PlansStack.Screen name="RoutineEditor" component={RoutineEditorScreen} />
        </PlansStack.Navigator>
    );
}

const HistoryStack = createNativeStackNavigator();
function HistoryStackNavigator() {
    return (
        <HistoryStack.Navigator screenOptions={{ headerShown: false }}>
            <HistoryStack.Screen name="HistoryList" component={HistoryScreen} />
            <HistoryStack.Screen name="HistoryDetails" component={HistoryDetailsScreen} />
            <HistoryStack.Screen name="SessionEditor" component={SessionEditorScreen} />
            <HistoryStack.Screen name="Analytics" component={AnalyticsScreen} />
        </HistoryStack.Navigator>
    );
}

const ProfileStack = createNativeStackNavigator();
function ProfileStackNavigator() {
    return (
        <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
            <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} />
            <ProfileStack.Screen name="Settings" component={SettingsScreen} />
            <ProfileStack.Screen name="Analytics" component={AnalyticsScreen} />
        </ProfileStack.Navigator>
    );
}

// ── Bottom tab navigator ──────────────────────────────────────────────────

const Tab = createBottomTabNavigator();

function TabNavigator() {
    const theme = useTheme();

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: theme.colors.card,
                    borderTopColor: theme.colors.border,
                    paddingBottom: 5,
                    height: 60,
                },
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: theme.colors.textSecondary,
                tabBarIcon: ({ focused, color, size }) => {
                    const TAB_ICONS = {
                        Workout:   Dumbbell,
                        History:   Calendar,
                        Plans:     LayoutList,
                        Exercises: Layers,
                        Profile:   User,
                    };
                    const Icon = TAB_ICONS[route.name as keyof typeof TAB_ICONS];
                    return <Icon size={size} color={color} strokeWidth={focused ? 2.5 : 1.5} />;
                },
            })}
        >
            <Tab.Screen name="Workout"   component={WorkoutStackNavigator} />
            <Tab.Screen name="History"   component={HistoryStackNavigator} />
            <Tab.Screen name="Plans"     component={PlansStackNavigator} />
            <Tab.Screen name="Exercises" component={ExerciseListScreen} />
            <Tab.Screen name="Profile"   component={ProfileStackNavigator} />
        </Tab.Navigator>
    );
}

// ── Root stack — wraps tabs + modal screens ───────────────────────────────

const RootStack = createNativeStackNavigator();

export default function RootNavigator() {
    const theme = useTheme();
    const navTheme = {
        ...DefaultTheme,
        colors: {
            ...DefaultTheme.colors,
            background: theme.colors.background,
            card: theme.colors.card,
            text: theme.colors.text,
            border: theme.colors.border,
            primary: theme.colors.primary,
        },
    };

    return (
        <NavigationContainer ref={navigationRef} theme={navTheme}>
            <RootStack.Navigator screenOptions={{ headerShown: false }}>
                <RootStack.Screen name="MainTabs" component={TabNavigator} />
                <RootStack.Screen
                    name="Paywall"
                    component={PaywallScreen}
                    options={{ presentation: 'modal' }}
                />
            </RootStack.Navigator>
        </NavigationContainer>
    );
}
