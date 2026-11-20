import { View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { useState } from 'react';
import Footer from './footer';

export default function NotificationScreen() {
  const [activeTab, setActiveTab] = useState<'home' | 'fav' | 'notif' | 'help'>('notif');

  return (
    <View style={styles.screen}>
      {/* Titre du header */}
      <Stack.Screen options={{ title: 'الإشعارات' }} />

      {/* Contenu */}
      <View style={styles.content}>
        <Text style={styles.text}>
          لا توجد إشعارات جديدة حالياً.
        </Text>
      </View>

      {/* Footer */}
      <Footer activeTab={activeTab} setActiveTab={setActiveTab} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  text: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
});