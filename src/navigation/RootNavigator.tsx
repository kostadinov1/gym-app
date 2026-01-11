import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from '../theme';
import { Ionicons } from '@expo/vector-icons';
// Placeholder screens (We will replace these later)

import { View, Text } from 'react-native';
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


const WorkoutStack = createNativeStackNavigator();

// 1. Create a Stack for the Workout Tab
function WorkoutStackNavigator() {
    return (
        <WorkoutStack.Navigator screenOptions={{ headerShown: false }}>
            <WorkoutStack.Screen name="Home" component={HomeScreen} />
            <WorkoutStack.Screen name="ActiveWorkout" component={ActiveWorkoutScreen} />
        </WorkoutStack.Navigator>
    );
}

const Tab = createBottomTabNavigator();

// Temporary placeholders
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
        </HistoryStack.Navigator>
    );
}

export default function RootNavigator() {
    const theme = useTheme();

    return (
        <NavigationContainer>
            <Tab.Navigator
                screenOptions={({ route }) => ({
                    headerShown: false,
                    tabBarStyle: {
                        backgroundColor: theme.colors.card,
                        borderTopColor: theme.colors.border,
                        paddingBottom: 5, // Little padding for modern look
                        height: 60,
                    },
                    tabBarActiveTintColor: theme.colors.primary,
                    tabBarInactiveTintColor: theme.colors.textSecondary,
                    // Dynamic Icon Logic
                    tabBarIcon: ({ focused, color, size }) => {
                        let iconName: keyof typeof Ionicons.glyphMap = 'home'; // Default

                        if (route.name === 'Workout') {
                            iconName = focused ? 'barbell' : 'barbell-outline';
                        } else if (route.name === 'History') {
                            iconName = focused ? 'calendar' : 'calendar-outline';
                        } else if (route.name === 'Plans') {
                            iconName = focused ? 'list' : 'list-outline';
                        } else if (route.name === 'Exercises') {
                            iconName = focused ? 'library' : 'library-outline';
                        } else if (route.name === 'Profile') {
                            iconName = focused ? 'person' : 'person-outline';
                        }

                        return <Ionicons name={iconName} size={size} color={color} />;
                    },
                })}
            >


                <Tab.Screen name="Workout" component={WorkoutStackNavigator} />
                <Tab.Screen name="History" component={HistoryStackNavigator}/>
                {/* <Tab.Screen name="History" component={HistoryScreen} /> */}
                <Tab.Screen name="Plans" component={PlansStackNavigator} />
                <Tab.Screen name="Exercises" component={ExerciseListScreen} />
                <Tab.Screen name="Profile" component={ProfileScreen} />

            </Tab.Navigator>
        </NavigationContainer>
    );
}