import { View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { useState } from 'react';
import Footer from './footer';

export default function HelpScreen() {
  const [activeTab, setActiveTab] = useState<'home' | 'fav' | 'notif' | 'help'>(
    'help'
  );

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'مركز المساعدة',
          headerTitleAlign: 'center',
          headerShadowVisible: false,
        }}
      />

      <View style={styles.content}>
        <Text style={styles.title}>كيف يمكننا مساعدتك؟</Text>

        <Text style={styles.subtitle}>
          يمكنك الاطلاع على الأسئلة الشائعة أو التواصل مع الدعم الفني.
        </Text>
      </View>

      <Footer activeTab={activeTab} setActiveTab={setActiveTab} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    direction: 'rtl',
  },

  content: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 25,
  },

  title: {
    width: '100%',
    fontSize: 20,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
    writingDirection: 'rtl',
  },

  subtitle: {
    width: '100%',
    fontSize: 14,
    lineHeight: 22,
    color: '#6B7280',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
});