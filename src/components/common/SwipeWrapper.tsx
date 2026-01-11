import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { GestureDetector, Gesture, Directions } from 'react-native-gesture-handler';

interface SwipeWrapperProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  style?: ViewStyle;
}

export const SwipeWrapper = ({ children, onSwipeLeft, onSwipeRight, style }: SwipeWrapperProps) => {
  
  const gestures = Gesture.Race(
    Gesture.Fling()
      .direction(Directions.LEFT)
      .onEnd(() => {
        if (onSwipeLeft) onSwipeLeft();
      }),
    Gesture.Fling()
      .direction(Directions.RIGHT)
      .onEnd(() => {
        if (onSwipeRight) onSwipeRight();
      })
  );

  return (
    <GestureDetector gesture={gestures}>
      <View style={[{ flex: 1 }, style]}>
        {children}
      </View>
    </GestureDetector>
  );
};