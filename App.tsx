import React, { useEffect } from 'react';
import { StatusBar, LogBox } from 'react-native';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { store, persistor } from './src/store';
import RootNavigator from './src/navigation/RootNavigator';
import { NotificationService } from './src/services/NotificationService';
import { colors } from './src/utils/theme';

LogBox.ignoreLogs(['Warning: ...']);

const App: React.FC = () => {
  useEffect(() => {
    NotificationService.initialize();
    NotificationService.requestPermission();
  }, []);

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <SafeAreaProvider>
          <NavigationContainer>
            <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
            <RootNavigator />
          </NavigationContainer>
        </SafeAreaProvider>
      </PersistGate>
    </Provider>
  );
};

export default App;
