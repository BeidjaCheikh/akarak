import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Footer from '../footer';

type TabKey = 'home' | 'fav' | 'notif' | 'help';

type CardProps = {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  onPress: () => void;
  delay: number;
};

const APP_PRIMARY = '#4A9F35';
const APP_PRIMARY_DARK = '#2F6B24';
const APP_PRIMARY_MEDIUM = '#63B84A';
const APP_PRIMARY_SOFT = '#EAF7E6';
const APP_BACKGROUND = '#F6FAF5';
const APP_BACKGROUND_LIGHT = '#FFFFFF';
const APP_BORDER = '#CFE8C7';
const APP_TEXT = '#172033';
const APP_MUTED = '#64748B';

const AnimatedCard = ({
  title,
  subtitle,
  icon,
  iconColor,
  onPress,
  delay,
}: CardProps) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(18)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 420,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 420,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay, fadeAnim, slideAnim]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      style={[
        styles.cardWrapper,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
        },
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        style={styles.cardTouchable}
      >
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Ionicons name={icon} size={43} color={iconColor} />
          </View>

          <Text style={styles.cardTitle} numberOfLines={1}>
            {title}
          </Text>

          <Text style={styles.cardSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function HomeScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>('home');

  const cards = [
    {
      title: 'إضافة عقار',
      subtitle: 'للبيع أو للإيجار',
      icon: 'add-circle' as keyof typeof Ionicons.glyphMap,
      iconColor: APP_PRIMARY,
      route: '/add-property',
    },
    {
      title: 'البحث',
      subtitle: 'ابحث عن عقار',
      icon: 'search' as keyof typeof Ionicons.glyphMap,
      iconColor: APP_PRIMARY,
      route: '/public-products',
    },
    {
      title: 'من حولي',
      subtitle: 'البحث على الخريطة',
      icon: 'location' as keyof typeof Ionicons.glyphMap,
      iconColor: APP_PRIMARY,
      route: '/maps_search',
    },
    {
      title: 'عقاراتي',
      subtitle: 'إدارة إعلاناتك',
      icon: 'business' as keyof typeof Ionicons.glyphMap,
      iconColor: APP_PRIMARY,
      route: '/my-properties',
    },
    {
      title: 'المفضلة',
      subtitle: 'العقارات المفضلة',
      icon: 'star' as keyof typeof Ionicons.glyphMap,
      iconColor: APP_PRIMARY,
      route: '/favoris',
    },
  ];

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={[APP_BACKGROUND, APP_BACKGROUND_LIGHT]}
        style={StyleSheet.absoluteFillObject}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.sectionLabelWrapper}>
          <View style={styles.sectionBadge}>
            <Ionicons name="apps-outline" size={15} color={APP_PRIMARY_DARK} />
            <Text style={styles.sectionLabel}>الخدمات</Text>
          </View>
        </View>

        <View style={styles.grid}>
          {cards.map((card, index) => (
            <AnimatedCard
              key={card.route}
              title={card.title}
              subtitle={card.subtitle}
              icon={card.icon}
              iconColor={card.iconColor}
              onPress={() => router.push(card.route as any)}
              delay={100 + index * 70}
            />
          ))}
        </View>
      </ScrollView>

      <Footer activeTab={activeTab} setActiveTab={setActiveTab} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: APP_BACKGROUND,
    direction: 'ltr',
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
    paddingTop: 56,
  },

  sectionLabelWrapper: {
    width: '100%',
    direction: 'ltr',
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginBottom: 14,
  },

  sectionBadge: {
    flexDirection: 'row-reverse',
    direction: 'ltr',
    alignItems: 'center',
    gap: 7,
    backgroundColor: APP_PRIMARY_SOFT,
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: APP_BORDER,
  },

  sectionLabel: {
    fontSize: 13,
    fontWeight: '900',
    color: APP_PRIMARY_DARK,
    textAlign: 'right',
    writingDirection: 'rtl',
    letterSpacing: 0.8,
  },

  grid: {
    width: '100%',
    flexDirection: 'row-reverse',
    direction: 'ltr',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  cardWrapper: {
    width: '48%',
    marginBottom: 14,
  },

  cardTouchable: {
    borderRadius: 22,
  },

  card: {
    height: 138,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: APP_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,

    // Shadow noir comme les cards bancaires simples
    elevation: 5,
    shadowColor: '#000000',
    shadowOpacity: 0.10,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
  },

  iconContainer: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  cardTitle: {
    width: '100%',
    fontSize: 15,
    fontWeight: '900',
    color: APP_TEXT,
    textAlign: 'center',
    writingDirection: 'rtl',
  },

  cardSubtitle: {
    width: '100%',
    marginTop: 4,
    fontSize: 11.5,
    color: APP_MUTED,
    fontWeight: '800',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
});
