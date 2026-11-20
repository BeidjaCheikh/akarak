import { View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';

export default function FavorisScreen() {

  return (
    <View style={styles.screen}>
      
      {/* Titre de la page */}
      <Stack.Screen options={{ title: 'المفضلة' }} />

      {/* Contenu */}
      <View style={styles.content}>
        <Text style={styles.emptyText}>
          قائمة المفضلة فارغة حالياً.
        </Text>
      </View>

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
  emptyText: {
    fontSize: 16,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
});