import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#1a1a2e',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: 'VOA',
          }}
        />
        <Stack.Screen
          name="recite"
          options={{
            title: 'Recite',
          }}
        />
        <Stack.Screen
          name="results"
          options={{
            title: 'Results',
          }}
        />
      </Stack>
    </>
  );
}
