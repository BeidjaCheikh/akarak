import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useState } from 'react';
import { OtpInput } from 'react-native-otp-entry';
import { Ionicons } from '@expo/vector-icons';
import { verifyOtp } from '../src/api/auth.service';

const APP_PRIMARY = '#4A9F35';
const APP_PRIMARY_DARK = '#2F6B24';
const APP_PRIMARY_LIGHT = '#EAF7E6';
const APP_PRIMARY_BORDER = '#CFE8C7';
const APP_BACKGROUND = '#F6FAF5';
const APP_TEXT = '#172033';
const APP_MUTED = '#64748B';

export default function VerifyOtpScreen() {
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone: string }>();

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const isValid = otp.length === 4;

  const onVerify = async () => {
    if (!isValid || loading) return;

    setLoading(true);

    try {
      await verifyOtp(phone!, otp);
      router.replace('/login');
    } catch (error: any) {
      Alert.alert(
        'خطأ',
        error?.response?.data?.message || 'رمز التحقق غير صحيح'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'التحقق من الرقم',
          headerShadowVisible: false,
          headerTitleAlign: 'center',
          headerStyle: {
            backgroundColor: APP_PRIMARY,
          },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {
            color: '#FFFFFF',
            fontWeight: '900',
            fontSize: 17,
          },
        }}
      />

      <View style={styles.card}>
        <View style={styles.iconBox}>
          <Ionicons name="shield-checkmark-outline" size={42} color={APP_PRIMARY} />
        </View>

        <Text style={styles.title}>أدخل رمز التحقق</Text>

        <Text style={styles.subtitle}>تم إرسال رمز مكوّن من 4 أرقام إلى</Text>

        <Text style={styles.phone}>{phone}</Text>

        <OtpInput
          numberOfDigits={4}
          focusColor={APP_PRIMARY}
          onTextChange={(text) => setOtp(text)}
          theme={{
            containerStyle: styles.otpContainer,
            pinCodeContainerStyle: styles.codeInput,
            focusedPinCodeContainerStyle: styles.codeInputActive,
            pinCodeTextStyle: styles.codeText,
          }}
        />

        <TouchableOpacity
          onPress={onVerify}
          disabled={!isValid || loading}
          activeOpacity={0.85}
          style={[styles.btn, (!isValid || loading) && styles.btnDisabled]}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.btnText}>تأكيد</Text>
              <Ionicons name="checkmark-circle-outline" size={19} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => router.replace('/register')}
          style={styles.backToRegisterBtn}
        >
          <Text style={styles.backToRegisterText}>تغيير رقم الهاتف</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: APP_BACKGROUND,
    padding: 24,
    justifyContent: 'center',
    direction: 'ltr',
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    paddingHorizontal: 18,
    paddingVertical: 26,
    borderWidth: 1,
    borderColor: APP_PRIMARY_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: APP_PRIMARY_DARK,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },

  iconBox: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: APP_PRIMARY_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  title: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    writingDirection: 'rtl',
    marginBottom: 6,
    color: APP_TEXT,
  },

  subtitle: {
    textAlign: 'center',
    writingDirection: 'rtl',
    color: APP_MUTED,
    fontSize: 14,
    fontWeight: '700',
  },

  phone: {
    textAlign: 'center',
    fontWeight: '900',
    marginTop: 6,
    marginBottom: 24,
    color: APP_PRIMARY_DARK,
    fontSize: 15,
    writingDirection: 'ltr',
  },

  otpContainer: {
    width: 240,
    height: 80,
    alignSelf: 'center',
    direction: 'ltr',
  },

  codeInput: {
    width: 45,
    height: 55,
    borderWidth: 1.4,
    borderRadius: 14,
    borderColor: APP_PRIMARY_BORDER,
    backgroundColor: APP_PRIMARY_LIGHT,
  },

  codeInputActive: {
    borderColor: APP_PRIMARY,
    backgroundColor: '#FFFFFF',
  },

  codeText: {
    color: APP_TEXT,
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },

  btn: {
    width: '100%',
    height: 54,
    borderRadius: 16,
    backgroundColor: APP_PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    flexDirection: 'row-reverse',
    direction: 'ltr',
    gap: 8,
    elevation: 3,
    shadowColor: APP_PRIMARY,
    shadowOpacity: 0.22,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },

  btnDisabled: {
    opacity: 0.5,
  },

  btnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
    writingDirection: 'rtl',
  },

  backToRegisterBtn: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },

  backToRegisterText: {
    color: APP_PRIMARY,
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
});