import { View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';

export default function SearchScreen() {
  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          title: 'البحث عن العقارات',
          headerShown: true,
          headerShadowVisible: false,
        }}
      />

      <View style={styles.content}>
        <Text style={styles.emptyText}>لا توجد نتائج حالياً.</Text>
      </View>
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
    paddingHorizontal: 20,
  },

  emptyText: {
    width: '100%',
    fontSize: 16,
    color: '#999999',
    fontStyle: 'italic',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
});