import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import MatchesScreen from './src/screens/matching/MatchesScreen';

// Temp colors
const colors = {
  background: '#F5F7FA',
  white: '#FFFFFF',
};

const App = () => {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
        <MatchesScreen />
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

export default App;