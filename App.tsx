import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';


import DiscoverScreen from './src/screens/SkillsDiscovery/DiscoverScreen';
import MySkillsScreen from './src/screens/SkillsDiscovery/MySkillsScreen';
import SkillManagementScreen from './src/screens/SkillsDiscovery/SkillManagementScreen';
import SearchResultsScreen from './src/screens/SkillsDiscovery/SearchResultsScreen';
import StudentProfileScreen from './src/screens/SkillsDiscovery/StudentProfileScreen';

const Stack = createNativeStackNavigator();

const App: React.FC = () => {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator 
          initialRouteName="Discover"
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen name="Discover" component={DiscoverScreen} />
          <Stack.Screen name="MySkills" component={MySkillsScreen} />
          <Stack.Screen name="SkillManagement" component={SkillManagementScreen} />
          <Stack.Screen name="SearchResults" component={SearchResultsScreen} />
          <Stack.Screen name="StudentProfile" component={StudentProfileScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

export default App;