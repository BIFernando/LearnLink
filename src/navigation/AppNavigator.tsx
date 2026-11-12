// ============================================
// FILE: src/navigation/AppNavigator.tsx
// ============================================

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';

// Import matching screens
import MatchesScreen from '../screens/matching/MatchesScreen';
import MatchDetailsScreen from '../screens/matching/MatchDetailsScreen';
import MatchExplanationScreen from '../screens/matching/MatchExplanationScreen';

import { RootStackParamList } from './RootStackParamList';

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Matches"
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="Matches" component={MatchesScreen} />
        <Stack.Screen name="MatchDetails" component={MatchDetailsScreen} />
        <Stack.Screen name="MatchExplanation" component={MatchExplanationScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;