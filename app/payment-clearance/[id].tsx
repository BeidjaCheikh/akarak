import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import {
  submitProductPayment,
  PaymentTransactionFile,
} from '@/src/api/product/service';

const APP_PRIMARY = '#4A9F35';
const APP_PRIMARY_DARK = '#2F6B24';
const APP_PRIMARY_LIGHT = '#EAF7E6';
const APP_PRIMARY_BORDER = '#CFE8C7';
const APP_BACKGROUND = '#F6FAF5';
const APP_CARD_SOFT = '#F6FAF5';

type FormErrors = {
  number_phone?: string;
  amount?: string;
  file_transaction?: string;
  submit?: string;
};

const isValidPhone = (value: string) => {
  const cleaned = value.trim().replace(/\s/g, '');
  return /^[0-9]{8}$/.test(cleaned);
};

const getImageExtensionFromMime = (mimeType?: string) => {
  if (!mimeType) return 'jpg';

  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('webp')) return 'webp';
  if (mimeType.includes('heic')) return 'heic';
  if (mimeType.includes('heif')) return 'heif';
  if (mimeType.includes('jpeg')) return 'jpg';
  if (mimeType.includes('jpg')) return 'jpg';

  return 'jpg';
};

export default function PaymentClearanceScreen() {
  const params = useLocalSearchParams();

  const productId = useMemo(() => {
    const id = params.id;
    return Array.isArray(id) ? id[0] : id;
  }, [params.id]);

  const [numberPhone, setNumberPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [fileTransaction, setFileTransaction] =
    useState<PaymentTransactionFile | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const clearError = (field: keyof FormErrors) => {
    setErrors((prev) => ({
      ...prev,
      [field]: undefined,
      submit: undefined,
    }));
  };

  const validate = () => {
    const nextErrors: FormErrors = {};

    if (!numberPhone.trim()) {
      nextErrors.number_phone = 'أدخل رقم الهاتف';
    } else if (!isValidPhone(numberPhone)) {
      nextErrors.number_phone = 'رقم الهاتف يجب أن يتكون من 8 أرقام';
    }

    if (!amount.trim()) {
      nextErrors.amount = 'أدخل المبلغ';
    } else {
      const numericAmount = Number(amount);

      if (Number.isNaN(numericAmount) || numericAmount <= 0) {
        nextErrors.amount = 'المبلغ غير صالح';
      }
    }

    if (!fileTransaction) {
      nextErrors.file_transaction = 'أرفق صورة وصل الدفع';
    }

    if (!productId) {
      nextErrors.submit = 'معرّف العقار غير موجود';
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  const pickTransactionImage = async () => {
    try {
      clearError('file_transaction');

      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        setErrors((prev) => ({
          ...prev,
          file_transaction: 'يجب السماح للتطبيق بالوصول إلى الصور',
        }));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: false,
        quality: 0.9,
        base64: false,
        exif: false,
      });

      if (result.canceled) return;

      const asset = result.assets?.[0];

      if (!asset?.uri) {
        setErrors((prev) => ({
          ...prev,
          file_transaction: 'تعذر اختيار الصورة',
        }));
        return;
      }

      const mimeType = asset.mimeType || 'image/jpeg';

      if (!mimeType.startsWith('image/')) {
        setErrors((prev) => ({
          ...prev,
          file_transaction: 'يجب اختيار صورة فقط',
        }));
        return;
      }

      const extension = getImageExtensionFromMime(mimeType);

      setFileTransaction({
        uri: asset.uri,
        name: asset.fileName || `transaction-image-${Date.now()}.${extension}`,
        mimeType,
      });
    } catch (e: any) {
      console.log('PICK PAYMENT IMAGE ERROR:', e?.message || e);

      setErrors((prev) => ({
        ...prev,
        file_transaction: 'حدث خطأ أثناء اختيار الصورة',
      }));
    }
  };

  const removeFile = () => {
    setFileTransaction(null);
    clearError('file_transaction');
  };

  const handleSubmit = async () => {
    if (submitting || successVisible) return;

    if (!validate()) return;

    try {
      setSubmitting(true);
      setErrors({});

      if (!productId || !fileTransaction) {
        setErrors({
          submit: 'البيانات غير مكتملة',
        });
        return;
      }

      const payload = {
        number_phone: numberPhone.trim(),
        amount: Number(amount),
        code_uuid: String(productId),
        file_transaction: fileTransaction,
      };

      console.log('PAYMENT PAYLOAD:', {
        number_phone: payload.number_phone,
        amount: payload.amount,
        code_uuid: payload.code_uuid,
        file_transaction: {
          uri: payload.file_transaction.uri,
          name: payload.file_transaction.name,
          mimeType: payload.file_transaction.mimeType,
        },
      });

      const response = await submitProductPayment(payload);

      console.log('PAYMENT RESPONSE:', JSON.stringify(response, null, 2));

      setSuccessVisible(true);

      setTimeout(() => {
        router.replace('/my-properties' as any);
      }, 1800);
    } catch (e: any) {
      console.log('SUBMIT PAYMENT ERROR:', {
        message: e?.message,
        status: e?.response?.status,
        data: e?.response?.data,
      });

      setErrors({
        submit: 'تعذر إرسال المخالصة، حاول مرة أخرى',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen
        options={{
          title: 'المخالصة',
          headerShadowVisible: false,
        }}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="card-outline" size={22} color={APP_PRIMARY} />

            <Text style={styles.sectionTitle}>معلومات الدفع</Text>
          </View>

          <View style={styles.fieldBox}>
            <Text style={styles.fieldLabel}>رقم الهاتف *</Text>

            <View
              style={[
                styles.inputContainer,
                errors.number_phone && styles.inputErrorBorder,
              ]}
            >
              <TextInput
                style={styles.input}
                placeholder="مثلاً: 49990707"
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
                value={numberPhone}
                maxLength={8}
                editable={!submitting && !successVisible}
                onChangeText={(value) => {
                  const onlyNumbers = value.replace(/[^0-9]/g, '').slice(0, 8);
                  setNumberPhone(onlyNumbers);
                  clearError('number_phone');
                }}
              />

              <Ionicons
                name="call-outline"
                size={19}
                color={APP_PRIMARY}
                style={styles.inputIcon}
              />
            </View>

            {!!errors.number_phone && (
              <Text style={styles.fieldError}>{errors.number_phone}</Text>
            )}
          </View>

          <View style={styles.fieldBox}>
            <Text style={styles.fieldLabel}>المبلغ *</Text>

            <View
              style={[
                styles.inputContainer,
                errors.amount && styles.inputErrorBorder,
              ]}
            >
              <TextInput
                style={styles.input}
                placeholder="المبلغ"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                value={amount}
                editable={!submitting && !successVisible}
                onChangeText={(value) => {
                  const cleaned = value.replace(/[^0-9.]/g, '');
                  setAmount(cleaned);
                  clearError('amount');
                }}
              />

              <Text style={styles.amountUnit}>MRU</Text>
            </View>

            {!!errors.amount && (
              <Text style={styles.fieldError}>{errors.amount}</Text>
            )}
          </View>

          <View style={styles.fieldBox}>
            <Text style={styles.fieldLabel}>صورة وصل الدفع *</Text>

            {!fileTransaction ? (
              <TouchableOpacity
                style={[
                  styles.filePickerBox,
                  errors.file_transaction && styles.filePickerError,
                ]}
                activeOpacity={0.85}
                onPress={pickTransactionImage}
                disabled={submitting || successVisible}
              >
                <View style={styles.filePickerIconBox}>
                  <Ionicons
                    name="images-outline"
                    size={30}
                    color={APP_PRIMARY}
                  />
                </View>

                <Text style={styles.filePickerTitle}>
                  حمل صورة من المعرض
                </Text>

               
              </TouchableOpacity>
            ) : (
              <View style={styles.selectedImageBox}>
                <Image
                  source={{ uri: fileTransaction.uri }}
                  style={styles.selectedImagePreview}
                  resizeMode="cover"
                />

                <View style={styles.selectedFileContent}>
                  <TouchableOpacity
                    style={styles.removeFileButton}
                    activeOpacity={0.85}
                    onPress={removeFile}
                    disabled={submitting || successVisible}
                  >
                    <Ionicons name="close" size={18} color="#DC2626" />
                  </TouchableOpacity>

                  <View style={styles.selectedFileInfo}>
                    <Text style={styles.selectedFileName} numberOfLines={1}>
                      {fileTransaction.name}
                    </Text>

                    <Text style={styles.selectedFileType} numberOfLines={1}>
                      {fileTransaction.mimeType || 'image/jpeg'}
                    </Text>
                  </View>

                  <View style={styles.selectedFileIconBox}>
                    <Ionicons
                      name="image-outline"
                      size={24}
                      color={APP_PRIMARY}
                    />
                  </View>
                </View>
              </View>
            )}

            {!!errors.file_transaction && (
              <Text style={styles.fieldError}>{errors.file_transaction}</Text>
            )}
          </View>

          {!!errors.submit && (
            <View style={styles.submitErrorBox}>
              <Ionicons
                name="alert-circle-outline"
                size={18}
                color="#DC2626"
              />

              <Text style={styles.submitErrorText}>{errors.submit}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.submitButton,
              (submitting || successVisible) && styles.submitButtonDisabled,
            ]}
            activeOpacity={0.85}
            onPress={handleSubmit}
            disabled={submitting || successVisible}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Ionicons name="send-outline" size={18} color="#FFF" />
            )}

            <Text style={styles.submitButtonText}>
              {submitting ? 'جاري الإرسال...' : 'إرسال'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {successVisible && (
        <View style={styles.successOverlay}>
          <View style={styles.successCard}>
            <View style={styles.successIconBox}>
              <Ionicons name="checkmark-circle" size={42} color={APP_PRIMARY} />
            </View>

            <Text style={styles.successTitle}>تم إرسال المخالصة بنجاح</Text>

            <Text style={styles.successSubtitle}>
              سيتم تحويلك تلقائياً خلال لحظات
            </Text>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: APP_BACKGROUND,
    direction: 'ltr',
  },

  content: {
    padding: 16,
    paddingBottom: 40,
  },

  formCard: {
    backgroundColor: '#FFF',
    borderRadius: 22,
    padding: 15,
    borderWidth: 1,
    borderColor: APP_PRIMARY_BORDER,
    gap: 13,
    elevation: 2,
    shadowColor: APP_PRIMARY_DARK,
    shadowOpacity: 0.06,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 3 },
  },

  sectionHeader: {
    flexDirection: 'row-reverse',
    direction: 'ltr',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },

  sectionTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '900',
    color: '#172033',
    textAlign: 'right',
    writingDirection: 'rtl',
  },

  fieldBox: {
    gap: 6,
  },

  fieldLabel: {
    fontSize: 13,
    fontWeight: '900',
    color: '#172033',
    textAlign: 'right',
    writingDirection: 'rtl',
  },

  inputContainer: {
    height: 54,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    direction: 'ltr',
    alignItems: 'center',
    paddingHorizontal: 14,
  },

  inputErrorBorder: {
    borderColor: '#DC2626',
  },

  input: {
    flex: 1,
    fontSize: 14,
    color: '#172033',
    fontWeight: '800',
    textAlign: 'right',
    writingDirection: 'ltr',
    paddingVertical: 0,
  },

  inputIcon: {
    marginLeft: 10,
  },

  amountUnit: {
    marginLeft: 10,
    color: APP_PRIMARY,
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
    writingDirection: 'ltr',
  },

  fieldError: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'right',
    writingDirection: 'rtl',
  },

  filePickerBox: {
    minHeight: 130,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: APP_PRIMARY_BORDER,
    borderStyle: 'dashed',
    backgroundColor: APP_BACKGROUND,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 7,
  },

  filePickerError: {
    borderColor: '#DC2626',
    backgroundColor: '#FFF5F5',
  },

  filePickerIconBox: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: APP_PRIMARY_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },

  filePickerTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#172033',
    textAlign: 'center',
    writingDirection: 'rtl',
  },

  filePickerSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textAlign: 'center',
    writingDirection: 'rtl',
  },

  selectedImageBox: {
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: APP_PRIMARY_BORDER,
    backgroundColor: APP_BACKGROUND,
    overflow: 'hidden',
  },

  selectedImagePreview: {
    width: '100%',
    height: 180,
    backgroundColor: '#E2E8F0',
  },

  selectedFileContent: {
    minHeight: 68,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    direction: 'ltr',
    alignItems: 'center',
    gap: 10,
  },

  removeFileButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },

  selectedFileInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },

  selectedFileName: {
    fontSize: 13,
    color: '#172033',
    fontWeight: '900',
    textAlign: 'right',
    writingDirection: 'rtl',
  },

  selectedFileType: {
    marginTop: 2,
    fontSize: 11,
    color: '#64748B',
    fontWeight: '700',
    textAlign: 'right',
    writingDirection: 'ltr',
  },

  selectedFileIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: APP_PRIMARY_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },

  submitErrorBox: {
    backgroundColor: '#FEE2E2',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row-reverse',
    direction: 'ltr',
    alignItems: 'center',
    gap: 7,
  },

  submitErrorText: {
    flex: 1,
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '800',
    textAlign: 'right',
    writingDirection: 'rtl',
  },

  submitButton: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: APP_PRIMARY,
    flexDirection: 'row-reverse',
    direction: 'ltr',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 4,
    shadowColor: APP_PRIMARY,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },

  submitButtonDisabled: {
    opacity: 0.65,
  },

  submitButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
    writingDirection: 'rtl',
  },

  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    zIndex: 999,
  },

  successCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 26,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    elevation: 8,
    shadowColor: APP_PRIMARY_DARK,
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
  },

  successIconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },

  successTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#172033',
    textAlign: 'center',
    writingDirection: 'rtl',
  },

  successSubtitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748B',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
});