import React from 'react';
import { Drawer } from 'expo-router/drawer';
import {
  DrawerContentScrollView,
  DrawerItemList,
} from '@react-navigation/drawer';
import {
  View,
  Text,
  Dimensions,
  Pressable,
  TouchableOpacity,
  StyleSheet,
  Linking,
  I18nManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const { height } = Dimensions.get('window');

const APP_PRIMARY = '#4A9F35';
const APP_PRIMARY_LIGHT = '#EAF1F7';
const APP_PRIMARY_BORDER = '#BFD0DF';

/**
 * Important pour Android + iOS :
 *
 * Dans certains APK Android, l'ancien état RTL natif peut rester actif
 * même si on a corrigé app/_layout.tsx.
 *
 * Dans ce cas, react-native-drawer-layout peut inverser physiquement
 * left/right. Donc pour obtenir un drawer physiquement à droite :
 *
 * - si I18nManager.isRTL === false => drawerPosition: 'right'
 * - si I18nManager.isRTL === true  => drawerPosition: 'left'
 *
 * Comme ça, le drawer reste à droite sur Android APK et iOS.
 */
const getPhysicalRightDrawerPosition = () => {
  return I18nManager.isRTL ? 'left' : 'right';
};

function CustomDrawerContent(props: any) {
  const router = useRouter();

  return (
    <View style={styles.drawerRoot}>
      <View style={styles.drawerHeader}>
        <View style={styles.profileContainer}>
          <TouchableOpacity
            style={styles.profileTouchable}
            onPress={() => router.push('/profile')}
            activeOpacity={0.8}
          >
            <View style={styles.profileCircle}>
              <Ionicons name="person" size={42} color={APP_PRIMARY} />
            </View>
          </TouchableOpacity>

          <View style={styles.nameBadge}>
            <Text style={styles.profileName}>Cheikh Beidja</Text>
          </View>
        </View>
      </View>

      <View style={styles.drawerMenuWrapper}>
        <DrawerContentScrollView
          {...props}
          contentContainerStyle={styles.drawerScrollContent}
        >
          <DrawerItemList {...props} />
        </DrawerContentScrollView>
      </View>

      <View style={styles.contactSection}>
        <View style={styles.sectionTitleWrapper}>
          <Text style={styles.sectionTitle}>اتصل بنا</Text>
        </View>

        <TouchableOpacity
          style={styles.contactRow}
          onPress={() => Linking.openURL('tel:+22249990707')}
          activeOpacity={0.75}
        >
          <View style={styles.iconContainer}>
            <Ionicons name="call" size={18} color={APP_PRIMARY} />
          </View>

          <Text style={styles.contactText}>+222 49990707</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.contactRow}
          onPress={() => Linking.openURL('mailto:contact@mcd.net')}
          activeOpacity={0.75}
        >
          <View style={styles.iconContainer}>
            <Ionicons name="mail" size={18} color={APP_PRIMARY} />
          </View>

          <Text style={styles.contactText}>contact@mcd.net</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.drawerFooter}>
        <Text style={styles.footerText}>تم التطوير بواسطة MCD.net</Text>
      </View>
    </View>
  );
}

export default function DrawerLayout() {
  const drawerPosition = getPhysicalRightDrawerPosition();

  return (
    <Drawer
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={({ navigation }) => ({
        drawerPosition,

        headerTitleAlign: 'center',
        headerLeft: () => null,

        headerRight: () => (
          <Pressable
            onPress={() => navigation.toggleDrawer()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.headerMenuButton}
          >
            <Ionicons name="menu" size={28} color="#FFFFFF" />
          </Pressable>
        ),

        headerStyle: {
          backgroundColor: APP_PRIMARY,
        },

        headerTintColor: '#FFFFFF',

        headerTitleStyle: {
          color: '#FFFFFF',
          fontWeight: '700',
          fontSize: 17,
        },

        drawerStyle: {
          width: 280,
          backgroundColor: '#FFFFFF',
        },

        drawerType: 'front',
        overlayColor: 'rgba(0, 0, 0, 0.35)',
        swipeEnabled: true,
        swipeEdgeWidth: 80,

        drawerIcon: () => null,

        drawerActiveTintColor: APP_PRIMARY,
        drawerInactiveTintColor: '#334155',

        drawerItemStyle: {
          borderRadius: 14,
          marginHorizontal: 10,
          marginVertical: 4,
        },

        drawerLabelStyle: {
          textAlign: 'right',
          writingDirection: 'rtl',
          fontWeight: '700',
        },
      })}
    >
      <Drawer.Screen
        name="home"
        options={{
          title: 'الرئيسية',
          drawerLabel: ({ color }) => (
            <View style={styles.customRow}>
              <View style={styles.customIconBox}>
                <Ionicons name="home-outline" size={22} color={color} />
              </View>

              <Text style={[styles.customText, { color }]}>الرئيسية</Text>
            </View>
          ),
        }}
      />

      <Drawer.Screen
        name="logout"
        options={{
          title: 'تسجيل الخروج',
          drawerLabel: () => (
            <View style={styles.customRow}>
              <View style={styles.customIconBox}>
                <Ionicons name="log-out-outline" size={22} color="#EF4444" />
              </View>

              <Text style={[styles.customText, styles.logoutText]}>
                تسجيل الخروج
              </Text>
            </View>
          ),
        }}
      />
    </Drawer>
  );
}

const styles = StyleSheet.create({
  drawerRoot: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    direction: 'ltr',
  },

  headerMenuButton: {
    marginRight: 15,
    padding: 6,
  },

  customRow: {
    width: '100%',
    flexDirection: 'row-reverse',
    direction: 'ltr',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 10,
  },

  customIconBox: {
    width: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },

  customText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    marginHorizontal: 12,
    textAlign: 'right',
    writingDirection: 'rtl',
  },

  logoutText: {
    color: '#EF4444',
  },

  drawerHeader: {
    height: height * 0.26,
    backgroundColor: APP_PRIMARY,
    justifyContent: 'center',
    alignItems: 'stretch',
    paddingHorizontal: 25,
    paddingTop: 20,
  },

  profileContainer: {
    width: '100%',
    direction: 'ltr',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },

  profileTouchable: {
    marginBottom: 10,
    alignSelf: 'flex-end',
  },

  profileCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: APP_PRIMARY_BORDER,
    elevation: 5,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },

  nameBadge: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },

  profileName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    textAlign: 'right',
    writingDirection: 'ltr',
  },

  drawerMenuWrapper: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  drawerScrollContent: {
    paddingTop: 10,
    paddingBottom: 0,
  },

  contactSection: {
    padding: 15,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },

  sectionTitleWrapper: {
    width: '100%',
    direction: 'ltr',
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginBottom: 10,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#64748B',
    textAlign: 'right',
    writingDirection: 'rtl',
  },

  contactRow: {
    width: '100%',
    flexDirection: 'row-reverse',
    direction: 'ltr',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: 12,
  },

  iconContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: APP_PRIMARY_LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },

  contactText: {
    flex: 1,
    fontSize: 15,
    color: '#334155',
    fontWeight: '500',
    textAlign: 'left',
    writingDirection: 'ltr',
  },

  drawerFooter: {
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },

  footerText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
});
