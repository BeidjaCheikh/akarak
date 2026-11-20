import { Redirect, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  View,
  ActivityIndicator,
  StyleSheet,
  Image,
  Text,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { getToken } from '../src/storage/token';

export default function Index() {
  const [isAuthenticated, setIsAuthenticated] = useState(null);

  useEffect(() => {
    let mounted = true;

    const checkToken = async () => {
      try {
        const token = await getToken();

        if (mounted) {
          setIsAuthenticated(!!token);
        }
      } catch (error) {
        if (mounted) {
          setIsAuthenticated(false);
        }
      }
    };

    checkToken();

    return () => {
      mounted = false;
    };
  }, []);

  if (isAuthenticated === null) {
    return (
      <>
        <Stack.Screen
          options={{
            headerShown: false,
          }}
        />

        <StatusBar
          style="light"
          backgroundColor="#3568C4"
          translucent={false}
        />

        <View style={styles.screen}>
          <Image
            source={require('../assets/images/icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />

          <Text style={styles.appName}>عقارك</Text>

          <Text style={styles.loadingText}>جاري التحميل...</Text>

          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      </>
    );
  }

  if (isAuthenticated === true) {
    return <Redirect href="/(drawer)/home" />;
  }

  return <Redirect href="/login" />;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#3568C4',
    alignItems: 'center',
    justifyContent: 'center',
  },

  logo: {
    width: 115,
    height: 115,
    borderRadius: 28,
    marginBottom: 18,
  },

  appName: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'center',
    writingDirection: 'rtl',
    marginBottom: 8,
  },

  loadingText: {
    color: '#E0EAFF',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    writingDirection: 'rtl',
    marginBottom: 18,
  },
});