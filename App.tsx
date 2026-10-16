/**
 * App entry: native stack with inbox kept attached for scroll restoration.
 */
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { StatusBar, StyleSheet, useColorScheme, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { enableScreens } from 'react-native-screens';
import ActionErrorBanner from './src/components/ActionErrorBanner';
import UndoToast from './src/components/UndoToast';
import { InboxProvider, useInboxContext } from './src/inbox/InboxContext';
import type { RootStackParamList } from './src/navigation/types';
import InboxScreen from './src/screens/InboxScreen';
import MessageScreen from './src/screens/MessageScreen';

enableScreens(true);

const Stack = createNativeStackNavigator<RootStackParamList>();

function AppNavigator(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  const { actionError, dismissActionError, toast, undo } = useInboxContext();

  return (
    <View style={styles.root}>
      <NavigationContainer>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <Stack.Navigator
          screenOptions={{
            headerBackTitle: 'Inbox',
            freezeOnBlur: false,
          }}
        >
          <Stack.Screen
            name="Inbox"
            component={InboxScreen}
            options={{ title: 'Inbox' }}
          />
          <Stack.Screen
            name="Message"
            component={MessageScreen}
            options={({ route }) => ({
              title: route.params.email.sender,
              headerBackTitle: 'Inbox',
              fullScreenGestureEnabled: false,
              // Keep Inbox mounted underneath so FlatList offset is preserved.
              detachPreviousScreen: false,
            })}
          />
        </Stack.Navigator>
      </NavigationContainer>
      {/* Overlays above the stack so MessageScreen still sees failures / undo. */}
      <ActionErrorBanner
        error={actionError}
        onDismiss={dismissActionError}
        aboveUndoToast={toast != null}
      />
      <UndoToast toast={toast} onUndo={undo} />
    </View>
  );
}

function App(): React.JSX.Element {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <InboxProvider>
          <AppNavigator />
        </InboxProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});

export default App;
