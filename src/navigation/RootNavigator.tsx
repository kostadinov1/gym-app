import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from '../theme';

// Placeholder screens (We will replace these later)

import { View, Text } from 'react-native';
import ActiveWorkoutScreen from '../screens/ActiveWorkoutScreen';
import ExerciseListScreen from '../screens/ExerciseListScreen';
import HomeScreen from '../screens/HomeScreen';
import HistoryScreen from '../screens/HistoryScreen';


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
const PlaceholderScreen = ({ name }: { name: string }) => (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>{name}</Text>
    </View>
);

export default function RootNavigator() {
    const theme = useTheme();

    return (
        <NavigationContainer>
            <Tab.Navigator
                screenOptions={{
                    headerShown: false, // We will build custom headers
                    tabBarStyle: {
                        backgroundColor: theme.colors.card,
                        borderTopColor: theme.colors.border,
                    },
                    tabBarActiveTintColor: theme.colors.primary,
                    tabBarInactiveTintColor: theme.colors.textSecondary,
                }}
            >
                <Tab.Screen
                    name="Workout"
                    component={WorkoutStackNavigator}
                />
                    <Tab.Screen 
                    name="History" 
                    component={HistoryScreen} 
                    />
                <Tab.Screen
                    name="Exercises"
                    component={ExerciseListScreen}
                />
                <Tab.Screen
                    name="Profile"
                    children={() => <PlaceholderScreen name="Profile / Settings" />}
                />
            </Tab.Navigator>
        </NavigationContainer>
    );
}