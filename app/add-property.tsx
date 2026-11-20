import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Stack, router } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Platform,
  Image,
  Switch,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  FlatList,
  ActivityIndicator,
  Pressable,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  getPropertyCategories,
  getCategoryCharacteristics,
  getPaidFeesByAmount,
  createProduct,
} from '@/src/api/product/service';
import { getCities, getZonesByCity } from '@/src/api/location/service';
import { uploadFile } from '@/src/api/files/service';

import { CategoryDto, CharacteristicDto } from '@/src/types/category';
import { CityDto, ZoneDto } from '@/src/types/location';
import { getCharacteristicIcon } from '@/src/utils/characteristicIcons';


type ListingStatus = 'VENDRE' | 'ALLOUER';
type PreviewType = 'image' | 'video' | null;
type LocationSelectType = 'city' | 'zone' | null;

type FormErrors = {
  title?: string;
  description?: string;
  price?: string;
  telContact?: string;
  whatsapp?: string;
  category?: string;
  city?: string;
  zone?: string;
  location?: string;
  media?: string;
  submit?: string;
};

type CharacteristicErrors = Record<number, string>;

const MIN_IMAGES = 1;
const MAX_IMAGES = 4;
const MAX_VIDEOS = 1;

const APP_PRIMARY = '#4A9F35';
const APP_PRIMARY_DARK = '#2F6B24';
const APP_PRIMARY_LIGHT = '#EAF7E6';
const APP_PRIMARY_BORDER = '#CFE8C7';
const APP_BACKGROUND = '#F6FAF5';

type TextFieldKind =
  | 'surface'
  | 'length'
  | 'width'
  | 'height'
  | 'frontage'
  | 'street_width'
  | 'dimension'
  | 'plain';

const normalizeArabicLabel = (libelle: string) =>
  String(libelle || '')
    .trim()
    .replace(/[ًٌٍَُِّْـ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ');

const getDisplayCharacteristicLabel = (libelle: string) => {
  const original = String(libelle || '').trim();
  const normalized = normalizeArabicLabel(original);

  const exactLabels: Record<string, string> = {
    طول: 'الطول',
    الطول: 'الطول',
    عرض: 'العرض',
    العرض: 'العرض',
    مساحة: 'المساحة',
    المساحة: 'المساحة',
    شارع: 'الشارع',
    الشارع: 'الشارع',
    واجهة: 'الواجهة',
    الواجهة: 'الواجهة',
    ارتفاع: 'الارتفاع',
    الارتفاع: 'الارتفاع',
  };

  return exactLabels[normalized] ?? original;
};

const hasAnyArabicTerm = (value: string, terms: string[]) => {
  const normalizedValue = normalizeArabicLabel(value);
  return terms.some((term) => normalizedValue.includes(normalizeArabicLabel(term)));
};

const getTextFieldKind = (libelle: string): TextFieldKind => {
  const l = normalizeArabicLabel(libelle);

  if (hasAnyArabicTerm(l, ['مساحة', 'المساحة', 'متر مربع', 'م²', 'm2', 'm²'])) {
    return 'surface';
  }

  if (hasAnyArabicTerm(l, ['الطول', 'طول'])) {
    return 'length';
  }

  // Important: tester الشارع avant عرض, sinon "عرض الشارع" sera classé comme العرض.
  if (hasAnyArabicTerm(l, ['عرض الشارع', 'شارع', 'الشارع'])) {
    return 'street_width';
  }

  if (hasAnyArabicTerm(l, ['العرض', 'عرض'])) {
    return 'width';
  }

  if (hasAnyArabicTerm(l, ['الارتفاع', 'ارتفاع'])) {
    return 'height';
  }

  if (hasAnyArabicTerm(l, ['واجهة', 'الواجهة'])) {
    return 'frontage';
  }

  if (hasAnyArabicTerm(l, ['بعد', 'ابعاد', 'أبعاد', 'dimension'])) {
    return 'dimension';
  }

  return 'plain';
};

const getTextFieldUnit = (libelle: string) => {
  const kind = getTextFieldKind(libelle);
  if (kind === 'surface') return 'm²';
  if (kind === 'plain') return null;
  return 'm';
};

const isDimensionTextField = (libelle: string) => getTextFieldUnit(libelle) !== null;

const isKind = (item: CharacteristicDto, kind: TextFieldKind) =>
  getTextFieldKind(item.libelle) === kind;

const getDimensionFieldOrder = (libelle: string) => {
  const kind = getTextFieldKind(libelle);
  const order: Record<TextFieldKind, number> = {
    length: 1,
    width: 2,
    surface: 3,
    street_width: 4,
    frontage: 5,
    height: 6,
    dimension: 7,
    plain: 99,
  };

  return order[kind] ?? 99;
};

const toEnglishDigits = (value: string) =>
  String(value || '')
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));

const normalizeNumericText = (value: any) =>
  toEnglishDigits(String(value ?? ''))
    .replace(',', '.')
    .replace(/[^0-9.]/g, '')
    .replace(/(\..*)\./g, '$1');

const parseDimensionNumber = (value: any) => {
  const normalized = normalizeNumericText(value);
  if (!normalized.trim()) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatCalculatedSurface = (value: number) => {
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
};

const CATEGORY_PALETTES = [
  { bg: '#EAF7E6', active: '#4A9F35', border: '#CFE8C7', text: '#4A9F35' },
  { bg: '#EAF7E6', active: '#4A9F35', border: '#CFE8C7', text: '#4A9F35' },
  { bg: '#EAF7E6', active: '#4A9F35', border: '#CFE8C7', text: '#4A9F35' },
  { bg: '#EAF7E6', active: '#4A9F35', border: '#CFE8C7', text: '#4A9F35' },
  { bg: '#EAF7E6', active: '#4A9F35', border: '#CFE8C7', text: '#4A9F35' },
  { bg: '#EAF7E6', active: '#4A9F35', border: '#CFE8C7', text: '#4A9F35' },
];

const FieldLabel = ({ label, required = false }: { label: string; required?: boolean }) => (
  <View style={styles.fieldLabelWrapper}>
    <Text style={styles.fieldLabel}>
      {label} {required && <Text style={styles.requiredMark}>*</Text>}
    </Text>
  </View>
);

const FieldError = ({ message }: { message?: string }) => (
  <View style={styles.fieldErrorWrapper}>
    <Text style={styles.fieldError}>{message || ' '}</Text>
  </View>
);

type StepSectionHeaderProps = {
  title: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
};

const StepSectionHeader = ({ title, icon }: StepSectionHeaderProps) => (
  <View style={styles.stepSectionHeader}>
    <View style={styles.stepSectionTitleBox}>
      <Text style={styles.stepSectionTitle}>{title}</Text>
    </View>

    <View style={styles.stepSectionIconBox}>
      <Ionicons name={icon} size={22} color="#4A9F35" />
    </View>
  </View>
);

export default function AddPropertyScreen() {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollIndicatorOpacity = useRef(new Animated.Value(1)).current;
  const [showScrollMore, setShowScrollMore] = useState(true);
  const pulseAnim = useRef(new Animated.Value(0)).current;

  // ── Success Toast ─────────────────────────────────────────────────────────
  const [successVisible, setSuccessVisible] = useState(false);
  const successOpacity = useRef(new Animated.Value(0)).current;

  const showSuccessToast = useCallback(() => {
    setSuccessVisible(true);
    Animated.sequence([
      Animated.timing(successOpacity, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.delay(1400),
      Animated.timing(successOpacity, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setSuccessVisible(false);
    });
  }, [successOpacity]);
  // ─────────────────────────────────────────────────────────────────────────

  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const fieldPositions = useRef<Record<string, number>>({});

  const registerFieldPosition = useCallback((fieldName: string, y: number) => {
    fieldPositions.current[fieldName] = y;
  }, []);

  const scrollToFirstError = useCallback((errorKeys: string[]) => {
    if (errorKeys.length === 0) return;
    for (const key of errorKeys) {
      const y = fieldPositions.current[key];
      if (y !== undefined) {
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({ y: Math.max(0, y - 40), animated: true });
        }, 100);
        return;
      }
    }
  }, []);

  const handleScrollMorePress = useCallback(() => {
    scrollViewRef.current?.scrollTo({ y: 99999, animated: true });
  }, []);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  useEffect(() => {
    setShowScrollMore(true);
    Animated.timing(scrollIndicatorOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    fieldPositions.current = {};
  }, [currentStep]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
    if (distanceFromBottom < 80) {
      if (showScrollMore) {
        setShowScrollMore(false);
        Animated.timing(scrollIndicatorOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start();
      }
    } else {
      if (!showScrollMore) {
        setShowScrollMore(true);
        Animated.timing(scrollIndicatorOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      }
    }
  }, [showScrollMore]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [telContact, setTelContact] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [fees, setFees] = useState('');
  const [feesLoading, setFeesLoading] = useState(false);
  const [status, setStatus] = useState<ListingStatus>('VENDRE');
  const [submitting, setSubmitting] = useState(false);
  const submitLockRef = useRef(false);

  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [selectedCategoryCodeUuid, setSelectedCategoryCodeUuid] = useState<string>('');
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  const [characteristics, setCharacteristics] = useState<CharacteristicDto[]>([]);
  const [characteristicsLoading, setCharacteristicsLoading] = useState(false);
  const [characteristicsError, setCharacteristicsError] = useState<string | null>(null);
  const [characteristicValues, setCharacteristicValues] = useState<Record<number, any>>({});
  const [characteristicErrors, setCharacteristicErrors] = useState<CharacteristicErrors>({});

  const [openSelectId, setOpenSelectId] = useState<number | null>(null);

  const [images, setImages] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]);

  const [cities, setCities] = useState<CityDto[]>([]);
  const [zones, setZones] = useState<ZoneDto[]>([]);

  const [citiesLoading, setCitiesLoading] = useState(false);
  const [zonesLoading, setZonesLoading] = useState(false);
  const [citiesError, setCitiesError] = useState<string | null>(null);
  const [zonesError, setZonesError] = useState<string | null>(null);

  const [selectedCityCode, setSelectedCityCode] = useState<string>('');
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);
  const [locationSelectType, setLocationSelectType] = useState<LocationSelectType>(null);

  const [isMapFullScreen, setIsMapFullScreen] = useState(false);
  const [isLocationConfirmed, setIsLocationConfirmed] = useState(false);
  const [mapType, setMapType] = useState<'standard' | 'hybrid'>('standard');

  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewType, setPreviewType] = useState<PreviewType>(null);
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  const [errors, setErrors] = useState<FormErrors>({});

  const [region, setRegion] = useState<Region>({
    latitude: 18.1001,
    longitude: -15.9501,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  const selectedCategory = categories.find((c) => c.code_uuid === selectedCategoryCodeUuid);

  const videoSource = useMemo(() => {
    if (previewType === 'video' && previewUri) return { uri: previewUri };
    return null;
  }, [previewType, previewUri]);

  const videoPlayer = useVideoPlayer(videoSource, (player) => {
    player.loop = false;
  });

  const setFieldError = (field: keyof FormErrors, message?: string) => {
    setErrors((prev) => ({ ...prev, [field]: message }));
  };

  const clearFieldError = (field: keyof FormErrors) => {
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const clearCharacteristicError = (id: number) => {
    setCharacteristicErrors((prev) => ({ ...prev, [id]: '' }));
  };

  const loadFeesFromPrice = async (montantText: string) => {
    try {
      if (!montantText?.trim()) { setFees(''); return; }
      const montant = Number(montantText);
      if (Number.isNaN(montant) || montant <= 0) { setFees(''); return; }
      setFeesLoading(true);
      const data = await getPaidFeesByAmount(montant);
      setFees(String(data.frais ?? ''));
    } catch { setFees(''); }
    finally { setFeesLoading(false); }
  };

  const loadCities = async () => {
    try {
      setCitiesLoading(true);
      setCitiesError(null);
      const data = await getCities();
      setCities(data);
      if (data.length > 0) setSelectedCityCode(data[0].code_uuid);
    } catch { setCitiesError('Impossible de charger les villes'); }
    finally { setCitiesLoading(false); }
  };

  const loadZones = async (cityCodeUuid: string) => {
    try {
      setZonesLoading(true);
      setZonesError(null);
      const data = await getZonesByCity(cityCodeUuid);
      setZones(data);
      if (data.length > 0) {
        const firstZone = data[0];
        setSelectedZoneId(firstZone.zone_id);
        setIsLocationConfirmed(false);
        moveAndRefresh(firstZone.latitude, firstZone.longitude, 0.01);
      } else {
        setSelectedZoneId(null);
        setZones([]);
      }
    } catch {
      setZones([]);
      setSelectedZoneId(null);
      setZonesError('Impossible de charger les zones');
    } finally { setZonesLoading(false); }
  };

  const loadCategories = async () => {
    try {
      setCategoriesLoading(true);
      setCategoriesError(null);
      const data = await getPropertyCategories();
      setCategories(data);
      if (data.length > 0) {
        const first = data.find((i) => isCategoryAllowed(i, status)) ?? data[0];
        setSelectedCategoryCodeUuid(first.code_uuid);
      }
    } catch { setCategoriesError('Impossible de charger les catégories'); }
    finally { setCategoriesLoading(false); }
  };

  const loadCharacteristics = async (codeUuid: string) => {
    try {
      setCharacteristicsLoading(true);
      setCharacteristicsError(null);
      const data = await getCategoryCharacteristics(codeUuid);
      const typeOrder: Record<string, number> = { number: 1, checkbox: 2, text: 3, select: 4 };
      const sorted = [...data].sort((a, b) => (typeOrder[a.type] ?? 999) - (typeOrder[b.type] ?? 999));
      setCharacteristics(sorted);
      const init: Record<number, any> = {};
      sorted.forEach((item) => {
        switch (item.type) {
          case 'number': init[item.attributeId] = 0; break;
          case 'checkbox': init[item.attributeId] = 'لا'; break;
          default: init[item.attributeId] = '';
        }
      });
      setCharacteristicValues(init);
      setCharacteristicErrors({});
    } catch {
      setCharacteristics([]);
      setCharacteristicValues({});
      setCharacteristicErrors({});
      setCharacteristicsError('Impossible de charger les caractéristiques');
    } finally { setCharacteristicsLoading(false); }
  };

  const isCategoryAllowed = (c: CategoryDto, s: ListingStatus) =>
    !(s === 'ALLOUER' && c.libelle.trim() === 'قطعة أرضية');

  const filteredCategories = categories.filter((i) => isCategoryAllowed(i, status));

  useEffect(() => {
    const t = setTimeout(() => loadFeesFromPrice(price), 400);
    return () => clearTimeout(t);
  }, [price]);

  useEffect(() => { loadCategories(); loadCities(); }, []);

  useEffect(() => {
    if (selectedCategoryCodeUuid) loadCharacteristics(selectedCategoryCodeUuid);
    else { setCharacteristics([]); setCharacteristicValues({}); setCharacteristicErrors({}); }
  }, [selectedCategoryCodeUuid]);

  useEffect(() => {
    if (!filteredCategories.length) {
      if (selectedCategoryCodeUuid) setSelectedCategoryCodeUuid('');
      return;
    }
    if (!filteredCategories.some((i) => i.code_uuid === selectedCategoryCodeUuid)) {
      setSelectedCategoryCodeUuid(filteredCategories[0].code_uuid);
    }
  }, [status, categories]);

  useEffect(() => {
    if (selectedCityCode) loadZones(selectedCityCode);
    else { setZones([]); setSelectedZoneId(null); }
  }, [selectedCityCode]);

  useEffect(() => {
    if (selectedZoneId === null) return;
    const zone = zones.find((z) => z.zone_id === selectedZoneId);
    if (!zone) return;
    setIsLocationConfirmed(false);
    moveAndRefresh(zone.latitude, zone.longitude, 0.01);
  }, [selectedZoneId, zones]);

  const recalculateSurfaceFromLengthWidth = useCallback(
    (nextValues: Record<number, any>) => {
      const textItems = characteristics.filter((item) => item.type === 'text');
      const lengthItem = textItems.find((item) => isKind(item, 'length'));
      const widthItem = textItems.find((item) => isKind(item, 'width'));
      const surfaceItems = textItems.filter((item) => isKind(item, 'surface'));

      if (!lengthItem || !widthItem || surfaceItems.length === 0) return nextValues;

      const lengthValue = parseDimensionNumber(nextValues[lengthItem.attributeId]);
      const widthValue = parseDimensionNumber(nextValues[widthItem.attributeId]);
      const surfaceValue =
        lengthValue !== null && widthValue !== null && lengthValue > 0 && widthValue > 0
          ? formatCalculatedSurface(lengthValue * widthValue)
          : '';

      surfaceItems.forEach((surfaceItem) => {
        nextValues[surfaceItem.attributeId] = surfaceValue;
      });

      return nextValues;
    },
    [characteristics]
  );

  const hasAutoSurfaceFields = useCallback(() => {
    const textItems = characteristics.filter((item) => item.type === 'text');
    return (
      textItems.some((item) => isKind(item, 'length')) &&
      textItems.some((item) => isKind(item, 'width')) &&
      textItems.some((item) => isKind(item, 'surface'))
    );
  }, [characteristics]);

  // Sécurité: même si les valeurs viennent d'un re-render, d'un retour arrière,
  // ou d'un ancien état, المساحة est toujours recalculée avec الطول × العرض.
  useEffect(() => {
    if (!hasAutoSurfaceFields()) return;

    setCharacteristicValues((prev) => {
      const next = recalculateSurfaceFromLengthWidth({ ...prev });
      const changed = Object.keys(next).some(
        (key) => String(next[Number(key)] ?? '') !== String(prev[Number(key)] ?? '')
      );

      return changed ? next : prev;
    });
  }, [characteristics, characteristicValues, hasAutoSurfaceFields, recalculateSurfaceFromLengthWidth]);

  const clearRelatedDimensionErrors = useCallback(
    (id: number) => {
      const changedItem = characteristics.find((item) => item.attributeId === id);
      const changedKind = changedItem ? getTextFieldKind(changedItem.libelle) : 'plain';

      setCharacteristicErrors((prev) => {
        const next = { ...prev, [id]: '' };

        if (changedKind === 'length' || changedKind === 'width') {
          characteristics
            .filter((item) => item.type === 'text' && isKind(item, 'surface'))
            .forEach((surfaceItem) => {
              next[surfaceItem.attributeId] = '';
            });
        }

        return next;
      });
    },
    [characteristics]
  );

  const updateCharacteristicValue = (id: number, value: any) => {
    const changedItem = characteristics.find((item) => item.attributeId === id);
    const changedKind = changedItem ? getTextFieldKind(changedItem.libelle) : 'plain';
    const shouldNormalizeNumeric =
      changedItem?.type === 'text' && changedKind !== 'plain' && changedKind !== 'surface';
    const nextValue = shouldNormalizeNumeric ? normalizeNumericText(value) : value;

    setCharacteristicValues((prev) => {
      const next = { ...prev, [id]: nextValue };

      if (changedKind === 'length' || changedKind === 'width') {
        return recalculateSurfaceFromLengthWidth(next);
      }

      return next;
    });

    clearRelatedDimensionErrors(id);
  };

  const moveAndRefresh = (lat: number, lng: number, zoom = 0.005) => {
    const position = { latitude: lat, longitude: lng, latitudeDelta: zoom, longitudeDelta: zoom };
    setRegion(position);
    mapRef.current?.animateToRegion(position, 600);
  };

  const handleMapTypeChange = (type: 'standard' | 'hybrid') => {
    setMapType(type);
    setTimeout(() => mapRef.current?.animateToRegion(region, 400), 150);
  };

  const getCurrentLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') { Alert.alert('تنبيه', 'يجب السماح بالوصول للموقع'); return; }
    const loc = await Location.getCurrentPositionAsync({});
    moveAndRefresh(loc.coords.latitude, loc.coords.longitude);
    setIsLocationConfirmed(false);
    clearFieldError('location');
  };

  const pickImage = async () => {
    if (images.length >= MAX_IMAGES) { Alert.alert('تنبيه', `الحد الأقصى للصور هو ${MAX_IMAGES}`); return; }
    const remaining = MAX_IMAGES - images.length;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.8,
    });
    if (!result.canceled) {
      const newImages = result.assets.map((a) => a.uri);
      const mergedImages = [...images, ...newImages].slice(0, MAX_IMAGES);
      if (images.length + newImages.length > MAX_IMAGES) Alert.alert('تنبيه', `يمكنك رفع ${MAX_IMAGES} صور كحد أقصى`);
      setImages(mergedImages);
      clearFieldError('media');
    }
  };

  const pickVideo = async () => {
    if (videos.length >= MAX_VIDEOS) { Alert.alert('تنبيه', 'يمكنك رفع فيديو واحد فقط'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 1,
    });
    if (!result.canceled) {
      const selectedVideo = result.assets[0]?.uri;
      if (!selectedVideo) return;
      setVideos([selectedVideo]);
      clearFieldError('media');
    }
  };

  const removeImage = (index: number) => setImages((prev) => prev.filter((_, i) => i !== index));
  const removeVideo = (index: number) => setVideos((prev) => prev.filter((_, i) => i !== index));

  const openPreview = (type: 'image' | 'video', uri: string) => {
    setPreviewType(type);
    setPreviewUri(uri);
    setPreviewVisible(true);
  };

  const closePreview = () => {
    setPreviewVisible(false);
    setPreviewType(null);
    setPreviewUri(null);
  };

  const normalizeAttributes = () =>
    Object.fromEntries(
      Object.entries(characteristicValues).map(([key, value]) => {
        if (value === 'نعم') return [String(key), true];
        if (value === 'لا') return [String(key), false];
        if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) {
          return [String(key), Number(value)];
        }
        return [String(key), value];
      })
    );

  const isValidPhone = (value: string) => {
    const cleaned = value.trim().replace(/[\s-]/g, '');
    return /^[+]?[0-9]{8,15}$/.test(cleaned);
  };

  const validateStep1 = () => {
    const nextErrors: FormErrors = {};

    if (!title.trim()) nextErrors.title = 'أدخل عنوان الإعلان';

    if (!description.trim()) nextErrors.description = 'أدخل وصف العقار';

    if (!price.trim()) {
      nextErrors.price = 'أدخل السعر';
    } else {
      const n = Number(price);
      if (Number.isNaN(n) || n <= 0) nextErrors.price = 'السعر غير صالح';
    }

    if (!telContact.trim()) {
      nextErrors.telContact = 'أدخل رقم الهاتف';
    } else if (!isValidPhone(telContact)) {
      nextErrors.telContact = 'رقم الهاتف غير صالح';
    }

    if (!whatsapp.trim()) {
      nextErrors.whatsapp = 'أدخل رقم الواتساب';
    } else if (!isValidPhone(whatsapp)) {
      nextErrors.whatsapp = 'رقم الواتساب غير صالح';
    }

    setErrors((prev) => ({ ...prev, ...nextErrors }));

    const errorKeys = Object.keys(nextErrors);
    if (errorKeys.length > 0) scrollToFirstError(errorKeys);

    return errorKeys.length === 0;
  };

  const validateCharacteristics = () => {
    const nextErrors: CharacteristicErrors = {};
    characteristics.forEach((item) => {
      const value = characteristicValues[item.attributeId];
      if (item.type === 'text' && (typeof value !== 'string' || !value.trim()))
        nextErrors[item.attributeId] = `حقل ${getDisplayCharacteristicLabel(item.libelle)} مطلوب`;
      if (item.type === 'select' && (typeof value !== 'string' || !value.trim()))
        nextErrors[item.attributeId] = `اختر ${getDisplayCharacteristicLabel(item.libelle)}`;
    });
    setCharacteristicErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateStep2 = () => {
    const nextErrors: FormErrors = {};
    if (!selectedCategoryCodeUuid) nextErrors.category = 'اختر نوع العقار';
    setErrors((prev) => ({ ...prev, ...nextErrors }));
    const characteristicsValid = validateCharacteristics();
    const errorKeys = Object.keys(nextErrors);
    if (errorKeys.length > 0) scrollToFirstError(errorKeys);
    return errorKeys.length === 0 && characteristicsValid;
  };

  const validateStep3 = () => {
    const nextErrors: FormErrors = {};
    if (!selectedCityCode) nextErrors.city = 'اختر المدينة';
    if (selectedZoneId === null) nextErrors.zone = 'اختر المنطقة';
    if (!isLocationConfirmed) nextErrors.location = 'يرجى تحديد الموقع وتأكيده على الخريطة';
    setErrors((prev) => ({ ...prev, ...nextErrors }));
    const errorKeys = Object.keys(nextErrors);
    if (errorKeys.length > 0) scrollToFirstError(errorKeys);
    return errorKeys.length === 0;
  };

  const validateStep4 = () => {
    const nextErrors: FormErrors = {};

    if (images.length < MIN_IMAGES) {
      nextErrors.media = 'يجب رفع صورة واحدة على الأقل للعقار';
    } else if (images.length > MAX_IMAGES) {
      nextErrors.media = `الحد الأقصى للصور هو ${MAX_IMAGES}`;
    }

    if (videos.length > MAX_VIDEOS) {
      nextErrors.media = 'يمكنك رفع فيديو واحد فقط';
    }

    setErrors((prev) => ({ ...prev, ...nextErrors }));
    return Object.keys(nextErrors).length === 0;
  };

  const nextStep = () => {
    let valid = true;
    if (currentStep === 1) valid = validateStep1();
    if (currentStep === 2) valid = validateStep2();
    if (currentStep === 3) valid = validateStep3();
    if (!valid) return;
    if (currentStep < totalSteps) setCurrentStep((s) => s + 1);
  };

  const prevStep = () => { if (currentStep > 1) setCurrentStep((s) => s - 1); };

  const handleSubmit = async () => {
    if (submitting || submitLockRef.current) return;

    submitLockRef.current = true;
    setSubmitting(true);
    setErrors({});

    try {
      const isStep1Valid = validateStep1();
      const isStep2Valid = validateStep2();
      const isStep3Valid = validateStep3();
      const isStep4Valid = validateStep4();

      if (!isStep1Valid) { setCurrentStep(1); return; }
      if (!isStep2Valid) { setCurrentStep(2); return; }
      if (!isStep3Valid) { setCurrentStep(3); return; }
      if (!isStep4Valid) { setCurrentStep(4); return; }

      if (!selectedCategory) {
        setCurrentStep(2);
        setFieldError('submit', 'تعذر تحديد فئة العقار');
        return;
      }

      if (selectedZoneId === null) {
        setCurrentStep(3);
        setFieldError('zone', 'اختر المنطقة');
        return;
      }

      const numericPrice = Number(price);
      if (Number.isNaN(numericPrice) || numericPrice <= 0) {
        setCurrentStep(1);
        setFieldError('price', 'السعر غير صالح');
        return;
      }

      clearFieldError('submit');

      const payload = {
        product: {
          title: title.trim(),
          description: description.trim(),
          price: numericPrice,
          status,
          categoryId: selectedCategory.categoryId,
          zoneId: selectedZoneId,
          latitude: region.latitude,
          longitude: region.longitude,
          telContact: telContact.trim(),
          whatsapp: whatsapp.trim(),
          attributes: normalizeAttributes(),
        },
      };

      const result = await createProduct(payload);

      if (!result?.success || !result?.productId) {
        setFieldError('submit', result?.message || 'فشل إنشاء العقار');
        return;
      }

      const productId = result.productId;

      try {
        for (const imageUri of images) {
          await uploadFile(imageUri, 'images', productId);
        }

        for (const videoUri of videos) {
          await uploadFile(videoUri, 'videos', productId);
        }
      } catch (uploadError: any) {
        console.log('❌ UPLOAD MEDIA ERROR:', uploadError?.response?.data || uploadError?.message || uploadError);
        setCurrentStep(4);
        setFieldError(
          'submit',
          uploadError?.response?.data?.message ||
            'تم إنشاء العقار، لكن تعذر رفع المرفقات. يرجى المحاولة مرة أخرى.'
        );
        return;
      }

      showSuccessToast();
      setTimeout(() => {
        router.replace('/my-properties' as any);
      }, 1600);
    } catch (error: any) {
      console.log('❌ CREATE PRODUCT ERROR:', error?.response?.data || error?.message || error);
      setFieldError(
        'submit',
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          'حدث خطأ أثناء حفظ العقار. تحقق من الاتصال وحاول مرة أخرى.'
      );
    } finally {
      submitLockRef.current = false;
      setSubmitting(false);
    }
  };

  const stepMeta = [
    { icon: 'home-outline' as const, label: 'معلومات' },
    { icon: 'list-outline' as const, label: 'تفاصيل' },
    { icon: 'location-outline' as const, label: 'موقع' },
    { icon: 'camera-outline' as const, label: 'مرفقات' },
  ];

  const renderStepIndicator = () => (
    <View style={styles.stepIndicatorContainer}>
      {stepMeta.map((meta, index) => {
        const step = index + 1;
        const isActive = currentStep >= step;
        const isCompleted = currentStep > step;

        return (
          <React.Fragment key={step}>
            <View style={styles.stepItemWrapper}>
              <View
                style={[
                  styles.stepCircle,
                  isActive && styles.stepCircleActive,
                  isCompleted && styles.stepCircleCompleted,
                ]}
              >
                {isCompleted ? (
                  <Ionicons name="checkmark" size={14} color="#FFF" />
                ) : (
                  <Ionicons
                    name={meta.icon}
                    size={14}
                    color={isActive ? '#FFF' : '#94A3B8'}
                  />
                )}
              </View>
              <Text style={[styles.stepLabel, isActive && styles.stepLabelActive]}>
                {meta.label}
              </Text>
            </View>

            {index < stepMeta.length - 1 && (
              <View
                style={[
                  styles.stepLine,
                  currentStep > step && styles.stepLineActive,
                ]}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );

  const renderUnitInput = (
    placeholder: string,
    unit: string,
    value: string,
    setValue: (v: string) => void,
    isBoldUnit = false,
    editable = true,
    loading = false,
    hasError = false
  ) => (
    <View style={[styles.inputContainer, { flex: 1 }, !editable && styles.inputContainerDisabled, hasError && styles.inputErrorBorder]}>
      <TextInput
        style={[styles.inputInside, !editable && styles.inputInsideDisabled]}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        keyboardType="numeric"
        value={value}
        onChangeText={(v) => { setValue(v); clearFieldError('price'); clearFieldError('submit'); }}
        editable={editable}
      />
      {loading ? (
        <ActivityIndicator size="small" color="#4A9F35" style={{ marginLeft: 8 }} />
      ) : (
        <Text style={[styles.unitText, isBoldUnit && styles.unitTextBold]}>{unit}</Text>
      )}
    </View>
  );

  const renderFeesDisplay = () => (
    <View style={[styles.inputContainer, styles.inputContainerDisabled, { flex: 1 }]}>
      {feesLoading ? (
        <ActivityIndicator size="small" color="#DC2626" style={{ flex: 1 }} />
      ) : (
        <Text style={[styles.inputInside, fees ? styles.feesValueText : styles.inputInsideDisabled]}>
          {fees || '—'}
        </Text>
      )}
      <Text style={[styles.unitTextBold, fees ? styles.feesUnitText : null]}>MRU</Text>
    </View>
  );

  const renderCategoryScroll = () => {
    if (categoriesLoading) return <ActivityIndicator size="small" color="#4A9F35" style={{ marginVertical: 12 }} />;
    if (categoriesError) return <Text style={styles.errorText}>{categoriesError}</Text>;
    if (!filteredCategories.length) return <Text style={styles.emptyText}>لا توجد فئات متاحة</Text>;

    return (
      <>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScrollWrapper}
          contentContainerStyle={styles.categoryScrollContent}
        >
          {filteredCategories.map((item, index) => {
            const palette = CATEGORY_PALETTES[index % CATEGORY_PALETTES.length];
            const isActive = selectedCategoryCodeUuid === item.code_uuid;

            return (
              <TouchableOpacity
                key={item.code_uuid}
                onPress={() => {
                  setSelectedCategoryCodeUuid(item.code_uuid);
                  clearFieldError('category');
                  clearFieldError('submit');
                }}
                activeOpacity={0.8}
                style={[
                  styles.categoryPill,
                  isActive
                    ? {
                        backgroundColor: palette.active,
                        borderColor: palette.active,
                        shadowColor: palette.active,
                        shadowOpacity: 0.35,
                        shadowRadius: 8,
                        elevation: 6,
                      }
                    : { backgroundColor: palette.bg, borderColor: palette.border },
                ]}
              >
                <Text
                  style={[
                    styles.categoryPillLabel,
                    { color: isActive ? '#FFF' : palette.text },
                  ]}
                  numberOfLines={1}
                >
                  {item.libelle}
                </Text>

                {isActive && (
                  <View style={styles.categoryPillCheck}>
                    <Ionicons name="checkmark" size={10} color={palette.active} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <FieldError message={errors.category} />
      </>
    );
  };

  const renderFieldHeader = (libelle: string, iconName: string, required = false) => {
    const displayLabel = getDisplayCharacteristicLabel(libelle);

    return (
      <View style={styles.fieldCardHeader}>
        <Text style={styles.fieldCardLabel}>
          {displayLabel} {required && <Text style={styles.requiredMark}>*</Text>}
        </Text>
        <View style={styles.fieldCardIconBox}>
          <MaterialCommunityIcons name={iconName as any} size={15} color="#4A9F35" />
        </View>
      </View>
    );
  };

  const renderCharacteristicField = (item: CharacteristicDto) => {
    const value = characteristicValues[item.attributeId];
    const iconName = getCharacteristicIcon(item.libelle).name;
    const error = characteristicErrors[item.attributeId];
    const isRequired = item.type === 'text' || item.type === 'select';
    const displayLabel = getDisplayCharacteristicLabel(item.libelle);

    if (item.type === 'number') {
      return (
        <View key={item.attributeId} style={styles.specRow}>
          <View style={styles.counterControls}>
            <TouchableOpacity onPress={() => updateCharacteristicValue(item.attributeId, Math.max(0, Number(value || 0) - 1))} style={styles.counterBtn}>
              <Ionicons name="remove" size={16} color="#4A9F35" />
            </TouchableOpacity>
            <Text style={styles.counterValue}>{Number(value || 0)}</Text>
            <TouchableOpacity onPress={() => updateCharacteristicValue(item.attributeId, Number(value || 0) + 1)} style={styles.counterBtn}>
              <Ionicons name="add" size={16} color="#4A9F35" />
            </TouchableOpacity>
          </View>
          <View style={styles.specLabelGroup}>
            <Text style={styles.specLabel}>{displayLabel}</Text>
            <View style={styles.specIconBox}>
              <MaterialCommunityIcons name={iconName as any} size={18} color="#4A9F35" />
            </View>
          </View>
        </View>
      );
    }

    if (item.type === 'checkbox') {
      const isChecked = value === 'نعم';
      return (
        <View key={item.attributeId} style={styles.specRow}>
          <View style={styles.switchBox}>
            <Switch
              trackColor={{ false: '#E5E7EB', true: '#B8DDAA' }}
              thumbColor={isChecked ? '#4A9F35' : '#9CA3AF'}
              ios_backgroundColor="#E5E7EB"
              onValueChange={(checked) => updateCharacteristicValue(item.attributeId, checked ? 'نعم' : 'لا')}
              value={isChecked}
            />
          </View>
          <View style={styles.specLabelGroup}>
            <Text style={styles.specLabel}>{displayLabel}</Text>
            <View style={[styles.specIconBox, isChecked && { backgroundColor: '#EAF7E6' }]}>
              <MaterialCommunityIcons name={iconName as any} size={18} color={isChecked ? '#4A9F35' : '#9CA3AF'} />
            </View>
          </View>
        </View>
      );
    }

    if (item.type === 'text') {
      const unit = getTextFieldUnit(item.libelle);

      return (
        <View key={item.attributeId} style={styles.characteristicBlock}>
          <View style={[styles.fieldCard, error && styles.inputErrorBorder]}>
            {renderFieldHeader(item.libelle, iconName, isRequired)}
            <View style={styles.fieldCardDivider} />
            <View style={styles.fieldCardInputRow}>
              <TextInput
                style={styles.fieldCardInput}
                placeholder={unit ? '0' : `أدخل ${item.libelle}`}
                placeholderTextColor="#C4C9D4"
                keyboardType={unit ? 'numeric' : 'default'}
                value={String(value ?? '')}
                onChangeText={(v) => updateCharacteristicValue(item.attributeId, v)}
              />
              {unit && <Text style={styles.fieldCardPrefix}>{unit}</Text>}
            </View>
          </View>
          <FieldError message={error} />
        </View>
      );
    }

    if (item.type === 'select') {
      const isOpen = openSelectId === item.attributeId;
      return (
        <View key={item.attributeId} style={styles.characteristicBlock}>
          <View style={[styles.fieldCard, { marginBottom: 0 }, isOpen && styles.fieldCardOpen, error && styles.inputErrorBorder]}>
            {renderFieldHeader(item.libelle, iconName, isRequired)}
            <View style={styles.fieldCardDivider} />
            <TouchableOpacity style={styles.fieldCardSelectTrigger} onPress={() => setOpenSelectId(isOpen ? null : item.attributeId)} activeOpacity={0.8}>
              <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} color={value ? '#4A9F35' : '#9CA3AF'} />
              <Text style={[styles.fieldCardSelectText, value && styles.fieldCardSelectTextSelected]}>{value || 'اختر...'}</Text>
            </TouchableOpacity>
          </View>
          {isOpen && (
            <View style={styles.fieldCardOptionsDropdown}>
              {item.values.map((option, idx) => {
                const selected = value === option;
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.fieldCardOption, selected && styles.fieldCardOptionActive, idx === item.values.length - 1 && { borderBottomWidth: 0 }]}
                    onPress={() => { updateCharacteristicValue(item.attributeId, option); setOpenSelectId(null); }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.fieldCardRadio, selected && styles.fieldCardRadioActive]}>
                      {selected && <View style={styles.fieldCardRadioDot} />}
                    </View>
                    <Text style={[styles.fieldCardOptionText, selected && styles.fieldCardOptionTextActive]}>{option}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          <FieldError message={error} />
        </View>
      );
    }

    return null;
  };

  const renderDimensionItem = (item: CharacteristicDto) => {
    const unit = getTextFieldUnit(item.libelle) || 'm';
    const iconName = getCharacteristicIcon(item.libelle).name;
    const error = characteristicErrors[item.attributeId];
    const kind = getTextFieldKind(item.libelle);
    const autoCalculatedSurface = kind === 'surface' && hasAutoSurfaceFields();

    return (
      <View key={item.attributeId} style={styles.dimensionFieldColumn}>
        <View
          style={[
            styles.fieldCard,
            autoCalculatedSurface && styles.calculatedFieldCard,
            error && styles.inputErrorBorder,
          ]}
        >
          {renderFieldHeader(item.libelle, iconName, true)}
          <View style={styles.fieldCardDivider} />
          <View style={styles.fieldCardInputRow}>
            <TextInput
              style={[styles.fieldCardInput, autoCalculatedSurface && styles.calculatedFieldInput]}
              placeholder={autoCalculatedSurface ? 'يحسب تلقائياً' : '0'}
              placeholderTextColor="#C4C9D4"
              keyboardType="numeric"
              value={String(characteristicValues[item.attributeId] ?? '')}
              editable={!autoCalculatedSurface}
              selectTextOnFocus={!autoCalculatedSurface}
              onChangeText={(v) => updateCharacteristicValue(item.attributeId, v)}
            />
            <Text style={styles.fieldCardPrefix}>{unit}</Text>
          </View>
        </View>
        <FieldError message={error} />
      </View>
    );
  };

  /**
   * Affichage stable en RTL :
   * - rightItem = carte qui doit apparaître à droite visuellement
   * - leftItem  = carte qui doit apparaître à gauche visuellement
   *
   * On garde la ligne en LTR et on rend la colonne gauche puis droite.
   * Comme ça, l’ordre ne change pas selon iOS/Android ou selon direction: rtl.
   */
  const renderDimensionPairRow = (
    rightItem?: CharacteristicDto,
    leftItem?: CharacteristicDto
  ) => {
    if (!rightItem && !leftItem) return null;

    return (
      <View style={styles.dimensionCardsRow}>
        {leftItem ? renderDimensionItem(leftItem) : <View style={styles.dimensionFieldColumn} />}
        {rightItem ? renderDimensionItem(rightItem) : <View style={styles.dimensionFieldColumn} />}
      </View>
    );
  };

  const renderDimensionRow = (items: CharacteristicDto[]) => {
    if (items.length === 0) return null;

    const rows: CharacteristicDto[][] = [];
    for (let i = 0; i < items.length; i += 2) {
      rows.push(items.slice(i, i + 2));
    }

    return (
      <>
        {rows.map((row, index) => (
          <React.Fragment key={`dimension-row-${index}`}>
            {renderDimensionPairRow(row[0], row[1])}
          </React.Fragment>
        ))}
      </>
    );
  };

  const renderCharacteristicsGrid = () => {
    const textItems = characteristics.filter((i) => i.type === 'text');
    const nonTextItems = characteristics.filter((i) => i.type !== 'text');

    const lengthItem = textItems.find((item) => isKind(item, 'length'));
    const widthItem = textItems.find((item) => isKind(item, 'width'));
    const surfaceItem = textItems.find((item) => isKind(item, 'surface'));
    const streetItem = textItems.find((item) => isKind(item, 'street_width'));

    const alreadyRenderedIds = new Set(
      [lengthItem, widthItem, surfaceItem, streetItem]
        .filter(Boolean)
        .map((item) => (item as CharacteristicDto).attributeId)
    );

    const otherDimensionItems = textItems
      .filter((item) => isDimensionTextField(item.libelle) && !alreadyRenderedIds.has(item.attributeId))
      .sort((a, b) => {
        const byKind = getDimensionFieldOrder(a.libelle) - getDimensionFieldOrder(b.libelle);
        if (byKind !== 0) return byKind;
        return a.attributeId - b.attributeId;
      });

    const otherTextItems = textItems.filter((item) => !isDimensionTextField(item.libelle));

    return (
      <>
        {nonTextItems.map((item) => renderCharacteristicField(item))}

        {/* ligne 1 en RTL : الطول ثم العرض */}
        {renderDimensionPairRow(lengthItem, widthItem)}

        {/* ligne 2 en RTL : المساحة ثم الشارع */}
        {renderDimensionPairRow(surfaceItem, streetItem)}

        {renderDimensionRow(otherDimensionItems)}

        {otherTextItems.map((item) => renderCharacteristicField(item))}
      </>
    );
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          title: 'إضافة عقار جديد',
          headerShown: true,
          headerShadowVisible: false,
          headerTitleAlign: 'center',
          headerTitle: () => (
            <Text style={styles.screenHeaderTitle}>إضافة عقار جديد</Text>
          ),
        }}
      />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={[
          styles.container,
          { paddingBottom: keyboardVisible ? 80 + insets.bottom : 300 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
        style={styles.scrollViewStyle}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
      >
          {/* ── Step 1 ── */}
          {currentStep === 1 && (
            <View style={styles.formSection}>
              <StepSectionHeader title="معلومات العقار" icon="home-outline" />

              <View onLayout={(e) => registerFieldPosition('title', e.nativeEvent.layout.y)}>
                <FieldLabel label="عنوان الإعلان" required />
                <TextInput
                  style={[styles.input, errors.title && styles.inputErrorBorder]}
                  placeholder="مثلاً: شقة فاخرة للبيع"
                  placeholderTextColor="#9CA3AF"
                  value={title}
                  onChangeText={(v) => { setTitle(v); clearFieldError('title'); clearFieldError('submit'); }}
                />
                <FieldError message={errors.title} />
              </View>

              <View onLayout={(e) => registerFieldPosition('description', e.nativeEvent.layout.y)}>
                <FieldLabel label="وصف العقار" required />
                <TextInput
                  style={[styles.input, styles.textArea, errors.description && styles.inputErrorBorder]}
                  placeholder="صف العقار بدقة لزيادة فرص التواصل..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={4}
                  textAlign="right"
                  value={description}
                  onChangeText={(v) => { setDescription(v); clearFieldError('description'); clearFieldError('submit'); }}
                />
                <FieldError message={errors.description} />
              </View>

              <View style={styles.dividerLine} />

              <FieldLabel label="نوع الإعلان" required />
              <View style={styles.segmentContainer}>
                <TouchableOpacity style={[styles.segmentBtn, status === 'VENDRE' && styles.segmentBtnActive]} onPress={() => setStatus('VENDRE')}>
                  <MaterialCommunityIcons name="tag-outline" size={18} color={status === 'VENDRE' ? '#FFF' : '#6B7280'} />
                  <Text style={[styles.segmentText, status === 'VENDRE' && styles.segmentTextActive]}>للبيع</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.segmentBtn, status === 'ALLOUER' && styles.segmentBtnActive]} onPress={() => setStatus('ALLOUER')}>
                  <MaterialCommunityIcons name="key-outline" size={18} color={status === 'ALLOUER' ? '#FFF' : '#6B7280'} />
                  <Text style={[styles.segmentText, status === 'ALLOUER' && styles.segmentTextActive]}>للإيجار</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.dividerLine} />

              <View
                style={styles.rowInputs}
                onLayout={(e) => registerFieldPosition('price', e.nativeEvent.layout.y)}
              >
                <View style={styles.fixedFieldColumn}>
                  <FieldLabel label="السعر" required />
                  {renderUnitInput(
                    'السعر',
                    'MRU',
                    price,
                    setPrice,
                    true,
                    true,
                    false,
                    !!errors.price
                  )}
                  <FieldError message={errors.price} />
                </View>

                <View style={styles.fixedFieldColumn}>
                  <FieldLabel label="الرسوم" />
                  {renderFeesDisplay()}
                  <FieldError message="" />
                </View>
              </View>

              <View style={styles.dividerLine} />

              <View style={styles.rowInputs}>
                <View
                  style={styles.fixedFieldColumn}
                  onLayout={(e) => registerFieldPosition('telContact', e.nativeEvent.layout.y)}
                >
                  <FieldLabel label="رقم الهاتف" required />

                  <View
                    style={[
                      styles.inputContainer,
                      errors.telContact && styles.inputErrorBorder,
                    ]}
                  >
                    <TextInput
                      style={styles.inputInside}
                      placeholder="مثلاً: 22200000000"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="phone-pad"
                      value={telContact}
                      onChangeText={(v) => {
                        setTelContact(v);
                        clearFieldError('telContact');
                        clearFieldError('submit');
                      }}
                    />

                    <Ionicons
                      name="call-outline"
                      size={18}
                      color="#4A9F35"
                      style={styles.contactInputIcon}
                    />
                  </View>

                  <FieldError message={errors.telContact} />
                </View>

                <View
                  style={styles.fixedFieldColumn}
                  onLayout={(e) => registerFieldPosition('whatsapp', e.nativeEvent.layout.y)}
                >
                  <FieldLabel label="واتساب" required />

                  <View
                    style={[
                      styles.inputContainer,
                      errors.whatsapp && styles.inputErrorBorder,
                    ]}
                  >
                    <TextInput
                      style={styles.inputInside}
                      placeholder="مثلاً: 22200000000"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="phone-pad"
                      value={whatsapp}
                      onChangeText={(v) => {
                        setWhatsapp(v);
                        clearFieldError('whatsapp');
                        clearFieldError('submit');
                      }}
                    />

                    <Ionicons
                      name="logo-whatsapp"
                      size={18}
                      color="#22C55E"
                      style={styles.contactInputIcon}
                    />
                  </View>

                  <FieldError message={errors.whatsapp} />
                </View>
              </View>

              <FieldError message={errors.submit} />
            </View>
          )}

          {/* ── Step 2 ── */}
          {currentStep === 2 && (
            <View style={styles.formSection}>
              <StepSectionHeader title="تفاصيل العقار" icon="list-outline" />

              <View style={styles.categorySection} onLayout={(e) => registerFieldPosition('category', e.nativeEvent.layout.y)}>
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.sectionHeaderDot} />
                  <Text style={styles.subSectionTitle}>نوع العقار</Text>
                </View>
                {renderCategoryScroll()}
              </View>

              <View style={styles.dividerLine} />

              <View style={styles.characteristicsSection}>
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.sectionHeaderDot} />
                  <Text style={styles.subSectionTitle}>خصائص العقار</Text>
                </View>
                {characteristicsLoading ? (
                  <ActivityIndicator size="small" color="#4A9F35" />
                ) : characteristicsError ? (
                  <Text style={styles.errorText}>{characteristicsError}</Text>
                ) : characteristics.length === 0 ? (
                  <Text style={styles.emptyText}>لا توجد خصائص لهذه الفئة</Text>
                ) : (
                  <View style={styles.characteristicsGrid}>{renderCharacteristicsGrid()}</View>
                )}
              </View>

              <FieldError message={errors.submit} />
            </View>
          )}

          {/* ── Step 3 ── */}
          {currentStep === 3 && (
            <View style={styles.formSection}>
              <StepSectionHeader title="موقع العقار" icon="location-outline" />

              <View style={styles.headerRow}>
                {isLocationConfirmed ? (
                  <View style={styles.confirmedBadge}>
                    <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                    <Text style={styles.confirmedBadgeText}>تم التأكيد</Text>
                  </View>
                ) : (
                  <View style={[styles.confirmedBadge, { backgroundColor: '#FFF7ED' }]}>
                    <Ionicons name="alert-circle" size={14} color="#F97316" />
                    <Text style={[styles.confirmedBadgeText, { color: '#F97316' }]}>بانتظار التحديد</Text>
                  </View>
                )}
              </View>

              <View onLayout={(e) => registerFieldPosition('city', e.nativeEvent.layout.y)}>
                <FieldLabel label="المدينة" required />
                {citiesLoading ? (
                  <View style={styles.selectTrigger}>
                    <ActivityIndicator size="small" color="#4A9F35" />
                  </View>
                ) : citiesError ? (
                  <Text style={styles.errorText}>{citiesError}</Text>
                ) : (
                  <TouchableOpacity
                    style={[styles.selectTrigger, errors.city && styles.inputErrorBorder]}
                    onPress={() => setLocationSelectType('city')}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="chevron-down" size={18} color="#6B7280" />
                    <Text style={[styles.selectTriggerText, !selectedCityCode && styles.selectPlaceholder]} numberOfLines={1}>
                      {cities.find((city) => city.code_uuid === selectedCityCode)?.libelle || 'اختر المدينة'}
                    </Text>
                    <View style={styles.selectIconBox}>
                      <Ionicons name="business-outline" size={17} color="#4A9F35" />
                    </View>
                  </TouchableOpacity>
                )}
              </View>
              <FieldError message={errors.city} />

              <View onLayout={(e) => registerFieldPosition('zone', e.nativeEvent.layout.y)}>
                <FieldLabel label="المنطقة / الحي" required />
                {zonesLoading ? (
                  <View style={styles.selectTrigger}>
                    <ActivityIndicator size="small" color="#4A9F35" />
                  </View>
                ) : zonesError ? (
                  <Text style={styles.errorText}>{zonesError}</Text>
                ) : (
                  <TouchableOpacity
                    style={[styles.selectTrigger, errors.zone && styles.inputErrorBorder, !zones.length && styles.selectTriggerDisabled]}
                    onPress={() => zones.length > 0 && setLocationSelectType('zone')}
                    disabled={!zones.length}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="chevron-down" size={18} color="#6B7280" />
                    <Text style={[styles.selectTriggerText, selectedZoneId === null && styles.selectPlaceholder]} numberOfLines={1}>
                      {zones.find((zone) => zone.zone_id === selectedZoneId)?.libelle || 'اختر المنطقة / الحي'}
                    </Text>
                    <View style={styles.selectIconBox}>
                      <Ionicons name="location-outline" size={17} color="#4A9F35" />
                    </View>
                  </TouchableOpacity>
                )}
              </View>
              <FieldError message={errors.zone} />

              <TouchableOpacity
                style={[styles.mapPreview, isLocationConfirmed && { borderColor: '#10B981' }, errors.location && styles.inputErrorBorder]}
                onPress={() => setIsMapFullScreen(true)}
              >
                <MapView provider={PROVIDER_GOOGLE} style={styles.map} region={region} scrollEnabled={false}>
                  <Marker coordinate={{ latitude: region.latitude, longitude: region.longitude }} />
                </MapView>
                <View style={styles.mapOverlay}>
                  <Text style={styles.mapOverlayText}>{isLocationConfirmed ? 'تم تأكيد الموقع ✓' : 'اضغط لتحديد الموقع بدقة'}</Text>
                </View>
              </TouchableOpacity>
              <FieldError message={errors.location} />
              <FieldError message={errors.submit} />
            </View>
          )}

          {/* ── Step 4 ── */}
          {currentStep === 4 && (
            <View style={styles.formSection}>
              <StepSectionHeader title="المرفقات" icon="camera-outline" />

              <FieldLabel label="صور العقار" required />
              <TouchableOpacity
                style={[
                  styles.dashedUpload,
                  images.length >= MAX_IMAGES && styles.disabledUpload,
                  errors.media && images.length < MIN_IMAGES && styles.inputErrorBorder,
                ]}
                onPress={pickImage}
                disabled={images.length >= MAX_IMAGES}
              >
                <Ionicons name="images-outline" size={32} color="#2F6B24" />
                <Text style={styles.uploadMainText}>اضغط لرفع الصور</Text>
                <Text style={styles.uploadSubText}>{`مطلوب صورة واحدة على الأقل - ${images.length}/${MAX_IMAGES} صور`}</Text>
              </TouchableOpacity>

              {images.length > 0 && (
                <View style={styles.mediaSection}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mediaPreviewRow}>
                    {images.map((uri, idx) => (
                      <View key={`img-${idx}`} style={styles.previewItemWrapper}>
                        <TouchableOpacity onPress={() => openPreview('image', uri)} activeOpacity={0.85}>
                          <Image source={{ uri }} style={styles.imagePreview} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => removeImage(idx)} style={styles.removeMediaBtn}>
                          <Ionicons name="close" size={14} color="#FFF" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}

              <FieldError message={errors.media} />

              <FieldLabel label="فيديو العقار" />
              <TouchableOpacity
                style={[styles.dashedUpload, { marginTop: 15 }, videos.length >= MAX_VIDEOS && styles.disabledUpload]}
                onPress={pickVideo}
                disabled={videos.length >= MAX_VIDEOS}
              >
                <Ionicons name="videocam-outline" size={32} color="#2F6B24" />
                <Text style={styles.uploadMainText}>إضافة فيديو للعقار</Text>
                <Text style={styles.uploadSubText}>{`${videos.length}/${MAX_VIDEOS} فيديو`}</Text>
              </TouchableOpacity>

              {videos.length > 0 && (
                <View style={styles.mediaSection}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mediaPreviewRow}>
                    {videos.map((uri, idx) => (
                      <View key={`vid-${idx}`} style={styles.previewItemWrapper}>
                        <TouchableOpacity onPress={() => openPreview('video', uri)} activeOpacity={0.85}>
                          <View style={[styles.imagePreview, styles.videoPlaceholder]}>
                            <Ionicons name="play-circle" size={32} color="#FFF" />
                            <Text style={styles.videoBadgeText}>Video</Text>
                          </View>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => removeVideo(idx)} style={styles.removeMediaBtn}>
                          <Ionicons name="close" size={14} color="#FFF" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}

              <FieldError message={errors.submit} />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Scroll More Indicator ── */}
      {!keyboardVisible && (
        <Animated.View
          style={[
            styles.scrollMoreIndicator,
            {
              opacity: scrollIndicatorOpacity,
              bottom: 210 + insets.bottom,
            },
          ]}
          pointerEvents={showScrollMore ? 'auto' : 'none'}
        />
      )}

      {/* ── Footer ── */}
      {!keyboardVisible && (
        <View
          style={[
            styles.modernFooter,
            {
              bottom: Math.max(insets.bottom, 10),
            },
          ]}
        >
        {renderStepIndicator()}

        <View style={styles.modernButtonRow}>
          {currentStep > 1 && !submitting ? (
            <TouchableOpacity style={styles.modernBackBtn} onPress={prevStep}>
              <Ionicons name="arrow-forward" size={18} color="#4B5563" />
              <Text style={styles.modernBackBtnText}>السابق</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.modernBackPlaceholder} />
          )}

          <TouchableOpacity
            style={[
              styles.modernNextBtn,
              currentStep === 4 && styles.publishBtnActive,
              submitting && styles.disabledButton,
            ]}
            onPress={currentStep === 4 ? handleSubmit : nextStep}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Text style={styles.modernNextBtnText}>
                  {currentStep === 4 ? 'نشر الإعلان' : 'التالي'}
                </Text>
                <Ionicons
                  name={currentStep === 4 ? 'checkmark-done' : 'arrow-back'}
                  size={18}
                  color="#FFF"
                />
              </>
            )}
          </TouchableOpacity>
        </View>
        </View>
      )}

      {/* ── Success Toast ── */}
      {successVisible && (
        <Animated.View style={[styles.successToast, { opacity: successOpacity }]}>
          <Text style={styles.successToastText}>تمت إضافة العقار بنجاح</Text>
        </Animated.View>
      )}

      {/* ── Fullscreen Map Modal ── */}
      <Modal visible={isMapFullScreen} animationType="slide">
        <View style={{ flex: 1 }}>
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={{ flex: 1 }}
            mapType={mapType}
            region={region}
            onPress={(e) => { setRegion({ ...region, ...e.nativeEvent.coordinate }); setIsLocationConfirmed(false); clearFieldError('location'); }}
          >
            <Marker
              coordinate={{ latitude: region.latitude, longitude: region.longitude }}
              draggable
              onDragEnd={(e) => { setRegion({ ...region, ...e.nativeEvent.coordinate }); setIsLocationConfirmed(false); clearFieldError('location'); }}
            />
          </MapView>

          <View style={styles.mapHeader}>
            <TouchableOpacity onPress={() => setIsMapFullScreen(false)}>
              <Ionicons name="close-circle" size={40} color="#2F6B24" />
            </TouchableOpacity>
            <View style={styles.mapTypeSwitcher}>
              <TouchableOpacity onPress={() => handleMapTypeChange('standard')} style={[styles.typeBtnMini, mapType === 'standard' && styles.typeBtnActive]}>
                <Text style={{ color: mapType === 'standard' ? '#FFF' : '#000', fontSize: 12 }}>خريطة</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleMapTypeChange('hybrid')} style={[styles.typeBtnMini, mapType === 'hybrid' && styles.typeBtnActive]}>
                <Text style={{ color: mapType === 'hybrid' ? '#FFF' : '#000', fontSize: 12 }}>قمر صناعي</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.mapFooter}>
            <TouchableOpacity style={styles.locateBtn} onPress={getCurrentLocation}>
              <Ionicons name="locate" size={24} color="#000" />
              <Text style={{ fontWeight: 'bold' }}>موقعي الحالي</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtnFull} onPress={() => { setIsLocationConfirmed(true); clearFieldError('location'); setIsMapFullScreen(false); }}>
              <Text style={styles.confirmBtnTextFull}>تأكيد هذا الموقع</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── City / Zone Select Modal ── */}
      <Modal
        visible={locationSelectType !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setLocationSelectType(null)}
      >
        <View style={styles.selectModalOverlay}>
          <TouchableOpacity
            style={styles.selectModalBackdrop}
            activeOpacity={1}
            onPress={() => setLocationSelectType(null)}
          />

          <View style={styles.selectModalSheet}>
            <View style={styles.selectModalHeader}>
              <TouchableOpacity style={styles.selectModalCloseBtn} onPress={() => setLocationSelectType(null)}>
                <Ionicons name="close" size={22} color="#172033" />
              </TouchableOpacity>
              <Text style={styles.selectModalTitle}>
                {locationSelectType === 'city' ? 'اختر المدينة' : 'اختر المنطقة / الحي'}
              </Text>
            </View>

            <FlatList
              data={locationSelectType === 'city' ? cities : zones}
              keyExtractor={(item: any) =>
                locationSelectType === 'city' ? item.code_uuid : String(item.zone_id)
              }
              showsVerticalScrollIndicator={false}
              renderItem={({ item }: { item: any }) => {
                const isCity = locationSelectType === 'city';
                const label = item.libelle;
                const selected = isCity
                  ? selectedCityCode === item.code_uuid
                  : selectedZoneId === item.zone_id;

                return (
                  <TouchableOpacity
                    style={[styles.selectModalItem, selected && styles.selectModalItemActive]}
                    activeOpacity={0.85}
                    onPress={() => {
                      if (isCity) {
                        setSelectedCityCode(String(item.code_uuid));
                        clearFieldError('city');
                      } else {
                        setSelectedZoneId(Number(item.zone_id));
                        clearFieldError('zone');
                      }
                      clearFieldError('submit');
                      setLocationSelectType(null);
                    }}
                  >
                    <View style={[styles.selectModalCheck, selected && styles.selectModalCheckActive]}>
                      {selected && <Ionicons name="checkmark" size={14} color="#FFF" />}
                    </View>
                    <Text style={[styles.selectModalItemText, selected && styles.selectModalItemTextActive]} numberOfLines={1}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>

      {/* ── Preview Modal ── */}
      <Modal visible={previewVisible} animationType="fade" presentationStyle="fullScreen" statusBarTranslucent>
        <View style={styles.previewOverlay}>
          <Pressable style={styles.previewCloseBtn} onPress={closePreview}>
            <Ionicons name="close-circle" size={38} color="#FFF" />
          </Pressable>
          <View style={styles.previewContent}>
            {previewType === 'image' && previewUri ? (
              <Image source={{ uri: previewUri }} style={styles.fullPreviewImage} resizeMode="contain" />
            ) : null}
            {previewType === 'video' && previewUri ? (
              <View style={styles.fullPreviewVideoContainer}>
                <VideoView style={styles.fullPreviewVideo} player={videoPlayer} nativeControls allowsFullscreen allowsPictureInPicture contentFit="contain" />
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: APP_BACKGROUND, direction: 'rtl' },
  screenHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  scrollViewStyle: { flex: 1 },
  container: {
    flexGrow: 1,
  },
  formSection: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 10 },

  stepSectionHeader: {
    width: '100%',
    minHeight: 58,
    backgroundColor: '#EAF7E6',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 3,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    direction: 'ltr',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
    shadowColor: '#f5f7fa',
    shadowOpacity: 0.05,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  stepSectionTitleBox: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },

  stepSectionTitle: {
    fontSize: 21,
    fontWeight: '900',
    color: '#172033',
    textAlign: 'right',
    writingDirection: 'rtl',
  },

  stepSectionIconBox: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#EAF7E6',
    borderWidth: 1.4,
    borderColor: '#CFE8C7',
    alignItems: 'center',
    justifyContent: 'center',
  },

  sectionTitleRow: {
    flexDirection: 'row',
    direction: 'ltr',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 22,
    gap: 10,
  },
  sectionTitleLine: { flex: 1, height: 1.5, backgroundColor: '#E2E8F0', borderRadius: 1 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1E293B',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  sectionTitleIconBox: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#EAF7E6', borderWidth: 1.5, borderColor: '#CFE8C7', alignItems: 'center', justifyContent: 'center' },

  dividerLine: { height: 1, backgroundColor: '#E8ECF4', marginVertical: 9, marginHorizontal: 4 },

  // ── Success Toast ──────────────────────────────────────────────────────────
  successToast: {
    position: 'absolute',
    bottom: 110,
    left: 20,
    right: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    elevation: 12,
    shadowColor: '#2F6B24',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    zIndex: 9999,
  },
  successToastText: {
    color: '#111827',
    fontWeight: '800',
    fontSize: 14,
    textAlign: 'center',
    writingDirection: 'rtl',
  },

  // ── Scroll Indicator ────────────────────────────────────────────────────────
  scrollMoreIndicator: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 5 },
  scrollMoreContent: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', elevation: 4, shadowColor: '#2F6B24', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  scrollMoreText: { fontSize: 12, fontWeight: '700', color: '#4A9F35' },

  subSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  categorySection: { marginBottom: 12 },
  characteristicsSection: { marginTop: 4 },
  errorText: { color: '#DC2626', marginBottom: 10, textAlign: 'right', fontSize: 13 },
  emptyText: { color: '#6B7280', textAlign: 'right', fontSize: 13 },

  fieldLabelWrapper: {
    width: '100%',
    direction: 'ltr',
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginBottom: 4,
  },

  fieldLabel: {
    fontSize: 12.5,
    color: '#374151',
    fontWeight: '600',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  requiredMark: {
    color: '#DC2626',
    fontWeight: 'bold',
  },
  fieldErrorWrapper: {
    width: '100%',
    direction: 'ltr',
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginTop: 3,
    marginBottom: 5,
    paddingHorizontal: 4,
    minHeight: 14,
  },

  fieldError: {
    color: '#DC2626',
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'right',
    writingDirection: 'rtl',
    fontWeight: '600',
  },

  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 13,
    fontSize: 14.5,
    color: '#1F2937',
    marginBottom: 6,
    textAlign: 'right',
    writingDirection: 'rtl',
    elevation: 1,
    shadowColor: '#2F6B24',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  textArea: { height: 120, textAlignVertical: 'top' },
  inputErrorBorder: { borderColor: '#EF4444', borderWidth: 1.5 },
  inputContainer: {
    flexDirection: 'row',
    direction: 'ltr',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 18,
    marginBottom: 6,
    height: 52,
    elevation: 1,
    shadowColor: '#2F6B24',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  contactInputIcon: {
    marginLeft: 10,
  },

  inputInside: {
    flex: 1,
    fontSize: 14.5,
    color: '#1F2937',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  inputContainerDisabled: { backgroundColor: '#F6FAF5' },
  inputInsideDisabled: { color: '#9CA3AF' },

  feesValueText: {
    flex: 1,
    fontSize: 15,
    fontWeight: 'bold',
    color: '#DC2626',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  feesUnitText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#DC2626',
    marginLeft: 10,
    minWidth: 35,
    textAlign: 'left',
    writingDirection: 'ltr',
  },
  unitText: {
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 10,
    minWidth: 35,
    textAlign: 'left',
    writingDirection: 'ltr',
  },
  unitTextBold: {
    fontWeight: 'bold',
    color: '#111827',
    fontSize: 13,
    marginLeft: 10,
    minWidth: 35,
    textAlign: 'left',
    writingDirection: 'ltr',
  },

  rowInputs: {
    flexDirection: 'row-reverse',
    direction: 'ltr',
    gap: 12,
    alignItems: 'flex-start',
  },
  fixedFieldColumn: { flex: 1, minWidth: 0 },

  fieldCard: { backgroundColor: '#FFFFFF', borderWidth: 1.2, borderColor: '#DEE3ED', borderRadius: 16, marginBottom: 10, overflow: 'hidden' },
  characteristicBlock: { marginBottom: 4 },
  fieldCardOpen: { borderColor: '#4A9F35', backgroundColor: '#FAFCFF' },
  fieldCardHeader: {
    flexDirection: 'row',
    direction: 'ltr',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FAFBFD',
  },
  fieldCardLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#374151',
    textAlign: 'right',
    writingDirection: 'rtl',
    flex: 1,
  },
  fieldCardIconBox: { width: 30, height: 30, borderRadius: 10, backgroundColor: '#EAF7E6', borderWidth: 1, borderColor: '#CFE8C7', alignItems: 'center', justifyContent: 'center' },
  fieldCardDivider: { height: 1, backgroundColor: '#E8ECF4' },
  fieldCardInputRow: {
    flexDirection: 'row',
    direction: 'ltr',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 2,
    height: 46,
  },
  fieldCardInput: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'right',
    writingDirection: 'rtl',
    height: '100%',
  },
  fieldCardPrefix: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#4A9F35',
    marginLeft: 8,
    minWidth: 24,
    textAlign: 'left',
    writingDirection: 'ltr',
  },
  fieldCardSelectTrigger: {
    flexDirection: 'row',
    direction: 'ltr',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    paddingHorizontal: 14,
    height: 46,
  },
  fieldCardSelectText: {
    flex: 1,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'right',
    writingDirection: 'rtl',
    fontWeight: '500',
  },
  fieldCardSelectTextSelected: { color: '#111827', fontWeight: '700' },

  fieldCardOptionsDropdown: { backgroundColor: '#FFF', borderWidth: 1.2, borderColor: '#DEE3ED', borderTopWidth: 0, borderBottomLeftRadius: 16, borderBottomRightRadius: 16, overflow: 'hidden', elevation: 6, shadowColor: '#2F6B24', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  fieldCardOption: {
    flexDirection: 'row',
    direction: 'ltr',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 12,
  },
  fieldCardOptionActive: { backgroundColor: '#EAF7E6' },
  fieldCardOptionText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    textAlign: 'right',
    writingDirection: 'rtl',
    fontWeight: '500',
  },
  fieldCardOptionTextActive: { color: '#4A9F35', fontWeight: '700' },
  fieldCardRadio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center' },
  fieldCardRadioActive: { borderColor: '#4A9F35', backgroundColor: '#EAF7E6' },
  fieldCardRadioDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#4A9F35' },

  dimensionCardsRow: {
    flexDirection: 'row',
    direction: 'ltr',
    gap: 12,
    marginBottom: 10,
    alignItems: 'flex-start',
  },
  dimensionFieldColumn: {
    flex: 1,
    minWidth: 0,
  },
  calculatedFieldCard: {
    backgroundColor: '#F6FAF5',
    borderColor: '#CFE8C7',
  },
  calculatedFieldInput: {
    color: '#4A9F35',
    fontWeight: '800',
  },

  specRow: { flexDirection: 'row', direction: 'ltr', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: '#F0F2F5' },
  specLabelGroup: { flexDirection: 'row', direction: 'ltr', alignItems: 'center', gap: 10, flex: 1, justifyContent: 'flex-end' },
  specLabel: { flexShrink: 1, fontSize: 14, fontWeight: '600', color: '#374151', textAlign: 'right', writingDirection: 'rtl' },
  specIconBox: { width: 36, height: 36, borderRadius: 11, backgroundColor: '#EAF7E6', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#CFE8C7' },
  counterControls: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F4FA', borderRadius: 12, padding: 4, gap: 2 },
  counterBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1, borderColor: '#D1D5DB', elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } },
  counterValue: { minWidth: 32, textAlign: 'center', fontSize: 16, fontWeight: 'bold', color: '#4A9F35' },
  switchBox: { minWidth: 90, alignItems: 'flex-start', justifyContent: 'center' },

  categoryScrollWrapper: { width: '100%', direction: 'ltr' },
  categoryScrollContent: {
    flexDirection: 'row-reverse',
    paddingVertical: 10,
    paddingHorizontal: 4,
    gap: 10,
    alignItems: 'center',
    flexGrow: 1,
    justifyContent: 'flex-start',
  },
  categoryPill: {
    flexDirection: 'row-reverse',
    direction: 'ltr',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 3 },
  },
  categoryPillLabel: {
    fontSize: 13.5,
    fontWeight: '700',
    letterSpacing: 0.3,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  categoryPillCheck: {
    width: 18,
    height: 18,
    borderRadius: 5,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 2,
  },

  sectionHeaderRow: {
    flexDirection: 'row',
    direction: 'ltr',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginBottom: 14,
  },
  sectionHeaderDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4A9F35' },
  characteristicsGrid: { gap: 2, direction: 'rtl' },

  segmentContainer: { flexDirection: 'row', backgroundColor: '#EDF0F7', borderRadius: 14, padding: 4, marginBottom: 16 },
  segmentBtn: { flex: 1, paddingVertical: 11, alignItems: 'center', justifyContent: 'center', borderRadius: 12, flexDirection: 'row', gap: 8 },
  segmentBtnActive: { backgroundColor: '#4A9F35', elevation: 3, shadowColor: '#4A9F35', shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  segmentText: { color: '#6B7280', fontWeight: '600', fontSize: 14 },
  segmentTextActive: { color: '#FFF', fontWeight: '700' },

  dashedUpload: { borderWidth: 2, borderColor: '#B8C4D6', borderStyle: 'dashed', borderRadius: 18, padding: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F6F8FC' },
  disabledUpload: { opacity: 0.45 },
  uploadMainText: { marginTop: 10, fontWeight: '700', color: '#1F2937', fontSize: 14 },
  uploadSubText: { fontSize: 12, color: '#94A3B8', marginTop: 3 },

  mediaSection: { marginTop: 18 },
  mediaPreviewRow: { flexDirection: 'row', gap: 4 },
  previewItemWrapper: { position: 'relative', marginLeft: 10 },
  imagePreview: { width: 90, height: 90, borderRadius: 14 },
  videoPlaceholder: { backgroundColor: '#4A9F35', alignItems: 'center', justifyContent: 'center' },
  videoBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '700', marginTop: 4 },
  removeMediaBtn: { position: 'absolute', top: 4, right: 4, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },

  headerRow: { flexDirection: 'row-reverse', direction: 'ltr', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  selectTrigger: { backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 16, minHeight: 54, paddingHorizontal: 14, flexDirection: 'row', direction: 'ltr', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12, elevation: 1, shadowColor: '#2F6B24', shadowOpacity: 0.03, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  selectTriggerDisabled: { opacity: 0.55, backgroundColor: '#F6FAF5' },
  selectTriggerText: { flex: 1, fontSize: 14.5, color: '#1F2937', fontWeight: '700', textAlign: 'right', writingDirection: 'rtl' },
  selectPlaceholder: { color: '#9CA3AF', fontWeight: '600' },
  selectIconBox: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#EAF7E6', borderWidth: 1, borderColor: '#CFE8C7', alignItems: 'center', justifyContent: 'center' },

  mapPreview: { height: 180, borderRadius: 16, overflow: 'hidden', borderWidth: 1.5, borderColor: '#D1D5DB', elevation: 3, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  map: { flex: 1 },
  mapOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'center', alignItems: 'center' },
  mapOverlayText: { backgroundColor: 'rgba(43, 93, 174, 0.9)', color: '#FFF', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 22, fontSize: 13, fontWeight: 'bold', overflow: 'hidden' },
  confirmedBadge: { flexDirection: 'row-reverse', direction: 'ltr', alignItems: 'center', backgroundColor: '#ECFDF5', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14, gap: 6, borderWidth: 1, borderColor: '#A7F3D0' },
  confirmedBadgeText: { fontSize: 12.5, color: '#059669', fontWeight: '700', textAlign: 'right', writingDirection: 'rtl' },

  modernFooter: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    elevation: 14,
    shadowColor: '#2F6B24',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -4 },
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modernButtonRow: {
    flexDirection: 'row-reverse',
    direction: 'ltr',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  modernNextBtn: { backgroundColor: '#4A9F35', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 9, paddingHorizontal: 20, borderRadius: 12, gap: 6, minWidth: 130, elevation: 3, shadowColor: '#4A9F35', shadowOpacity: 0.28, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  modernNextBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  modernBackBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 9, paddingHorizontal: 14, borderRadius: 12, backgroundColor: '#F0F2F7', gap: 5, minWidth: 98 },
  modernBackPlaceholder: { minWidth: 98, height: 38 },
  modernBackBtnText: {
    color: '#4B5563',
    fontWeight: 'bold',
    fontSize: 13,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  publishBtnActive: { backgroundColor: '#047857', shadowColor: '#047857' },
  disabledButton: { opacity: 0.65 },

  stepIndicatorContainer: { flexDirection: 'row-reverse', direction: 'ltr', alignItems: 'flex-start', justifyContent: 'center', marginBottom: 8, gap: 0 },
  stepItemWrapper: { alignItems: 'center', gap: 2 },
  stepCircle: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#E2E8F0' },
  stepCircleActive: { backgroundColor: '#4A9F35', borderColor: '#4A9F35' },
  stepCircleCompleted: { backgroundColor: '#059669', borderColor: '#059669' },
  stepLabel: { fontSize: 9, color: '#94A3B8', fontWeight: '700', textAlign: 'center', writingDirection: 'rtl' },
  stepLabelActive: { color: '#4A9F35', fontWeight: '900' },
  stepCircleText: { fontSize: 10, color: '#64748B', fontWeight: 'bold' },
  stepCircleTextActive: { color: '#FFF' },
  stepLine: { width: 34, height: 2, backgroundColor: '#E2E8F0', marginTop: 11, borderRadius: 1 },
  stepLineActive: { backgroundColor: '#4A9F35' },

  mapFooter: { position: 'absolute', bottom: 30, left: 20, right: 20, gap: 12 },
  confirmBtnFull: { backgroundColor: '#4A9F35', padding: 18, borderRadius: 14, alignItems: 'center', elevation: 4, shadowColor: '#4A9F35', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  confirmBtnTextFull: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  mapHeader: { position: 'absolute', top: 50, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between' },
  mapTypeSwitcher: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 12, padding: 3, elevation: 6, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  typeBtnMini: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 10 },
  typeBtnActive: { backgroundColor: '#4A9F35' },
  locateBtn: { backgroundColor: '#FFF', padding: 16, borderRadius: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, elevation: 4, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  selectModalOverlay: { flex: 1, justifyContent: 'flex-end' },
  selectModalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.45)' },
  selectModalSheet: { backgroundColor: '#FFF', borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 16, paddingBottom: 28, maxHeight: '72%' },
  selectModalHeader: { flexDirection: 'row', direction: 'ltr', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  selectModalCloseBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  selectModalTitle: { flex: 1, fontSize: 18, fontWeight: '900', color: '#172033', textAlign: 'right', writingDirection: 'rtl', marginRight: 12 },
  selectModalItem: { flexDirection: 'row', direction: 'ltr', alignItems: 'center', gap: 12, backgroundColor: '#F6FAF5', borderRadius: 15, paddingHorizontal: 12, paddingVertical: 14, marginBottom: 8 },
  selectModalItemActive: { backgroundColor: '#EAF7E6' },
  selectModalCheck: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center' },
  selectModalCheckActive: { backgroundColor: '#4A9F35', borderColor: '#4A9F35' },
  selectModalItemText: { flex: 1, fontSize: 14.5, fontWeight: '800', color: '#374151', textAlign: 'right', writingDirection: 'rtl' },
  selectModalItemTextActive: { color: '#4A9F35', fontWeight: '900' },

  previewOverlay: { flex: 1, backgroundColor: '#000' },
  previewCloseBtn: { position: 'absolute', top: Platform.OS === 'ios' ? 56 : 24, right: 16, zIndex: 20 },
  previewContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  fullPreviewImage: { width: '100%', height: '100%' },
  fullPreviewVideoContainer: { width: '100%', height: '100%', backgroundColor: '#000' },
  fullPreviewVideo: { width: '100%', height: '100%', backgroundColor: '#000' },
  keyboardView: {
  flex: 1,
},
});