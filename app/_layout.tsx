import { Stack, useRouter } from 'expo-router';
import { I18nManager, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import * as Updates from 'expo-updates';

const HEADER_BLUE = '#4A9F35';

export default function RootLayout() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const setupDirection = async () => {
      try {
        /*
          Solution globale stable Android + iOS :
          - On ne force pas le RTL natif.
          - left reste gauche, right reste droite.
          - L'arabe est géré dans les styles des pages :
            textAlign: 'right'
            writingDirection: 'rtl'
            flexDirection: 'row-reverse' pour icône + texte.
        */
        I18nManager.allowRTL(false);
        I18nManager.forceRTL(false);
        I18nManager.swapLeftAndRightInRTL(false);

        if (I18nManager.isRTL) {
          try {
            await Updates.reloadAsync();
            return;
          } catch (error) {
            console.log('Direction reload error:', error);
          }
        }
      } finally {
        setReady(true);
      }
    };

    setupDirection();
  }, []);

const renderBackIcon = (props: { tintColor?: string }) => (
  <View style={styles.backIconWrapper}>
    <Pressable
      onPress={() => router.back()}
      hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
      style={({ pressed }) => [
        styles.backIconButton,
        pressed && styles.backIconPressed,
      ]}
    >
      <Ionicons
        name="chevron-forward"
        size={30}
        color={props.tintColor || '#FFFFFF'}
      />
    </Pressable>
  </View>
);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <StatusBar
        style="light"
        backgroundColor={HEADER_BLUE}
        translucent={false}
      />

      <Stack
        screenOptions={{
          headerTitleAlign: 'center',
          headerStyle: {
            backgroundColor: HEADER_BLUE,
          },
          headerShadowVisible: false,
          headerTitleStyle: {
            color: '#FFFFFF',
            fontWeight: '700',
            fontSize: 17,
          },
          headerTintColor: '#FFFFFF',
          headerBackVisible: false,
          headerLeft: () => null,
          headerRight: () => null,
          contentStyle: {
            backgroundColor: '#FFFFFF',
          },
        }}
      >
        <Stack.Screen
          name="(drawer)"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="index"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="login"
          options={{
            title: 'تسجيل الدخول',
            headerBackVisible: false,
            headerLeft: () => null,
            headerRight: () => null,
          }}
        />

        <Stack.Screen
          name="register"
          options={{
            title: 'إنشاء حساب',
            headerBackVisible: false,
            headerLeft: () => null,
            headerRight: renderBackIcon,
          }}
        />

        <Stack.Screen
          name="add-property"
          options={{
            title: 'إضافة عقار جديد',
            headerBackVisible: false,
            headerLeft: () => null,
            headerRight: renderBackIcon,
          }}
        />

        <Stack.Screen
          name="my-properties"
          options={{
            title: 'عقاراتي',
            headerBackVisible: false,
            headerLeft: () => null,
            headerRight: renderBackIcon,
          }}
        />

        <Stack.Screen
          name="profile"
          options={{
            title: 'ملفي الشخصي',
            headerBackVisible: false,
            headerLeft: () => null,
            headerRight: renderBackIcon,
            headerStyle: {
              backgroundColor: '#F8FAFC',
            },
            headerTintColor: '#000000',
            headerTitleStyle: {
              color: '#000000',
              fontWeight: '700',
              fontSize: 17,
            },
          }}
        />

        <Stack.Screen
          name="favoris"
          options={{
            title: 'المفضلة',
            headerBackVisible: false,
            headerLeft: () => null,
            headerRight: renderBackIcon,
          }}
        />

        <Stack.Screen
          name="maps_search"
          options={{
            title: 'البحث عن العقارات',
            headerBackVisible: false,
            headerLeft: () => null,
            headerRight: renderBackIcon,
          }}
        />

        <Stack.Screen
          name="public-products"
          options={{
            title: 'العقارات',
            headerBackVisible: false,
            headerLeft: () => null,
            headerRight: renderBackIcon,
          }}
        />

        <Stack.Screen
          name="PropertyDetails1"
          options={{
            title: 'تفاصيل العقار',
            headerBackVisible: false,
            headerLeft: () => null,
            headerRight: renderBackIcon,
          }}
        />

        <Stack.Screen
          name="product/[id]"
          options={{
            title: 'تفاصيل العقار',
            headerBackVisible: false,
            headerLeft: () => null,
            headerRight: renderBackIcon,
          }}
        />

                <Stack.Screen
          name="payment-clearance/[id]"
          options={{
            title: 'المخالصة',
            headerBackVisible: false,
            headerLeft: () => null,
            headerRight: renderBackIcon,
          }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
backIconWrapper: {
  width: 44,
  height: 44,
  marginRight: 2,
  alignItems: 'center',
  justifyContent: 'center',
},

backIconButton: {
  width: 44,
  height: 44,
  borderRadius: 22,
  alignItems: 'center',
  justifyContent: 'center',
},

backIconPressed: {
  opacity: 0.5,
},
});