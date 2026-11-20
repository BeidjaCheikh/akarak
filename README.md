# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
### apk
- npx expo prebuild --clean
- npx expo prebuild
- npx expo-doctor   
- eas build -p android --profile preview
- eas build:configure    

<!-- import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Stack, router } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Platform,
  I18nManager,
  Image,
  Switch,
  Alert,
  KeyboardAvoidingView,
  Modal,
  FlatList,
  ActivityIndicator,
  Pressable,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
  findNodeHandle,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Picker } from '@react-native-picker/picker';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { VideoView, useVideoPlayer } from 'expo-video';

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

try {
  if (!I18nManager.isRTL) {
    I18nManager.allowRTL(true);
    I18nManager.forceRTL(true);
  }
} catch (e) {
  console.log(e);
}

type ListingStatus = 'VENDRE' | 'ALLOUER';
type PreviewType = 'image' | 'video' | null;

type FormErrors = {
  title?: string;
  description?: string;
  price?: string;
  category?: string;
  city?: string;
  zone?: string;
  location?: string;
  media?: string;
  submit?: string;
};

type CharacteristicErrors = Record<number, string>;

const MAX_IMAGES = 4;
const MAX_VIDEOS = 1;

const isSurfaceField = (libelle: string) => {
  const l = libelle.trim();
  return l.includes('مساحة') || l.includes('متر مربع') || l.includes('م²');
};

const isStreetField = (libelle: string) => {
  const l = libelle.trim();
  return l.includes('واجهة') || l.includes('شارع') || l.includes('عرض');
};

const CATEGORY_PALETTES = [
  { bg: '#EEF2FF', active: '#3568C4', border: '#C7D2FE', text: '#3568C4' },
  { bg: '#EEF2FF', active: '#3568C4', border: '#C7D2FE', text: '#3568C4' },
  { bg: '#EEF2FF', active: '#3568C4', border: '#C7D2FE', text: '#3568C4' },
  { bg: '#EEF2FF', active: '#3568C4', border: '#C7D2FE', text: '#3568C4' },
  { bg: '#EEF2FF', active: '#3568C4', border: '#C7D2FE', text: '#3568C4' },
  { bg: '#EEF2FF', active: '#3568C4', border: '#C7D2FE', text: '#3568C4' },
];

const FieldLabel = ({ label, required = false }: { label: string; required?: boolean }) => (
  <Text style={styles.fieldLabel}>
    {label} {required && <Text style={styles.requiredMark}>*</Text>}
  </Text>
);

const FieldError = ({ message }: { message?: string }) => (
  <Text style={styles.fieldError}>{message || ' '}</Text>
);

export default function AddPropertyScreen() {
  const mapRef = useRef<MapView>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollIndicatorOpacity = useRef(new Animated.Value(1)).current;
  const [showScrollMore, setShowScrollMore] = useState(true);
  const pulseAnim = useRef(new Animated.Value(0)).current;

  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  // Track field positions for auto-scroll to error
  const fieldPositions = useRef<Record<string, number>>({});

  const registerFieldPosition = useCallback((fieldName: string, y: number) => {
    fieldPositions.current[fieldName] = y;
  }, []);

  const scrollToFirstError = useCallback((errorKeys: string[]) => {
    if (errorKeys.length === 0) return;
    // Find the first error field that has a stored position
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

  // Scroll down a bit when user clicks the "more below" indicator
  const handleScrollMorePress = useCallback(() => {
    scrollViewRef.current?.scrollTo({ y: 99999, animated: true });
  }, []);

  // Pulse animation for scroll indicator
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  // Show scroll indicator again when step changes
  useEffect(() => {
    setShowScrollMore(true);
    Animated.timing(scrollIndicatorOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    // Scroll to top on step change
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    // Reset field positions on step change
    fieldPositions.current = {};
  }, [currentStep]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;

    if (distanceFromBottom < 80) {
      if (showScrollMore) {
        setShowScrollMore(false);
        Animated.timing(scrollIndicatorOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    } else {
      if (!showScrollMore) {
        setShowScrollMore(true);
        Animated.timing(scrollIndicatorOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    }
  }, [showScrollMore]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [fees, setFees] = useState('');
  const [feesLoading, setFeesLoading] = useState(false);
  const [status, setStatus] = useState<ListingStatus>('VENDRE');
  const [submitting, setSubmitting] = useState(false);

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
    if (previewType === 'video' && previewUri) {
      return { uri: previewUri };
    }
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
      if (!montantText?.trim()) {
        setFees('');
        return;
      }

      const montant = Number(montantText);
      if (Number.isNaN(montant) || montant <= 0) {
        setFees('');
        return;
      }

      setFeesLoading(true);
      const data = await getPaidFeesByAmount(montant);
      setFees(String(data.frais ?? ''));
    } catch {
      setFees('');
    } finally {
      setFeesLoading(false);
    }
  };

  const loadCities = async () => {
    try {
      setCitiesLoading(true);
      setCitiesError(null);

      const data = await getCities();
      setCities(data);

      if (data.length > 0) {
        setSelectedCityCode(data[0].code_uuid);
      }
    } catch {
      setCitiesError('Impossible de charger les villes');
    } finally {
      setCitiesLoading(false);
    }
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
    } finally {
      setZonesLoading(false);
    }
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
    } catch {
      setCategoriesError('Impossible de charger les catégories');
    } finally {
      setCategoriesLoading(false);
    }
  };

  const loadCharacteristics = async (codeUuid: string) => {
    try {
      setCharacteristicsLoading(true);
      setCharacteristicsError(null);

      const data = await getCategoryCharacteristics(codeUuid);
      const typeOrder: Record<string, number> = {
        number: 1,
        checkbox: 2,
        text: 3,
        select: 4,
      };

      const sorted = [...data].sort(
        (a, b) => (typeOrder[a.type] ?? 999) - (typeOrder[b.type] ?? 999)
      );

      setCharacteristics(sorted);

      const init: Record<number, any> = {};
      sorted.forEach((item) => {
        switch (item.type) {
          case 'number':
            init[item.attributeId] = 0;
            break;
          case 'checkbox':
            init[item.attributeId] = 'لا';
            break;
          default:
            init[item.attributeId] = '';
        }
      });

      setCharacteristicValues(init);
      setCharacteristicErrors({});
    } catch {
      setCharacteristics([]);
      setCharacteristicValues({});
      setCharacteristicErrors({});
      setCharacteristicsError('Impossible de charger les caractéristiques');
    } finally {
      setCharacteristicsLoading(false);
    }
  };

  const isCategoryAllowed = (c: CategoryDto, s: ListingStatus) =>
    !(s === 'ALLOUER' && c.libelle.trim() === 'أرض');

  const filteredCategories = categories.filter((i) => isCategoryAllowed(i, status));

  useEffect(() => {
    const t = setTimeout(() => loadFeesFromPrice(price), 400);
    return () => clearTimeout(t);
  }, [price]);

  useEffect(() => {
    loadCategories();
    loadCities();
  }, []);

  useEffect(() => {
    if (selectedCategoryCodeUuid) loadCharacteristics(selectedCategoryCodeUuid);
    else {
      setCharacteristics([]);
      setCharacteristicValues({});
      setCharacteristicErrors({});
    }
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
    if (selectedCityCode) {
      loadZones(selectedCityCode);
    } else {
      setZones([]);
      setSelectedZoneId(null);
    }
  }, [selectedCityCode]);

  useEffect(() => {
    if (selectedZoneId === null) return;
    const zone = zones.find((z) => z.zone_id === selectedZoneId);
    if (!zone) return;

    setIsLocationConfirmed(false);
    moveAndRefresh(zone.latitude, zone.longitude, 0.01);
  }, [selectedZoneId, zones]);

  const updateCharacteristicValue = (id: number, value: any) => {
    setCharacteristicValues((prev) => ({ ...prev, [id]: value }));
    clearCharacteristicError(id);
  };

  const moveAndRefresh = (lat: number, lng: number, zoom = 0.005) => {
    const position = {
      latitude: lat,
      longitude: lng,
      latitudeDelta: zoom,
      longitudeDelta: zoom,
    };
    setRegion(position);
    mapRef.current?.animateToRegion(position, 600);
  };

  const handleMapTypeChange = (type: 'standard' | 'hybrid') => {
    setMapType(type);
    setTimeout(() => mapRef.current?.animateToRegion(region, 400), 150);
  };

  const getCurrentLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('تنبيه', 'يجب السماح بالوصول للموقع');
      return;
    }

    const loc = await Location.getCurrentPositionAsync({});
    moveAndRefresh(loc.coords.latitude, loc.coords.longitude);
    setIsLocationConfirmed(false);
    clearFieldError('location');
  };

  const pickImage = async () => {
    if (images.length >= MAX_IMAGES) {
      Alert.alert('تنبيه', `الحد الأقصى للصور هو ${MAX_IMAGES}`);
      return;
    }

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

      if (images.length + newImages.length > MAX_IMAGES) {
        Alert.alert('تنبيه', `يمكنك رفع ${MAX_IMAGES} صور كحد أقصى`);
      }

      setImages(mergedImages);
      clearFieldError('media');
    }
  };

  const pickVideo = async () => {
    if (videos.length >= MAX_VIDEOS) {
      Alert.alert('تنبيه', 'يمكنك رفع فيديو واحد فقط');
      return;
    }

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

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removeVideo = (index: number) => {
    setVideos((prev) => prev.filter((_, i) => i !== index));
  };

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

        if (
          typeof value === 'string' &&
          value.trim() !== '' &&
          !Number.isNaN(Number(value))
        ) {
          return [String(key), Number(value)];
        }

        return [String(key), value];
      })
    );

  const validateStep1 = () => {
    const nextErrors: FormErrors = {};

    if (!title.trim()) nextErrors.title = 'أدخل عنوان الإعلان';
    if (!description.trim()) nextErrors.description = 'أدخل وصف العقار';

    if (!price.trim()) {
      nextErrors.price = 'أدخل السعر';
    } else {
      const numericPrice = Number(price);
      if (Number.isNaN(numericPrice) || numericPrice <= 0) {
        nextErrors.price = 'السعر غير صالح';
      }
    }

    setErrors((prev) => ({ ...prev, ...nextErrors }));
    const errorKeys = Object.keys(nextErrors);
    if (errorKeys.length > 0) {
      scrollToFirstError(errorKeys);
    }
    return errorKeys.length === 0;
  };

  // Option A:
  // text + select required
  // number + checkbox non required
  const validateCharacteristics = () => {
    const nextErrors: CharacteristicErrors = {};

    characteristics.forEach((item) => {
      const value = characteristicValues[item.attributeId];

      if (item.type === 'text') {
        if (typeof value !== 'string' || !value.trim()) {
          nextErrors[item.attributeId] = `حقل ${item.libelle} مطلوب`;
        }
      }

      if (item.type === 'select') {
        if (typeof value !== 'string' || !value.trim()) {
          nextErrors[item.attributeId] = `اختر ${item.libelle}`;
        }
      }
    });

    setCharacteristicErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateStep2 = () => {
    const nextErrors: FormErrors = {};

    if (!selectedCategoryCodeUuid) {
      nextErrors.category = 'اختر نوع العقار';
    }

    setErrors((prev) => ({ ...prev, ...nextErrors }));
    const characteristicsValid = validateCharacteristics();

    const errorKeys = Object.keys(nextErrors);
    if (errorKeys.length > 0) {
      scrollToFirstError(errorKeys);
    }
    return errorKeys.length === 0 && characteristicsValid;
  };

  const validateStep3 = () => {
    const nextErrors: FormErrors = {};

    if (!selectedCityCode) nextErrors.city = 'اختر المدينة';
    if (selectedZoneId === null) nextErrors.zone = 'اختر المنطقة';
    if (!isLocationConfirmed) nextErrors.location = 'يرجى تحديد الموقع وتأكيده على الخريطة';

    setErrors((prev) => ({ ...prev, ...nextErrors }));
    const errorKeys = Object.keys(nextErrors);
    if (errorKeys.length > 0) {
      scrollToFirstError(errorKeys);
    }
    return errorKeys.length === 0;
  };

  const validateStep4 = () => {
    const nextErrors: FormErrors = {};

    if (images.length > MAX_IMAGES) {
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

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep((s) => s - 1);
  };

  const handleSubmit = async () => {
    setErrors({});

    const isStep1Valid = validateStep1();
    const isStep2Valid = validateStep2();
    const isStep3Valid = validateStep3();
    const isStep4Valid = validateStep4();

    if (!isStep1Valid) {
      setCurrentStep(1);
      return;
    }

    if (!isStep2Valid) {
      setCurrentStep(2);
      return;
    }

    if (!isStep3Valid) {
      setCurrentStep(3);
      return;
    }

    if (!isStep4Valid) {
      setCurrentStep(4);
      return;
    }

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

    try {
      setSubmitting(true);
      clearFieldError('submit');

      const payload: {
        product: {
          title: string;
          description: string;
          price: number;
          status: string;
          categoryId: number;
          zoneId: number;
          latitude: number;
          longitude: number;
          attributes: Record<string, any>;
        };
      } = {
        product: {
          title: title.trim(),
          description: description.trim(),
          price: numericPrice,
          status,
          categoryId: selectedCategory.categoryId,
          zoneId: selectedZoneId,
          latitude: region.latitude,
          longitude: region.longitude,
          attributes: normalizeAttributes(),
        },
      };

      console.log('SEND PAYLOAD =>', JSON.stringify(payload, null, 2));

      const result = await createProduct(payload);

      console.log('CREATE PRODUCT RESULT =>', result);

      if (!result?.success || !result?.productId) {
        setFieldError('submit', result?.message || 'فشل إنشاء العقار');
        return;
      }

      const productId = result.productId;

      for (const imageUri of images) {
        await uploadFile(imageUri, 'images', productId);
      }

      for (const videoUri of videos) {
        await uploadFile(videoUri, 'videos', productId);
      }

      Alert.alert('تمت العملية بنجاح', 'تمت إضافة العقار ورفع الملفات بنجاح', [
        {
          text: 'إغلاق',
          style: 'cancel',
        },
        {
          text: 'عرض العقار',
          onPress: () => {
            router.replace({
              pathname: '/product/[id]' as any,
              params: { id: String(productId) },
            });
          },
        },
      ]);
    } catch (error: any) {
      console.log('CREATE PRODUCT ERROR =>', error);
      console.log('CREATE PRODUCT ERROR RESPONSE =>', error?.response?.data);

      setFieldError(
        'submit',
        error?.response?.data?.message || 'حدث خطأ أثناء إنشاء العقار'
      );
    } finally {
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
              <View style={[
                styles.stepCircle,
                isActive && styles.stepCircleActive,
                isCompleted && styles.stepCircleCompleted,
              ]}>
                {isCompleted ? (
                  <Ionicons name="checkmark" size={14} color="#FFF" />
                ) : (
                  <Ionicons name={meta.icon} size={14} color={isActive ? '#FFF' : '#94A3B8'} />
                )}
              </View>
              <Text style={[styles.stepLabel, isActive && styles.stepLabelActive]}>{meta.label}</Text>
            </View>
            {index < 3 && (
              <View style={[styles.stepLine, currentStep > step && styles.stepLineActive]} />
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
    <View
      style={[
        styles.inputContainer,
        { flex: 1 },
        !editable && styles.inputContainerDisabled,
        hasError && styles.inputErrorBorder,
      ]}
    >
      <TextInput
        style={[styles.inputInside, !editable && styles.inputInsideDisabled]}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        keyboardType="numeric"
        value={value}
        onChangeText={(v) => {
          setValue(v);
          clearFieldError('price');
          clearFieldError('submit');
        }}
        editable={editable}
      />
      {loading ? (
        <ActivityIndicator size="small" color="#3568C4" style={{ marginLeft: 8 }} />
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
    if (categoriesLoading) {
      return <ActivityIndicator size="small" color="#3568C4" style={{ marginVertical: 12 }} />;
    }

    if (categoriesError) {
      return <Text style={styles.errorText}>{categoriesError}</Text>;
    }

    if (!filteredCategories.length) {
      return <Text style={styles.emptyText}>لا توجد فئات متاحة</Text>;
    }

    return (
      <>
        <FlatList
          data={filteredCategories}
          horizontal
          inverted
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScrollContent}
          keyExtractor={(item) => item.code_uuid}
          renderItem={({ item, index }) => {
            const palette = CATEGORY_PALETTES[index % CATEGORY_PALETTES.length];
            const isActive = selectedCategoryCodeUuid === item.code_uuid;

            return (
              <TouchableOpacity
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
                    : {
                      backgroundColor: palette.bg,
                      borderColor: palette.border,
                    },
                ]}
              >
                <Text style={[styles.categoryPillLabel, { color: isActive ? '#FFF' : palette.text }]}>
                  {item.libelle}
                </Text>
                {isActive && (
                  <View style={styles.categoryPillCheck}>
                    <Ionicons name="checkmark" size={10} color={palette.active} />
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
        <FieldError message={errors.category} />
      </>
    );
  };

  const renderFieldHeader = (
    libelle: string,
    iconName: string,
    required = false
  ) => (
    <View style={styles.fieldCardHeader}>
      <Text style={styles.fieldCardLabel}>
        {libelle} {required && <Text style={styles.requiredMark}>*</Text>}
      </Text>
      <View style={styles.fieldCardIconBox}>
        <MaterialCommunityIcons name={iconName as any} size={15} color="#3568C4" />
      </View>
    </View>
  );

  const renderCharacteristicField = (item: CharacteristicDto) => {
    const value = characteristicValues[item.attributeId];
    const iconName = getCharacteristicIcon(item.libelle).name;
    const error = characteristicErrors[item.attributeId];
    const isRequired = item.type === 'text' || item.type === 'select';

    if (item.type === 'number') {
      return (
        <View key={item.attributeId} style={styles.specRow}>
          <View style={styles.counterControls}>
            <TouchableOpacity
              onPress={() =>
                updateCharacteristicValue(
                  item.attributeId,
                  Math.max(0, Number(value || 0) - 1)
                )
              }
              style={styles.counterBtn}
            >
              <Ionicons name="remove" size={16} color="#3568C4" />
            </TouchableOpacity>

            <Text style={styles.counterValue}>{Number(value || 0)}</Text>

            <TouchableOpacity
              onPress={() =>
                updateCharacteristicValue(item.attributeId, Number(value || 0) + 1)
              }
              style={styles.counterBtn}
            >
              <Ionicons name="add" size={16} color="#3568C4" />
            </TouchableOpacity>
          </View>

          <View style={styles.specLabelGroup}>
            <Text style={styles.specLabel}>{item.libelle}</Text>
            <View style={styles.specIconBox}>
              <MaterialCommunityIcons name={iconName as any} size={18} color="#3568C4" />
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
              trackColor={{ false: '#E5E7EB', true: '#93C5FD' }}
              thumbColor={isChecked ? '#3568C4' : '#9CA3AF'}
              ios_backgroundColor="#E5E7EB"
              onValueChange={(checked) =>
                updateCharacteristicValue(item.attributeId, checked ? 'نعم' : 'لا')
              }
              value={isChecked}
            />
          </View>

          <View style={styles.specLabelGroup}>
            <Text style={styles.specLabel}>{item.libelle}</Text>
            <View style={[styles.specIconBox, isChecked && { backgroundColor: '#EEF2FF' }]}>
              <MaterialCommunityIcons
                name={iconName as any}
                size={18}
                color={isChecked ? '#3568C4' : '#9CA3AF'}
              />
            </View>
          </View>
        </View>
      );
    }

    if (item.type === 'text') {
      const isSurface = isSurfaceField(item.libelle);
      const isStreet = isStreetField(item.libelle);
      const prefix = isSurface ? 'm²' : isStreet ? 'm' : null;

      return (
        <View key={item.attributeId} style={styles.characteristicBlock}>
          <View style={[styles.fieldCard, error && styles.inputErrorBorder]}>
            {renderFieldHeader(item.libelle, iconName, isRequired)}
            <View style={styles.fieldCardDivider} />
            <View style={styles.fieldCardInputRow}>
              <TextInput
                style={styles.fieldCardInput}
                placeholder={prefix ? '0' : `أدخل ${item.libelle}`}
                placeholderTextColor="#C4C9D4"
                keyboardType={prefix ? 'numeric' : 'default'}
                value={String(value ?? '')}
                onChangeText={(v) => updateCharacteristicValue(item.attributeId, v)}
              />
              {prefix && <Text style={styles.fieldCardPrefix}>{prefix}</Text>}
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
          <View
            style={[
              styles.fieldCard,
              { marginBottom: 0 },
              isOpen && styles.fieldCardOpen,
              error && styles.inputErrorBorder,
            ]}
          >
            {renderFieldHeader(item.libelle, iconName, isRequired)}
            <View style={styles.fieldCardDivider} />
            <TouchableOpacity
              style={styles.fieldCardSelectTrigger}
              onPress={() => setOpenSelectId(isOpen ? null : item.attributeId)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isOpen ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={value ? '#3568C4' : '#9CA3AF'}
              />
              <Text
                style={[
                  styles.fieldCardSelectText,
                  value && styles.fieldCardSelectTextSelected,
                ]}
              >
                {value || 'اختر...'}
              </Text>
            </TouchableOpacity>
          </View>

          {isOpen && (
            <View style={styles.fieldCardOptionsDropdown}>
              {item.values.map((option, idx) => {
                const selected = value === option;

                return (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.fieldCardOption,
                      selected && styles.fieldCardOptionActive,
                      idx === item.values.length - 1 && { borderBottomWidth: 0 },
                    ]}
                    onPress={() => {
                      updateCharacteristicValue(item.attributeId, option);
                      setOpenSelectId(null);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.fieldCardRadio, selected && styles.fieldCardRadioActive]}>
                      {selected && <View style={styles.fieldCardRadioDot} />}
                    </View>
                    <Text
                      style={[
                        styles.fieldCardOptionText,
                        selected && styles.fieldCardOptionTextActive,
                      ]}
                    >
                      {option}
                    </Text>
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

  const renderCharacteristicsGrid = () => {
    const textItems = characteristics.filter((i) => i.type === 'text');
    const nonTextItems = characteristics.filter((i) => i.type !== 'text');

    const surfaceItem = textItems.find((i) => isSurfaceField(i.libelle));
    const streetItem = textItems.find((i) => isStreetField(i.libelle));
    const otherText = textItems.filter(
      (i) => !isSurfaceField(i.libelle) && !isStreetField(i.libelle)
    );

    return (
      <>
        {nonTextItems.map((item) => renderCharacteristicField(item))}

        {(surfaceItem || streetItem) && (
          <View style={styles.pairedCardsRow}>
            {[streetItem, surfaceItem].filter(Boolean).map((item) => {
              if (!item) return null;

              const isSurface = isSurfaceField(item.libelle);
              const prefix = isSurface ? 'm²' : 'm';
              const iconName = getCharacteristicIcon(item.libelle).name;
              const error = characteristicErrors[item.attributeId];
              const isRequired = item.type === 'text' || item.type === 'select';

              return (
                <View key={item.attributeId} style={styles.fixedFieldColumn}>
                  <View style={[styles.fieldCard, error && styles.inputErrorBorder]}>
                    {renderFieldHeader(item.libelle, iconName, isRequired)}
                    <View style={styles.fieldCardDivider} />
                    <View style={styles.fieldCardInputRow}>
                      <TextInput
                        style={styles.fieldCardInput}
                        placeholder="0"
                        placeholderTextColor="#C4C9D4"
                        keyboardType="numeric"
                        value={String(characteristicValues[item.attributeId] ?? '')}
                        onChangeText={(v) => updateCharacteristicValue(item.attributeId, v)}
                      />
                      <Text style={styles.fieldCardPrefix}>{prefix}</Text>
                    </View>
                  </View>
                  <FieldError message={error} />
                </View>
              );
            })}
          </View>
        )}

        {otherText.map((item) => renderCharacteristicField(item))}
      </>
    );
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'إضافة عقار جديد', headerShadowVisible: false }} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          style={styles.scrollViewStyle}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >

          {currentStep === 1 && (
            <View style={styles.formSection}>
              <View style={styles.sectionTitleRow}>
                <View style={styles.sectionTitleLine} />
                <Text style={styles.sectionTitle}>معلومات العقار</Text>
                <View style={styles.sectionTitleIconBox}>
                  <Ionicons name="home-outline" size={18} color="#2B5DAE" />
                </View>
              </View>

              <View onLayout={(e) => registerFieldPosition('title', e.nativeEvent.layout.y)}>
                <FieldLabel label="عنوان الإعلان" required />
                <TextInput
                  style={[styles.input, errors.title && styles.inputErrorBorder]}
                  placeholder="مثلاً: شقة فاخرة للبيع"
                  placeholderTextColor="#9CA3AF"
                  value={title}
                  onChangeText={(v) => {
                    setTitle(v);
                    clearFieldError('title');
                    clearFieldError('submit');
                  }}
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
                  onChangeText={(v) => {
                    setDescription(v);
                    clearFieldError('description');
                    clearFieldError('submit');
                  }}
                />
                <FieldError message={errors.description} />
              </View>

              <View style={styles.dividerLine} />

              <FieldLabel label="نوع الإعلان" required />
              <View style={styles.segmentContainer}>
                <TouchableOpacity
                  style={[styles.segmentBtn, status === 'VENDRE' && styles.segmentBtnActive]}
                  onPress={() => setStatus('VENDRE')}
                >
                  <MaterialCommunityIcons
                    name="tag-outline"
                    size={18}
                    color={status === 'VENDRE' ? '#FFF' : '#6B7280'}
                  />
                  <Text style={[styles.segmentText, status === 'VENDRE' && styles.segmentTextActive]}>
                    بيع
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.segmentBtn, status === 'ALLOUER' && styles.segmentBtnActive]}
                  onPress={() => setStatus('ALLOUER')}
                >
                  <MaterialCommunityIcons
                    name="key-outline"
                    size={18}
                    color={status === 'ALLOUER' ? '#FFF' : '#6B7280'}
                  />
                  <Text style={[styles.segmentText, status === 'ALLOUER' && styles.segmentTextActive]}>
                    إيجار
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.dividerLine} />

              <View style={styles.rowInputs} onLayout={(e) => registerFieldPosition('price', e.nativeEvent.layout.y)}>
                <View style={styles.fixedFieldColumn}>
                  <FieldLabel label="الرسوم" />
                  {renderFeesDisplay()}
                  <FieldError message="" />
                </View>

                <View style={styles.fixedFieldColumn}>
                  <FieldLabel label="السعر" required />
                  {renderUnitInput('السعر', 'MRU', price, setPrice, true, true, false, !!errors.price)}
                  <FieldError message={errors.price} />
                </View>
              </View>

              <FieldError message={errors.submit} />
            </View>
          )}

          {currentStep === 2 && (
            <View style={styles.formSection}>
              <View style={styles.sectionTitleRow}>
                <View style={styles.sectionTitleLine} />
                <Text style={styles.sectionTitle}>تفاصيل العقار</Text>
                <View style={styles.sectionTitleIconBox}>
                  <Ionicons name="list-outline" size={18} color="#2B5DAE" />
                </View>
              </View>

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
                  <ActivityIndicator size="small" color="#3568C4" />
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

          {currentStep === 3 && (
            <View style={styles.formSection}>
              <View style={styles.sectionTitleRow}>
                <View style={styles.sectionTitleLine} />
                <Text style={styles.sectionTitle}>موقع العقار</Text>
                <View style={styles.sectionTitleIconBox}>
                  <Ionicons name="location-outline" size={18} color="#2B5DAE" />
                </View>
              </View>

              <View style={styles.headerRow}>
                {isLocationConfirmed ? (
                  <View style={styles.confirmedBadge}>
                    <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                    <Text style={styles.confirmedBadgeText}>تم التأكيد</Text>
                  </View>
                ) : (
                  <View style={[styles.confirmedBadge, { backgroundColor: '#FFF7ED' }]}>
                    <Ionicons name="alert-circle" size={14} color="#F97316" />
                    <Text style={[styles.confirmedBadgeText, { color: '#F97316' }]}>
                      بانتظار التحديد
                    </Text>
                  </View>
                )}
              </View>

              <View
                style={[styles.pickerContainer, errors.city && styles.inputErrorBorder]}
                onLayout={(e) => registerFieldPosition('city', e.nativeEvent.layout.y)}
              >
                <FieldLabel label="المدينة" required />
                {citiesLoading ? (
                  <ActivityIndicator size="small" color="#3568C4" style={{ marginVertical: 10 }} />
                ) : citiesError ? (
                  <Text style={styles.errorText}>{citiesError}</Text>
                ) : (
                  <Picker
                    selectedValue={selectedCityCode}
                    style={styles.pickerElement}
                    onValueChange={(val) => {
                      setSelectedCityCode(String(val));
                      clearFieldError('city');
                      clearFieldError('submit');
                    }}
                  >
                    {cities.map((city) => (
                      <Picker.Item
                        key={city.code_uuid}
                        label={city.libelle}
                        value={city.code_uuid}
                        color="#000"
                      />
                    ))}
                  </Picker>
                )}
              </View>
              <FieldError message={errors.city} />

              <View
                style={[styles.pickerContainer, errors.zone && styles.inputErrorBorder]}
                onLayout={(e) => registerFieldPosition('zone', e.nativeEvent.layout.y)}
              >
                <FieldLabel label="المنطقة / الحي" required />
                {zonesLoading ? (
                  <ActivityIndicator size="small" color="#3568C4" style={{ marginVertical: 10 }} />
                ) : zonesError ? (
                  <Text style={styles.errorText}>{zonesError}</Text>
                ) : (
                  <Picker
                    selectedValue={selectedZoneId}
                    style={styles.pickerElement}
                    onValueChange={(val) => {
                      setSelectedZoneId(Number(val));
                      clearFieldError('zone');
                      clearFieldError('submit');
                    }}
                  >
                    {zones.map((zone) => (
                      <Picker.Item
                        key={zone.zone_id}
                        label={zone.libelle}
                        value={zone.zone_id}
                        color="#000"
                      />
                    ))}
                  </Picker>
                )}
              </View>
              <FieldError message={errors.zone} />

              <TouchableOpacity
                style={[
                  styles.mapPreview,
                  isLocationConfirmed && { borderColor: '#10B981' },
                  errors.location && styles.inputErrorBorder,
                ]}
                onPress={() => setIsMapFullScreen(true)}
              >
                <MapView
                  provider={PROVIDER_GOOGLE}
                  style={styles.map}
                  region={region}
                  scrollEnabled={false}
                >
                  <Marker
                    coordinate={{
                      latitude: region.latitude,
                      longitude: region.longitude,
                    }}
                  />
                </MapView>
                <View style={styles.mapOverlay}>
                  <Text style={styles.mapOverlayText}>
                    {isLocationConfirmed ? 'تم تأكيد الموقع ✓' : 'اضغط لتحديد الموقع بدقة'}
                  </Text>
                </View>
              </TouchableOpacity>
              <FieldError message={errors.location} />
              <FieldError message={errors.submit} />
            </View>
          )}

          {currentStep === 4 && (
            <View style={styles.formSection}>
              <View style={styles.sectionTitleRow}>
                <View style={styles.sectionTitleLine} />
                <Text style={styles.sectionTitle}>المرفقات</Text>
                <View style={styles.sectionTitleIconBox}>
                  <Ionicons name="camera-outline" size={18} color="#2B5DAE" />
                </View>
              </View>

              <FieldLabel label="صور العقار" />
              <TouchableOpacity
                style={[
                  styles.dashedUpload,
                  images.length >= MAX_IMAGES && styles.disabledUpload,
                  errors.media && styles.inputErrorBorder,
                ]}
                onPress={pickImage}
                disabled={images.length >= MAX_IMAGES}
              >
                <Ionicons name="images-outline" size={32} color="#2E3A59" />
                <Text style={styles.uploadMainText}>اضغط لرفع الصور</Text>
                <Text style={styles.uploadSubText}>{`${images.length}/${MAX_IMAGES} صور`}</Text>
              </TouchableOpacity>

              {images.length > 0 && (
                <View style={styles.mediaSection}>

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.mediaPreviewRow}
                  >
                    {images.map((uri, idx) => (
                      <View key={`img-${idx}`} style={styles.previewItemWrapper}>
                        <TouchableOpacity onPress={() => openPreview('image', uri)} activeOpacity={0.85}>
                          <Image source={{ uri }} style={styles.imagePreview} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => removeImage(idx)}
                          style={styles.removeMediaBtn}
                        >
                          <Ionicons name="close" size={14} color="#FFF" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}

              <FieldLabel label="فيديو العقار" />
              <TouchableOpacity
                style={[
                  styles.dashedUpload,
                  { marginTop: 15 },
                  videos.length >= MAX_VIDEOS && styles.disabledUpload,
                  errors.media && styles.inputErrorBorder,
                ]}
                onPress={pickVideo}
                disabled={videos.length >= MAX_VIDEOS}
              >
                <Ionicons name="videocam-outline" size={32} color="#2E3A59" />
                <Text style={styles.uploadMainText}>إضافة فيديو للعقار</Text>
                <Text style={styles.uploadSubText}>{`${videos.length}/${MAX_VIDEOS} فيديو`}</Text>
              </TouchableOpacity>

              {videos.length > 0 && (
                <View style={styles.mediaSection}>

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.mediaPreviewRow}
                  >
                    {videos.map((uri, idx) => (
                      <View key={`vid-${idx}`} style={styles.previewItemWrapper}>
                        <TouchableOpacity onPress={() => openPreview('video', uri)} activeOpacity={0.85}>
                          <View style={[styles.imagePreview, styles.videoPlaceholder]}>
                            <Ionicons name="play-circle" size={32} color="#FFF" />
                            <Text style={styles.videoBadgeText}>Video</Text>
                          </View>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => removeVideo(idx)}
                          style={styles.removeMediaBtn}
                        >
                          <Ionicons name="close" size={14} color="#FFF" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}

              <FieldError message={errors.media} />
              <FieldError message={errors.submit} />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Scroll More Indicator — Clickable */}
      <Animated.View
        style={[
          styles.scrollMoreIndicator,
          { opacity: scrollIndicatorOpacity },
        ]}
        pointerEvents={showScrollMore ? 'auto' : 'none'}
      >
        <TouchableOpacity
          onPress={handleScrollMorePress}
          activeOpacity={0.7}
          style={styles.scrollMoreContent}
        >
          <Animated.View
            style={{
              transform: [{
                translateY: pulseAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 5],
                }),
              }],
            }}
          >
            <Ionicons name="chevron-down" size={18} color="#2B5DAE" />
          </Animated.View>
          <Text style={styles.scrollMoreText}>المزيد في الأسفل</Text>
        </TouchableOpacity>
      </Animated.View>

      <View style={styles.modernFooter}>
        {renderStepIndicator()}
        <View style={styles.modernButtonRow}>
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

          {currentStep > 1 && !submitting && (
            <TouchableOpacity style={styles.modernBackBtn} onPress={prevStep}>
              <Ionicons name="arrow-forward" size={18} color="#4B5563" />
              <Text style={styles.modernBackBtnText}>السابق</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <Modal visible={isMapFullScreen} animationType="slide">
        <View style={{ flex: 1 }}>
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={{ flex: 1 }}
            mapType={mapType}
            region={region}
            onPress={(e) => {
              setRegion({ ...region, ...e.nativeEvent.coordinate });
              setIsLocationConfirmed(false);
              clearFieldError('location');
            }}
          >
            <Marker
              coordinate={{ latitude: region.latitude, longitude: region.longitude }}
              draggable
              onDragEnd={(e) => {
                setRegion({ ...region, ...e.nativeEvent.coordinate });
                setIsLocationConfirmed(false);
                clearFieldError('location');
              }}
            />
          </MapView>

          <View style={styles.mapHeader}>
            <TouchableOpacity onPress={() => setIsMapFullScreen(false)}>
              <Ionicons name="close-circle" size={40} color="#2E3A59" />
            </TouchableOpacity>

            <View style={styles.mapTypeSwitcher}>
              <TouchableOpacity
                onPress={() => handleMapTypeChange('standard')}
                style={[styles.typeBtnMini, mapType === 'standard' && styles.typeBtnActive]}
              >
                <Text style={{ color: mapType === 'standard' ? '#FFF' : '#000', fontSize: 12 }}>
                  خريطة
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleMapTypeChange('hybrid')}
                style={[styles.typeBtnMini, mapType === 'hybrid' && styles.typeBtnActive]}
              >
                <Text style={{ color: mapType === 'hybrid' ? '#FFF' : '#000', fontSize: 12 }}>
                  قمر صناعي
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.mapFooter}>
            <TouchableOpacity style={styles.locateBtn} onPress={getCurrentLocation}>
              <Ionicons name="locate" size={24} color="#000" />
              <Text style={{ fontWeight: 'bold' }}>موقعي الحالي</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.confirmBtnFull}
              onPress={() => {
                setIsLocationConfirmed(true);
                clearFieldError('location');
                setIsMapFullScreen(false);
              }}
            >
              <Text style={styles.confirmBtnTextFull}>تأكيد هذا الموقع</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={previewVisible}
        animationType="fade"
        presentationStyle="fullScreen"
        statusBarTranslucent
      >
        <View style={styles.previewOverlay}>
          <Pressable style={styles.previewCloseBtn} onPress={closePreview}>
            <Ionicons name="close-circle" size={38} color="#FFF" />
          </Pressable>

          <View style={styles.previewContent}>
            {previewType === 'image' && previewUri ? (
              <Image
                source={{ uri: previewUri }}
                style={styles.fullPreviewImage}
                resizeMode="contain"
              />
            ) : null}

            {previewType === 'video' && previewUri ? (
              <View style={styles.fullPreviewVideoContainer}>
                <VideoView
                  style={styles.fullPreviewVideo}
                  player={videoPlayer}
                  nativeControls
                  allowsFullscreen
                  allowsPictureInPicture
                  contentFit="contain"
                />
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  /* ── Screen & Layout ────────────────────────────────── */
  screen: { flex: 1, backgroundColor: '#F8FAFD' },
  scrollViewStyle: { flex: 1 },
  container: { paddingBottom: 240, flexGrow: 1 },

  /* ── Full-Screen Form Section ───────────────────────── */
  formSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
  },

  /* ── Section Title Row ─────────────────────────────── */
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 22,
    gap: 10,
  },
  sectionTitleLine: {
    flex: 1,
    height: 1.5,
    backgroundColor: '#E2E8F0',
    borderRadius: 1,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1E293B',
    textAlign: 'right',
  },
  sectionTitleIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ── Divider ────────────────────────────────────────── */
  dividerLine: {
    height: 1,
    backgroundColor: '#E8ECF4',
    marginVertical: 16,
    marginHorizontal: 4,
  },

  /* ── Scroll More Indicator ──────────────────────────── */
  scrollMoreIndicator: {
    position: 'absolute',
    bottom: 165,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 5,
  },
  scrollMoreGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: 'transparent',
  },
  scrollMoreContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 4,
    shadowColor: '#1E3A5F',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  scrollMoreText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2B5DAE',
  },

  /* ── Sub Section ────────────────────────────────────── */
  subSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'right',
  },
  categorySection: { marginBottom: 12 },
  characteristicsSection: { marginTop: 4 },
  errorText: { color: '#DC2626', marginBottom: 10, textAlign: 'right', fontSize: 13 },
  emptyText: { color: '#6B7280', textAlign: 'right', fontSize: 13 },

  /* ── Field Label & Error ────────────────────────────── */
  fieldLabel: {
    fontSize: 12.5,
    color: '#374151',
    fontWeight: '600',
    textAlign: 'right',
    marginBottom: 7,
  },
  requiredMark: { color: '#DC2626', fontWeight: 'bold' },
  fieldError: {
    color: '#DC2626',
    fontSize: 11.5,
    textAlign: 'right',
    marginTop: -4,
    marginBottom: 10,
    fontWeight: '600',
    minHeight: 18,
  },

  /* ── Inputs ─────────────────────────────────────────── */
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
    fontSize: 14.5,
    color: '#1F2937',
    marginBottom: 12,
    textAlign: 'right',
    elevation: 1,
    shadowColor: '#1E3A5F',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  textArea: { height: 120, textAlignVertical: 'top' },
  inputErrorBorder: { borderColor: '#EF4444', borderWidth: 1.5 },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 18,
    marginBottom: 12,
    height: 54,
    elevation: 1,
    shadowColor: '#1E3A5F',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  inputInside: { flex: 1, fontSize: 14.5, color: '#1F2937', textAlign: 'right' },
  inputContainerDisabled: { backgroundColor: '#F8FAFC' },
  inputInsideDisabled: { color: '#9CA3AF' },

  /* ── Fees ────────────────────────────────────────────── */
  feesValueText: {
    flex: 1,
    fontSize: 15,
    fontWeight: 'bold',
    color: '#DC2626',
    textAlign: 'right',
  },
  feesUnitText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#DC2626',
    marginLeft: 10,
    minWidth: 35,
  },

  /* ── Unit Labels ────────────────────────────────────── */
  unitText: { fontSize: 13, color: '#6B7280', marginLeft: 10, minWidth: 35 },
  unitTextBold: {
    fontWeight: 'bold',
    color: '#111827',
    fontSize: 13,
    marginLeft: 10,
    minWidth: 35,
  },

  /* ── Row Inputs ─────────────────────────────────────── */
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  fixedFieldColumn: {
    flex: 1,
    minWidth: 0,
  },

  /* ── Field Card (Characteristics) ───────────────────── */
  fieldCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: '#DEE3ED',
    borderRadius: 16,
    marginBottom: 10,
    overflow: 'hidden',
  },
  characteristicBlock: {
    marginBottom: 4,
  },
  fieldCardOpen: {
    borderColor: '#2B5DAE',
    backgroundColor: '#FAFCFF',
  },
  fieldCardHeader: {
    flexDirection: 'row',
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
    flex: 1,
  },
  fieldCardIconBox: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldCardDivider: {
    height: 1,
    backgroundColor: '#E8ECF4',
  },
  fieldCardInputRow: {
    flexDirection: 'row',
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
    height: '100%',
  },
  fieldCardPrefix: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#2B5DAE',
    marginLeft: 8,
    minWidth: 24,
    textAlign: 'left',
  },
  fieldCardSelectTrigger: {
    flexDirection: 'row',
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
    fontWeight: '500',
  },
  fieldCardSelectTextSelected: {
    color: '#111827',
    fontWeight: '700',
  },

  /* ── Dropdown Options ───────────────────────────────── */
  fieldCardOptionsDropdown: {
    backgroundColor: '#FFF',
    borderWidth: 1.2,
    borderColor: '#DEE3ED',
    borderTopWidth: 0,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#1E3A5F',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  fieldCardOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 12,
  },
  fieldCardOptionActive: { backgroundColor: '#EFF3FF' },
  fieldCardOptionText: {
    fontSize: 14,
    color: '#374151',
    textAlign: 'right',
    fontWeight: '500',
  },
  fieldCardOptionTextActive: { color: '#2B5DAE', fontWeight: '700' },
  fieldCardRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldCardRadioActive: { borderColor: '#2B5DAE', backgroundColor: '#EFF3FF' },
  fieldCardRadioDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#2B5DAE',
  },

  /* ── Paired Cards ───────────────────────────────────── */
  pairedCardsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
    alignItems: 'flex-start',
  },

  /* ── Spec Rows (counter / switch) ───────────────────── */
  specRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F5',
  },
  specLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    justifyContent: 'flex-end',
  },
  specLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'right',
  },
  specIconBox: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: '#F0F6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#C7D8F0',
  },
  counterControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F4FA',
    borderRadius: 12,
    padding: 4,
    gap: 2,
  },
  counterBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  counterValue: {
    minWidth: 32,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2B5DAE',
  },
  switchBox: { minWidth: 90, alignItems: 'flex-start', justifyContent: 'center' },

  /* ── Category Scroll ────────────────────────────────── */
  categoryScrollContent: {
    paddingVertical: 10,
    paddingHorizontal: 4,
    flexDirection: 'row',
    gap: 10,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 3 },
  },
  categoryPillLabel: { fontSize: 13.5, fontWeight: '700', letterSpacing: 0.3 },
  categoryPillCheck: {
    width: 18,
    height: 18,
    borderRadius: 5,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },

  /* ── Section Header ─────────────────────────────────── */
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginBottom: 14,
  },
  sectionHeaderDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2B5DAE',
  },
  characteristicsGrid: { gap: 2 },

  /* ── Segment Control ────────────────────────────────── */
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#EDF0F7',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    borderWidth: 0,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 8,
  },
  segmentBtnActive: {
    backgroundColor: '#2B5DAE',
    elevation: 3,
    shadowColor: '#2B5DAE',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  segmentText: { color: '#6B7280', fontWeight: '600', fontSize: 14 },
  segmentTextActive: { color: '#FFF', fontWeight: '700' },

  /* ── Upload Zones ───────────────────────────────────── */
  dashedUpload: {
    borderWidth: 2,
    borderColor: '#B8C4D6',
    borderStyle: 'dashed',
    borderRadius: 18,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F6F8FC',
  },
  disabledUpload: {
    opacity: 0.45,
  },
  uploadMainText: { marginTop: 10, fontWeight: '700', color: '#1F2937', fontSize: 14 },
  uploadSubText: { fontSize: 12, color: '#94A3B8', marginTop: 3 },

  /* ── Media Previews ─────────────────────────────────── */
  mediaSection: {
    marginTop: 18,
  },
  mediaSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    textAlign: 'right',
    marginBottom: 10,
  },
  mediaPreviewRow: {
    flexDirection: 'row',
    gap: 4,
  },
  previewItemWrapper: {
    position: 'relative',
    marginLeft: 10,
  },
  imagePreview: {
    width: 90,
    height: 90,
    borderRadius: 14,
  },
  videoPlaceholder: {
    backgroundColor: '#2B5DAE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  removeMediaBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },

  /* ── Location Header & Pickers ──────────────────────── */
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pickerContainer: {
    backgroundColor: '#FAFBFD',
    borderWidth: 1.2,
    borderColor: '#D1D5DB',
    borderRadius: 14,
    marginBottom: 12,
    overflow: 'hidden',
    paddingTop: 8,
  },
  pickerElement: { height: Platform.OS === 'ios' ? 150 : 50, width: '100%' },

  /* ── Map Preview ────────────────────────────────────── */
  mapPreview: {
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  map: { flex: 1 },
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapOverlayText: {
    backgroundColor: 'rgba(43, 93, 174, 0.9)',
    color: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 22,
    fontSize: 13,
    fontWeight: 'bold',
    overflow: 'hidden',
  },
  confirmedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  confirmedBadgeText: { fontSize: 12.5, color: '#059669', fontWeight: '700' },

  /* ── Modern Footer ──────────────────────────────────── */
  modernFooter: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderRadius: 24,
    padding: 16,
    elevation: 20,
    shadowColor: '#1E3A5F',
    shadowOpacity: 0.15,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -6 },
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modernButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modernNextBtn: {
    backgroundColor: '#2B5DAE',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 14,
    gap: 8,
    minWidth: 145,
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#2B5DAE',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  modernNextBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
  modernBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: '#F0F2F7',
    gap: 6,
  },
  modernBackBtnText: { color: '#4B5563', fontWeight: 'bold', fontSize: 14 },
  publishBtnActive: {
    backgroundColor: '#047857',
    shadowColor: '#047857',
  },
  disabledButton: { opacity: 0.65 },

  /* ── Step Indicator ─────────────────────────────────── */
  stepIndicatorContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginBottom: 14,
    gap: 0,
  },
  stepItemWrapper: {
    alignItems: 'center',
    gap: 4,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  stepCircleActive: {
    backgroundColor: '#2B5DAE',
    borderColor: '#2B5DAE',
  },
  stepCircleCompleted: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  stepLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
  },
  stepLabelActive: {
    color: '#2B5DAE',
    fontWeight: '700',
  },
  stepCircleText: { fontSize: 10, color: '#64748B', fontWeight: 'bold' },
  stepCircleTextActive: { color: '#FFF' },
  stepLine: {
    width: 28,
    height: 2.5,
    backgroundColor: '#E2E8F0',
    marginTop: 13,
    borderRadius: 2,
  },
  stepLineActive: { backgroundColor: '#059669' },

  /* ── Fullscreen Map ─────────────────────────────────── */
  mapFooter: { position: 'absolute', bottom: 30, left: 20, right: 20, gap: 12 },
  confirmBtnFull: {
    backgroundColor: '#2B5DAE',
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#2B5DAE',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  confirmBtnTextFull: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  mapHeader: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  mapTypeSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 3,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  typeBtnMini: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 10 },
  typeBtnActive: { backgroundColor: '#2B5DAE' },
  locateBtn: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },

  /* ── Preview Modal ──────────────────────────────────── */
  previewOverlay: {
    flex: 1,
    backgroundColor: '#000',
  },
  previewCloseBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 24,
    right: 16,
    zIndex: 20,
  },
  previewContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullPreviewImage: {
    width: '100%',
    height: '100%',
  },
  fullPreviewVideoContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  fullPreviewVideo: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
}); -->

