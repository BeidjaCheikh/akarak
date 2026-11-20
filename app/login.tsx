import React, { useEffect, useRef, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';
import { Ionicons } from '@expo/vector-icons';

import { login } from '../src/api/auth.service';
import { saveToken } from '../src/storage/token';

const BLUE = '#4A9F35';

const normalizeMauritaniaPhone = (value: string) => {
  return value.replace(/\D/g, '').slice(0, 8);
};

const isValidMauritaniaPhone = (value: string) => {
  return /^\d{8}$/.test(value);
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.labelWrapper}>
      <Text style={styles.label}>{children}</Text>
    </View>
  );
}

export default function LoginScreen() {
  const router = useRouter();
  const headerHeight = useHeaderHeight();
  const { height } = useWindowDimensions();

  const scrollRef = useRef<ScrollView>(null);

  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [validPhone, setValidPhone] = useState(true);
  const [loading, setLoading] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const compactMode = keyboardVisible || height < 720;

  useEffect(() => {
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';

    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => {
      setKeyboardVisible(true);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardVisible(false);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const softlyFocusPassword = () => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({
        y: compactMode ? 45 : 0,
        animated: true,
      });
    }, 180);
  };

  const onLogin = async () => {
    if (loading) return;

    Keyboard.dismiss();
    setPhoneTouched(true);

    const okPhone = isValidMauritaniaPhone(phoneNumber);
    setValidPhone(okPhone);

    if (!okPhone) {
      alert('رقم الهاتف غير صالح');
      return;
    }

    if (!password.trim() || password.trim().length < 4) {
      alert('كلمة المرور يجب أن تكون 4 أحرف على الأقل');
      return;
    }

    try {
      setLoading(true);

      const response = await login(phoneNumber, password);

      await saveToken(response.data.token);

      router.replace('/(drawer)/home');
    } catch (error: any) {
      console.log('❌ ERREUR LOGIN:', error);
      alert(error?.response?.data?.message || 'حدث خطأ أثناء تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'تسجيل الدخول',
          headerBackVisible: false,
          headerLeft: () => null,
          headerRight: () => null,
          headerTitleAlign: 'center',
          headerStyle: {
            backgroundColor: BLUE,
          },
          headerTintColor: '#FFFFFF',
          headerShadowVisible: false,
          headerTitleStyle: {
            color: '#FFFFFF',
            fontWeight: '700',
            fontSize: 17,
          },
        }}
      />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={[
              styles.container,
              compactMode ? styles.containerCompact : styles.containerNormal,
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            showsVerticalScrollIndicator={false}
          >
            <View
              style={[
                styles.hero,
                compactMode ? styles.heroCompact : styles.heroNormal,
              ]}
            >
              <Image
                source={require('../assets/images/android-icon-foreground.png')}
                style={[
                  styles.logo,
                  compactMode ? styles.logoCompact : styles.logoNormal,
                ]}
              />
            </View>

            <FieldLabel>رقم الهاتف</FieldLabel>

            <View
              style={[
                styles.phoneWrap,
                phoneTouched && !validPhone ? styles.phoneWrapError : null,
                phoneTouched && validPhone && phoneNumber.length === 8
                  ? styles.phoneWrapValid
                  : null,
              ]}
            >
              <View style={styles.phonePrefixBox}>
                <Text style={styles.phonePrefixText}>+222</Text>
              </View>

              <TextInput
                value={phoneNumber}
                onChangeText={(text) => {
                  const clean = normalizeMauritaniaPhone(text);
                  setPhoneNumber(clean);

                  if (!validPhone) {
                    setValidPhone(true);
                  }
                }}
                onBlur={() => {
                  setPhoneTouched(true);
                  setValidPhone(isValidMauritaniaPhone(phoneNumber));
                }}
                placeholder="رقم الهاتف"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                returnKeyType="next"
                maxLength={8}
                textAlign="right"
                style={styles.mauritaniaPhoneInput}
              />

              <View pointerEvents="none" style={styles.phoneIconInside}>
                <Ionicons name="call-outline" size={19} color="#6B7280" />
              </View>
            </View>

            {phoneTouched && !validPhone && (
              <View style={styles.errorWrapper}>
                <Text style={styles.errorText}>رقم الهاتف يجب أن يتكون من 8 أرقام</Text>
              </View>
            )}

            <View style={styles.passwordLabelSpacing}>
              <FieldLabel>كلمة المرور</FieldLabel>
            </View>

            <View style={styles.passwordShell}>
              <TouchableOpacity
                onPress={() => setShowPassword((prev) => !prev)}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.eyeButton}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={23}
                  color="#6B7280"
                />
              </TouchableOpacity>

              <TextInput
                style={styles.passwordInput}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                textAlign="right"
                placeholder="أدخل كلمة المرور"
                placeholderTextColor="#9CA3AF"
                returnKeyType="done"
                onFocus={softlyFocusPassword}
                onSubmitEditing={onLogin}
              />

              <Ionicons
                name="lock-closed-outline"
                size={19}
                color="#6B7280"
                style={styles.lockIcon}
              />
            </View>

            <TouchableOpacity
              onPress={onLogin}
              disabled={loading}
              activeOpacity={0.85}
              style={[styles.btn, loading && styles.btnDisabled]}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.btnText}>دخول</Text>
              )}
            </TouchableOpacity>

            <View style={styles.footerRow}>
              <TouchableOpacity
                onPress={() => router.push('/register')}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.link}>إنشاء حساب</Text>
              </TouchableOpacity>

              <Text style={styles.footerText}>ليس لديك حساب؟</Text>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F6FAF5',
  },

  keyboardView: {
    flex: 1,
    backgroundColor: '#F6FAF5',
  },

  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    backgroundColor: '#F6FAF5',
    direction: 'ltr',
    alignItems: 'stretch',
  },

  containerNormal: {
    justifyContent: 'center',
    paddingTop: 28,
    paddingBottom: 60,
  },

  containerCompact: {
    justifyContent: 'flex-start',
    paddingTop: 18,
    paddingBottom: 26,
  },

  hero: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },

  heroNormal: {
    marginBottom: 24,
  },

  heroCompact: {
    marginBottom: 12,
  },

  logo: {
    resizeMode: 'contain',
  },

  logoNormal: {
    width: 165,
    height: 165,
  },

  logoCompact: {
    width: 118,
    height: 118,
  },

  labelWrapper: {
    width: '100%',
    direction: 'ltr',
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginBottom: 8,
  },

  label: {
    textAlign: 'right',
    writingDirection: 'rtl',
    fontWeight: '800',
    fontSize: 14,
    color: '#111827',
  },

  passwordLabelSpacing: {
    marginTop: 14,
  },

  phoneWrap: {
    width: '100%',
    height: 56,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    direction: 'ltr',
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },

  phoneWrapError: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },

  phoneWrapValid: {
    borderColor: '#86D678',
    backgroundColor: '#EAF7E6',
  },

  phonePrefixBox: {
    height: 56,
    minWidth: 74,
    paddingHorizontal: 12,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },

  phonePrefixText: {
    fontSize: 15,
    fontWeight: '900',
    color: BLUE,
    textAlign: 'center',
    writingDirection: 'ltr',
  },

  phoneIconInside: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },

  mauritaniaPhoneInput: {
    flex: 1,
    height: 56,
    fontSize: 15,
    color: '#111827',
    textAlign: 'right',
    writingDirection: 'rtl',
    textAlignVertical: 'center',
    paddingVertical: 0,
    paddingLeft: 12,
    paddingRight: 42,
    includeFontPadding: false,
    fontWeight: '700',
  },

  passwordShell: {
    width: '100%',
    height: 54,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    direction: 'ltr',
  },

  lockIcon: {
    marginLeft: 8,
  },

  passwordInput: {
    flex: 1,
    height: 54,
    fontSize: 15,
    color: '#111827',
    textAlign: 'right',
    writingDirection: 'rtl',
    paddingHorizontal: 8,
  },

  eyeButton: {
    padding: 4,
  },

  btn: {
    width: '100%',
    marginTop: 20,
    height: 54,
    borderRadius: 16,
    backgroundColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },

  btnDisabled: {
    opacity: 0.7,
  },

  btnText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 16,
    textAlign: 'center',
    writingDirection: 'rtl',
  },

  footerRow: {
    width: '100%',
    marginTop: 14,
    flexDirection: 'row',
    direction: 'ltr',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },

  footerText: {
    color: '#111827',
    fontSize: 14,
    textAlign: 'right',
    writingDirection: 'rtl',
  },

  link: {
    color: BLUE,
    fontWeight: '900',
    fontSize: 14,
    textAlign: 'right',
    writingDirection: 'rtl',
  },

  errorWrapper: {
    width: '100%',
    direction: 'ltr',
    alignItems: 'flex-end',
    marginTop: 6,
  },

  errorText: {
    color: '#DC2626',
    textAlign: 'right',
    writingDirection: 'rtl',
    fontSize: 13,
    fontWeight: '700',
  },
});