import React, { useMemo, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { register } from '../src/api/auth.service';

const BLUE = '#4A9F35';

const NAME_REGEX =
  /^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FFa-zA-ZÀ-ÖØ-öø-ÿ\s''-]{2,}$/;

const normalizeMauritaniaPhone = (value: string) => {
  return value.replace(/\D/g, '').slice(0, 8);
};

const isValidMauritaniaPhone = (value: string) => {
  return /^\d{8}$/.test(value);
};

const validateFirstName = (v: string): string | null => {
  if (!v.trim()) return 'الاسم الشخصي مطلوب';
  if (v.trim().length < 2) return 'الاسم الشخصي يجب أن يكون حرفين على الأقل';
  if (/[0-9]/.test(v)) return 'الاسم لا يمكن أن يحتوي على أرقام';
  if (!NAME_REGEX.test(v.trim())) return 'الاسم يحتوي على رموز غير مسموح بها';
  return null;
};

const validateLastName = (v: string): string | null => {
  if (!v.trim()) return 'اسم العائلة مطلوب';
  if (v.trim().length < 2) return 'اسم العائلة يجب أن يكون حرفين على الأقل';
  if (/[0-9]/.test(v)) return 'الاسم لا يمكن أن يحتوي على أرقام';
  if (!NAME_REGEX.test(v.trim())) return 'الاسم يحتوي على رموز غير مسموح بها';
  return null;
};

const validatePassword = (v: string): string | null => {
  if (!v) return 'كلمة المرور مطلوبة';
  if (v.length < 4) return 'كلمة المرور يجب أن تكون 4 أحرف على الأقل';
  if (v.length > 50) return 'كلمة المرور طويلة جداً';
  return null;
};

const validateConfirmPassword = (
  pass: string,
  confirm: string
): string | null => {
  if (!confirm) return 'تأكيد كلمة المرور مطلوب';
  if (pass !== confirm) return 'كلمتا المرور غير متطابقتين';
  return null;
};

type TouchedFields = {
  firstName: boolean;
  lastName: boolean;
  phone: boolean;
  password: boolean;
  confirmPass: boolean;
};

function FieldLabel({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: any;
}) {
  return (
    <View style={[styles.labelWrapper, style]}>
      <Text style={styles.label}>{children}</Text>
    </View>
  );
}

export default function RegisterScreen() {
  const router = useRouter();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const [touched, setTouched] = useState<TouchedFields>({
    firstName: false,
    lastName: false,
    phone: false,
    password: false,
    confirmPass: false,
  });

  const touch = (field: keyof TouchedFields) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const errors = useMemo(() => {
    const isPhoneValid = isValidMauritaniaPhone(phoneNumber);

    return {
      firstName: validateFirstName(firstName),
      lastName: validateLastName(lastName),
      phone: !isPhoneValid ? 'رقم الهاتف يجب أن يتكون من 8 أرقام' : null,
      password: validatePassword(password),
      confirmPass: validateConfirmPassword(password, confirmPass),
    };
  }, [firstName, lastName, phoneNumber, password, confirmPass]);

  const isFormValid = Object.values(errors).every((e) => e === null);

  const shellStyle = (field: keyof TouchedFields) => [
    styles.inputShell,
    touched[field] && errors[field] ? styles.inputShellError : null,
    touched[field] && !errors[field] ? styles.inputShellValid : null,
  ];

  const phoneShellStyle = [
    styles.phoneWrap,
    touched.phone && errors.phone ? styles.phoneWrapError : null,
    touched.phone && !errors.phone ? styles.phoneWrapValid : null,
  ];

  const renderError = (field: keyof TouchedFields) => {
    if (!touched[field] || !errors[field]) return null;

    return (
      <View style={styles.errorRow}>
        <Ionicons name="alert-circle" size={13} color="#DC2626" />
        <Text style={styles.errorText}>{errors[field]}</Text>
      </View>
    );
  };

  const validationIcon = (field: keyof TouchedFields) => {
    if (!touched[field]) return null;

    return errors[field] ? (
      <Ionicons name="close-circle" size={18} color="#DC2626" />
    ) : (
      <Ionicons name="checkmark-circle" size={18} color="#10B981" />
    );
  };

  const passwordRightIcon = () => {
    if (!touched.password) {
      return <Ionicons name="lock-closed-outline" size={18} color="#6B7280" />;
    }

    return errors.password ? (
      <Ionicons name="close-circle" size={18} color="#DC2626" />
    ) : (
      <Ionicons name="checkmark-circle" size={18} color="#10B981" />
    );
  };

  const confirmRightIcon = () => {
    if (!touched.confirmPass) {
      return (
        <Ionicons name="shield-checkmark-outline" size={18} color="#6B7280" />
      );
    }

    return errors.confirmPass ? (
      <Ionicons name="close-circle" size={18} color="#DC2626" />
    ) : (
      <Ionicons name="checkmark-circle" size={18} color="#10B981" />
    );
  };

  const onRegister = async () => {
    setTouched({
      firstName: true,
      lastName: true,
      phone: true,
      password: true,
      confirmPass: true,
    });

    if (!isFormValid) return;

    setLoading(true);

    try {
      await register({
        telephone: phoneNumber,
        password,
        nom: lastName,
        prenom: firstName,
      });

      router.replace({
        pathname: '/verify-otp',
        params: { phone: phoneNumber },
      });
    } catch (e: any) {
      alert(e?.response?.data?.message || 'فشل إنشاء الحساب');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      <Stack.Screen
        options={{
          title: 'إنشاء حساب',
          headerShadowVisible: false,
        }}
      />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <FieldLabel>
              الاسم الشخصي <Text style={styles.required}>*</Text>
            </FieldLabel>

            <View style={shellStyle('firstName')}>
              <View style={styles.rightIcon}>
                <Ionicons name="person-outline" size={18} color="#6B7280" />
              </View>

              <TextInput
                value={firstName}
                onChangeText={(v) => {
                  setFirstName(v);
                  touch('firstName');
                }}
                onBlur={() => touch('firstName')}
                placeholder="أدخل اسمك الشخصي"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
                textAlign="right"
                returnKeyType="next"
              />

              <View style={styles.leftIcon}>{validationIcon('firstName')}</View>
            </View>

            {renderError('firstName')}

            <FieldLabel style={styles.labelSpacing}>
              اسم العائلة <Text style={styles.required}>*</Text>
            </FieldLabel>

            <View style={shellStyle('lastName')}>
              <View style={styles.rightIcon}>
                <Ionicons name="person-outline" size={18} color="#6B7280" />
              </View>

              <TextInput
                value={lastName}
                onChangeText={(v) => {
                  setLastName(v);
                  touch('lastName');
                }}
                onBlur={() => touch('lastName')}
                placeholder="أدخل اسم العائلة"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
                textAlign="right"
                returnKeyType="next"
              />

              <View style={styles.leftIcon}>{validationIcon('lastName')}</View>
            </View>

            {renderError('lastName')}

            <FieldLabel style={styles.labelSpacing}>
              رقم الهاتف <Text style={styles.required}>*</Text>
            </FieldLabel>

            <View style={phoneShellStyle}>
              <View style={styles.phonePrefixBox}>
                <Text style={styles.phonePrefixText}>+222</Text>
              </View>

              <TextInput
                value={phoneNumber}
                onChangeText={(text) => {
                  setPhoneNumber(normalizeMauritaniaPhone(text));
                  touch('phone');
                }}
                onBlur={() => touch('phone')}
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

            {renderError('phone')}

            <FieldLabel style={styles.labelSpacing}>
              كلمة المرور <Text style={styles.required}>*</Text>
            </FieldLabel>

            <View style={shellStyle('password')}>
              <View style={styles.rightIcon}>{passwordRightIcon()}</View>

              <TextInput
                value={password}
                onChangeText={(v) => {
                  setPassword(v);
                  touch('password');
                }}
                onBlur={() => touch('password')}
                secureTextEntry={!showPassword}
                style={styles.input}
                textAlign="right"
                placeholder="أدخل كلمة المرور (4 أحرف على الأقل)"
                placeholderTextColor="#9CA3AF"
                returnKeyType="next"
              />

              <TouchableOpacity
                onPress={() => setShowPassword((s) => !s)}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.eyeButton}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color="#6B7280"
                />
              </TouchableOpacity>
            </View>

            {renderError('password')}

            <FieldLabel style={styles.labelSpacing}>
              تأكيد كلمة المرور <Text style={styles.required}>*</Text>
            </FieldLabel>

            <View style={shellStyle('confirmPass')}>
              <View style={styles.rightIcon}>{confirmRightIcon()}</View>

              <TextInput
                value={confirmPass}
                onChangeText={(v) => {
                  setConfirmPass(v);
                  touch('confirmPass');
                }}
                onBlur={() => touch('confirmPass')}
                secureTextEntry={!showConfirm}
                style={styles.input}
                textAlign="right"
                placeholder="أعد إدخال كلمة المرور"
                placeholderTextColor="#9CA3AF"
                returnKeyType="done"
                onSubmitEditing={onRegister}
              />

              <TouchableOpacity
                onPress={() => setShowConfirm((s) => !s)}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.eyeButton}
              >
                <Ionicons
                  name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color="#6B7280"
                />
              </TouchableOpacity>
            </View>

            {renderError('confirmPass')}

            <TouchableOpacity
              onPress={onRegister}
              disabled={loading}
              activeOpacity={0.85}
              style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryBtnText}>إنشاء حساب</Text>
              )}
            </TouchableOpacity>

            <View style={styles.footerRow}>
              <TouchableOpacity
                onPress={() => router.replace('/login')}
                activeOpacity={0.7}
              >
                <Text style={styles.footerLink}>تسجيل الدخول</Text>
              </TouchableOpacity>

              <Text style={styles.footerText}>لديك حساب بالفعل؟</Text>
            </View>
          </View>
        </ScrollView>
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
    padding: 20,
    paddingBottom: 120,
    backgroundColor: '#F6FAF5',
    direction: 'ltr',
    alignItems: 'stretch',
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#CFE8C7',
    direction: 'ltr',
    alignItems: 'stretch',
    ...Platform.select({
      ios: {
        shadowColor: '#2F6B24',
        shadowOpacity: 0,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 8 },
      },
      android: {
        elevation: 2,
      },
    }),
  },

  labelWrapper: {
    width: '100%',
    direction: 'ltr',
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginBottom: 8,
  },

  labelSpacing: {
    marginTop: 14,
  },

  label: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'right',
    writingDirection: 'rtl',
  },

  required: {
    color: '#DC2626',
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

  inputShell: {
    width: '100%',
    height: 54,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    direction: 'ltr',
  },

  inputShellError: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },

  inputShellValid: {
    borderColor: '#86D678',
    backgroundColor: '#EAF7E6',
  },

  rightIcon: {
    width: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },

  leftIcon: {
    width: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },

  eyeButton: {
    width: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },

  input: {
    flex: 1,
    height: 54,
    fontSize: 15,
    color: '#111827',
    fontWeight: '700',
    paddingHorizontal: 8,
    textAlign: 'right',
    writingDirection: 'rtl',
  },

  errorRow: {
    width: '100%',
    direction: 'ltr',
    flexDirection: 'row-reverse',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: 4,
    marginTop: 5,
  },

  errorText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
    writingDirection: 'rtl',
  },

  primaryBtn: {
    marginTop: 20,
    height: 54,
    borderRadius: 16,
    backgroundColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },

  primaryBtnDisabled: {
    opacity: 0.4,
  },

  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
    writingDirection: 'rtl',
  },

  footerRow: {
    flexDirection: 'row',
    direction: 'ltr',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
  },

  footerText: {
    color: '#374151',
    fontWeight: '800',
    textAlign: 'right',
    writingDirection: 'rtl',
  },

  footerLink: {
    color: BLUE,
    fontWeight: '900',
    textDecorationLine: 'underline',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});