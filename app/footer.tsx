import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type TabKey = 'home' | 'fav' | 'notif' | 'help';

type FooterProps = {
  activeTab: TabKey;
  setActiveTab: (tab: TabKey) => void;
};

type FooterItemProps = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  value: TabKey;
  route: string;
};

const APP_PRIMARY = '#4A9F35';
const APP_PRIMARY_DARK = '#2F6B24';
const APP_PRIMARY_LIGHT = '#EAF7E6';
const APP_BORDER = '#CFE8C7';
const APP_MUTED = '#817e7e';

export default function Footer({ activeTab, setActiveTab }: FooterProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const Item = ({ label, icon, value, route }: FooterItemProps) => {
    const active = activeTab === value;

    return (
      <TouchableOpacity
        style={styles.item}
        activeOpacity={0.75}
        onPress={() => {
          setActiveTab(value);
          router.replace(route as any);
        }}
      >
        <View style={[styles.iconBox, active && styles.iconBoxActive]}>
          <Ionicons
            name={icon}
            size={22}
            color={active ? APP_PRIMARY : APP_MUTED}
          />
        </View>

        <Text style={[styles.label, active && styles.labelActive]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View
      style={[
        styles.footer,
        {
          paddingBottom: insets.bottom + 6,
        },
      ]}
    >
      <Item
        label="الرئيسية"
        icon="home-outline"
        value="home"
        route="/(drawer)/home"
      />

      <Item
        label="الإشعارات"
        icon="notifications-outline"
        value="notif"
        route="/notifications"
      />

      <Item
        label="المساعدة"
        icon="help-circle-outline"
        value="help"
        route="/helps"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    flexDirection: 'row',
    direction: 'rtl',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: APP_BORDER,
    elevation: 8,
    shadowColor: APP_PRIMARY_DARK,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -3 },
  },

  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 3,
  },

  iconBox: {
    width: 34,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },

  iconBoxActive: {
    backgroundColor: APP_PRIMARY_LIGHT,
  },

  label: {
    fontSize: 12,
    color: APP_MUTED,
    fontWeight: '700',
    textAlign: 'center',
    writingDirection: 'rtl',
  },

  labelActive: {
    color: APP_PRIMARY,
    fontWeight: '900',
  },
});