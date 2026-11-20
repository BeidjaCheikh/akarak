import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Modal,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';

import {
  getPublicProducts,
  getProductByCodeUuid,
  PublicProductItem,
} from '@/src/api/product/service';

const { width, height } = Dimensions.get('window');

const PRICE_MARKER_WIDTH = 150;
const PRICE_MARKER_HEIGHT = 48;
const CALLOUT_WIDTH = Math.min(width * 0.78, width - 28);

const SERVER_URL = 'https://www.akkaarak.com';

const APP_PRIMARY = '#4A9F35';
const APP_PRIMARY_DARK = '#2F6B24';
const APP_PRIMARY_MEDIUM = '#63B84A';
const APP_PRIMARY_LIGHT = '#EAF7E6';
const APP_BACKGROUND = '#F6FAF5';
const APP_TEXT = '#172033';
const APP_MUTED = '#64748B';
const APP_BORDER = '#CFE8C7';

type MapProperty = {
  codeUuid: string;
  title: string;
  price: number;
  status: string;
  state: string;
  categoryName: string;
  cityName: string;
  zoneName: string;
  latitude: number;
  longitude: number;
  image: string | null;
};

type CityOption = {
  name: string;
  latitude: number;
  longitude: number;
  count: number;
};

type ZoneOption = {
  cityName: string;
  name: string;
  latitude: number;
  longitude: number;
  count: number;
};

type TransactionFilterKey = 'ALL' | 'VENDRE' | 'ALLOUER';
type DisplayMapMode = 'standard' | 'hybrid';

const DEFAULT_REGION = {
  latitude: 18.0858,
  longitude: -15.9785,
  latitudeDelta: 0.12,
  longitudeDelta: 0.12,
};

const TRANSACTION_FILTERS: { key: TransactionFilterKey; label: string }[] = [
  { key: 'ALL', label: 'الكل' },
  { key: 'VENDRE', label: 'للبيع' },
  { key: 'ALLOUER', label: 'للإيجار' },
];

const MAP_MODES: { key: DisplayMapMode; label: string }[] = [
  { key: 'standard', label: 'خريطة' },
  { key: 'hybrid', label: 'قمر' },
];

const getMediaUri = (path?: string | null) => {
  if (!path) return null;

  const cleanPath = path.trim().replace(/\\/g, '/');

  if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) {
    return encodeURI(cleanPath);
  }

  if (cleanPath.startsWith('/uploads/')) {
    return encodeURI(`${SERVER_URL}${cleanPath}`);
  }

  if (cleanPath.startsWith('uploads/')) {
    return encodeURI(`${SERVER_URL}/${cleanPath}`);
  }

  if (cleanPath.startsWith('/')) {
    return encodeURI(`${SERVER_URL}/uploads${cleanPath}`);
  }

  return encodeURI(`${SERVER_URL}/uploads/${cleanPath}`);
};

const formatPrice = (price: number) => {
  const numeric = Number(price || 0);
  const safePrice = Number.isFinite(numeric) ? Math.round(numeric) : 0;
  const formatted = String(safePrice).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  return `${formatted} MRU`;
};

const normalizeTransactionType = (
  item: Pick<MapProperty, 'status' | 'state'>
): TransactionFilterKey => {
  const raw = `${item.status || ''} ${item.state || ''}`.toUpperCase();

  if (raw.includes('VENDRE') || raw.includes('SELL') || raw.includes('VENTE')) {
    return 'VENDRE';
  }

  if (
    raw.includes('ALLOUER') ||
    raw.includes('LOUER') ||
    raw.includes('RENT') ||
    raw.includes('LOCATION')
  ) {
    return 'ALLOUER';
  }

  return 'ALL';
};

export default function MapSearchScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const overlayUpdateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastOverlayUpdate = useRef(0);
  const [mapReady, setMapReady] = useState(false);
  const [markerPoints, setMarkerPoints] = useState<
    Record<string, { x: number; y: number }>
  >({});

  const [properties, setProperties] = useState<MapProperty[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(
    null
  );

  const [mapMode, setMapMode] = useState<DisplayMapMode>('standard');
  const [activeCategory, setActiveCategory] = useState<string>('الكل');
  const [activeTransaction, setActiveTransaction] =
    useState<TransactionFilterKey>('ALL');
  const [activeCity, setActiveCity] = useState<string>('ALL');
  const [activeZone, setActiveZone] = useState<string>('ALL');

  const [isModalVisible, setModalVisible] = useState(false);
  const [locationModalStep, setLocationModalStep] = useState<'city' | 'zone'>(
    'city'
  );
  const [selectedModalCity, setSelectedModalCity] =
    useState<CityOption | null>(null);
  const [currentZoneLabel, setCurrentZoneLabel] =
    useState<string>('كل المدن والمناطق');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRealProperties = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const pageSize = 50;
      let pageToLoad = 0;
      let totalPages = 1;
      let summaries: PublicProductItem[] = [];

      do {
        const response = await getPublicProducts(pageToLoad, pageSize);
        summaries = [...summaries, ...(response.content || [])];
        totalPages = response.totalPages || 1;
        pageToLoad += 1;

        if (response.last) break;
      } while (pageToLoad < totalPages);

      // Map must show only public/published listings.
      // The public endpoint should already return published products,
      // but this extra filter protects the UI if the backend changes.
      const publishedSummaries = summaries.filter(
        (item) => !item.state || item.state === 'PUBLISHED'
      );

      const uniqueSummaries = Array.from(
        new Map(publishedSummaries.map((item) => [item.codeUuid, item])).values()
      );

      const detailedProducts = await Promise.all(
        uniqueSummaries.map(async (item) => {
          try {
            const details = await getProductByCodeUuid(item.codeUuid);

            if (details.state && details.state !== 'PUBLISHED') {
              return null;
            }

            const latitude = Number(details.latitude);
            const longitude = Number(details.longitude);

            if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
              return null;
            }

            return {
              codeUuid: details.codeUuid || item.codeUuid,
              title: details.title || item.title,
              price: Number(details.price ?? item.price ?? 0),
              status: details.status || item.status,
              state: details.state || item.state,
              categoryName:
                details.categoryName || item.categoryName || 'غير محدد',
              cityName: details.cityName || item.cityName || 'غير محدد',
              zoneName: details.zoneName || item.zoneName || 'غير محدد',
              latitude,
              longitude,
              image: getMediaUri(details.images?.[0] || item.images?.[0]),
            } satisfies MapProperty;
          } catch (e: any) {
            console.log('MAP PRODUCT DETAILS ERROR:', item.codeUuid, {
              message: e?.message,
              status: e?.response?.status,
              data: e?.response?.data,
            });
            return null;
          }
        })
      );

      const validProducts = detailedProducts.filter(Boolean) as MapProperty[];

      setProperties(validProducts);
      setActiveCategory('الكل');
      setActiveTransaction('ALL');
      setActiveCity('ALL');
      setActiveZone('ALL');
      setCurrentZoneLabel('كل المدن والمناطق');

      if (validProducts.length > 0) {
        setTimeout(() => {
          mapRef.current?.animateToRegion(
            {
              latitude: validProducts[0].latitude,
              longitude: validProducts[0].longitude,
              latitudeDelta: 0.08,
              longitudeDelta: 0.08,
            },
            900
          );
        }, 400);
      }
    } catch (e: any) {
      console.log('MAP PRODUCTS ERROR:', {
        message: e?.message,
        status: e?.response?.status,
        data: e?.response?.data,
      });
      setError('تعذر تحميل العقارات على الخريطة');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRealProperties();
  }, [fetchRealProperties]);

  const categories = useMemo(() => {
    const names = properties.map((item) => item.categoryName).filter(Boolean);
    return ['الكل', ...Array.from(new Set(names))];
  }, [properties]);

  const cities = useMemo(() => {
    const cityMap = new Map<string, CityOption>();

    properties.forEach((item) => {
      const cityName = item.cityName || 'غير محدد';

      if (!cityMap.has(cityName)) {
        cityMap.set(cityName, {
          name: cityName,
          latitude: item.latitude,
          longitude: item.longitude,
          count: 1,
        });
      } else {
        const old = cityMap.get(cityName)!;
        cityMap.set(cityName, {
          ...old,
          count: old.count + 1,
        });
      }
    });

    return Array.from(cityMap.values());
  }, [properties]);

  const zones = useMemo(() => {
    const zoneMap = new Map<string, ZoneOption>();

    properties.forEach((item) => {
      const cityName = item.cityName || 'غير محدد';
      const zoneName = item.zoneName || 'غير محدد';
      const key = `${cityName}__${zoneName}`;

      if (!zoneMap.has(key)) {
        zoneMap.set(key, {
          cityName,
          name: zoneName,
          latitude: item.latitude,
          longitude: item.longitude,
          count: 1,
        });
      } else {
        const old = zoneMap.get(key)!;
        zoneMap.set(key, {
          ...old,
          count: old.count + 1,
        });
      }
    });

    return Array.from(zoneMap.values());
  }, [properties]);

  const filteredProperties = useMemo(() => {
    return properties.filter((item) => {
      const matchCategory =
        activeCategory === 'الكل' || item.categoryName === activeCategory;

      const matchTransaction =
        activeTransaction === 'ALL' ||
        normalizeTransactionType(item) === activeTransaction;

      const matchCity = activeCity === 'ALL' || item.cityName === activeCity;

      const matchZone =
        activeZone === 'ALL' ||
        (item.cityName === activeCity && item.zoneName === activeZone);

      return matchCategory && matchTransaction && matchCity && matchZone;
    });
  }, [
    properties,
    activeCategory,
    activeTransaction,
    activeCity,
    activeZone,
  ]);

  const selectedProperty = useMemo(() => {
    if (!selectedPropertyId) return null;

    return (
      filteredProperties.find((item) => item.codeUuid === selectedPropertyId) ||
      null
    );
  }, [filteredProperties, selectedPropertyId]);

  const updateOverlayPositions = useCallback(async () => {
    const map = mapRef.current as any;

    if (!map || filteredProperties.length === 0) {
      setMarkerPoints({});
      return;
    }

    try {
      const results = await Promise.all(
        filteredProperties.map(async (property) => {
          try {
            const point = await map.pointForCoordinate({
              latitude: property.latitude,
              longitude: property.longitude,
            });

            if (
              !point ||
              !Number.isFinite(point.x) ||
              !Number.isFinite(point.y)
            ) {
              return null;
            }

            return [property.codeUuid, point] as const;
          } catch {
            return null;
          }
        })
      );

      const nextPoints: Record<string, { x: number; y: number }> = {};

      results.forEach((result) => {
        if (result) {
          const [codeUuid, point] = result;
          nextPoints[codeUuid] = point;
        }
      });

      setMarkerPoints(nextPoints);
    } catch (e) {
      console.log('MAP OVERLAY POINTS ERROR:', e);
    }
  }, [filteredProperties]);

  const scheduleOverlayPositionUpdate = useCallback(
    (delay = 60) => {
      if (overlayUpdateTimer.current) {
        clearTimeout(overlayUpdateTimer.current);
      }

      overlayUpdateTimer.current = setTimeout(() => {
        updateOverlayPositions();
      }, delay);
    },
    [updateOverlayPositions]
  );

  const updateOverlayPositionsWhileMoving = useCallback(() => {
    const now = Date.now();

    // Important for Android APK:
    // update markers while the map is moving, but not on every single frame.
    if (now - lastOverlayUpdate.current < 45) return;

    lastOverlayUpdate.current = now;
    updateOverlayPositions();
  }, [updateOverlayPositions]);

  useEffect(() => {
    return () => {
      if (overlayUpdateTimer.current) {
        clearTimeout(overlayUpdateTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!mapReady) return;

    scheduleOverlayPositionUpdate();
  }, [
    mapReady,
    filteredProperties.length,
    mapMode,
    activeCategory,
    activeTransaction,
    activeCity,
    activeZone,
    scheduleOverlayPositionUpdate,
  ]);

  useEffect(() => {
    if (
      selectedPropertyId &&
      !filteredProperties.some((item) => item.codeUuid === selectedPropertyId)
    ) {
      setSelectedPropertyId(null);
    }
  }, [filteredProperties, selectedPropertyId]);

  const getCalloutPositionStyle = (point?: { x: number; y: number }) => {
    if (!point) {
      return { left: 14, top: height * 0.38, width: CALLOUT_WIDTH };
    }

    const left = Math.max(
      14,
      Math.min(point.x - CALLOUT_WIDTH / 2, width - CALLOUT_WIDTH - 14)
    );

    const preferredTop = point.y - 170;
    const top =
      preferredTop > 160
        ? preferredTop
        : Math.min(point.y + 20, height - 180);

    return {
      left,
      top,
      width: CALLOUT_WIDTH,
    };
  };

  const goToDetails = (codeUuid: string) => {
    router.push({
      pathname: '/product/[id]' as any,
      params: {
        id: codeUuid,
        source: 'public',
      },
    });
  };

  const openLocationModal = () => {
    setLocationModalStep('city');
    setSelectedModalCity(null);
    setModalVisible(true);
  };

  const closeLocationModal = () => {
    setModalVisible(false);
    setLocationModalStep('city');
    setSelectedModalCity(null);
  };

  const goToAllLocations = () => {
    closeLocationModal();
    setActiveCity('ALL');
    setActiveZone('ALL');
    setCurrentZoneLabel('كل المدن والمناطق');
    setSelectedPropertyId(null);

    if (properties.length > 0) {
      mapRef.current?.animateToRegion(
        {
          latitude: properties[0].latitude,
          longitude: properties[0].longitude,
          latitudeDelta: 0.12,
          longitudeDelta: 0.12,
        },
        900
      );
    } else {
      mapRef.current?.animateToRegion(DEFAULT_REGION, 900);
    }
  };

  const showZonesOfCity = (city: CityOption) => {
    setSelectedModalCity(city);
    setLocationModalStep('zone');
  };

  const chooseWholeCity = (city: CityOption) => {
    closeLocationModal();
    setActiveCity(city.name);
    setActiveZone('ALL');
    setCurrentZoneLabel(`${city.name} - كل المناطق`);
    setSelectedPropertyId(null);

    mapRef.current?.animateToRegion(
      {
        latitude: city.latitude,
        longitude: city.longitude,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      },
      900
    );
  };

  const goToZone = (zone: ZoneOption) => {
    closeLocationModal();
    setActiveCity(zone.cityName);
    setActiveZone(zone.name);
    setCurrentZoneLabel(`${zone.cityName} - ${zone.name}`);
    setSelectedPropertyId(null);

    mapRef.current?.animateToRegion(
      {
        latitude: zone.latitude,
        longitude: zone.longitude,
        latitudeDelta: 0.035,
        longitudeDelta: 0.035,
      },
      900
    );
  };

  const centerMap = () => {
    const target = filteredProperties[0] || properties[0];

    if (target) {
      mapRef.current?.animateToRegion(
        {
          latitude: target.latitude,
          longitude: target.longitude,
          latitudeDelta: 0.08,
          longitudeDelta: 0.08,
        },
        700
      );
    } else {
      mapRef.current?.animateToRegion(DEFAULT_REGION, 700);
    }
  };

  const renderUnderlinedTab = (
    label: string,
    active: boolean,
    onPress: () => void
  ) => (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={styles.underlineTab}
    >
      <Text
        style={[styles.underlineTabText, active && styles.underlineTabTextActive]}
        numberOfLines={1}
      >
        {label}
      </Text>
      <View
        style={[
          styles.underlineIndicator,
          active && styles.underlineIndicatorActive,
        ]}
      />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={APP_PRIMARY} />
        <Text style={styles.loadingText}>
          جاري تحميل العقارات على الخريطة...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ headerShown: false }} />

        <TouchableOpacity
          style={styles.errorBackBtn}
          onPress={() => router.back()}
          activeOpacity={0.85}
        >
          <Ionicons name="chevron-forward" size={30} color={APP_PRIMARY} />
        </TouchableOpacity>

        <Ionicons name="map-outline" size={62} color="#CBD5E1" />
        <Text style={styles.errorTitle}>حدث خطأ</Text>
        <Text style={styles.errorText}>{error}</Text>

        <TouchableOpacity style={styles.retryBtn} onPress={fetchRealProperties}>
          <Ionicons name="refresh" size={17} color="#FFF" />
          <Text style={styles.retryText}>إعادة المحاولة</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFillObject}
        initialRegion={DEFAULT_REGION}
        mapType={mapMode}
        onMapReady={() => {
          setMapReady(true);
          setTimeout(updateOverlayPositions, 500);
        }}
        onRegionChange={updateOverlayPositionsWhileMoving}
        onRegionChangeComplete={() => {
          scheduleOverlayPositionUpdate(0);
        }}
        onPress={() => setSelectedPropertyId(null)}
      />

      <View style={styles.markerOverlayLayer} pointerEvents="box-none">
        {filteredProperties.map((property) => {
          const point = markerPoints[property.codeUuid];

          if (!point) return null;

          const isSelected = selectedPropertyId === property.codeUuid;

          return (
            <TouchableOpacity
              key={`price-marker-${property.codeUuid}`}
              activeOpacity={0.88}
              style={[
                styles.overlayPriceMarker,
                {
                  left: point.x - PRICE_MARKER_WIDTH / 2,
                  top: point.y - PRICE_MARKER_HEIGHT,
                },
              ]}
              onPress={() => setSelectedPropertyId(property.codeUuid)}
            >
              <View
                style={[
                  styles.markerBubble,
                  isSelected && styles.markerBubbleSelected,
                ]}
              >
                <Text
                  style={styles.markerText}
                  numberOfLines={1}
                  ellipsizeMode="clip"
                  allowFontScaling={false}
                >
                  {formatPrice(property.price)}
                </Text>
              </View>

              <View
                style={[
                  styles.markerArrow,
                  isSelected && styles.markerArrowSelected,
                ]}
              />
            </TouchableOpacity>
          );
        })}
      </View>

      {selectedProperty && markerPoints[selectedProperty.codeUuid] && (
        <View style={styles.calloutOverlayLayer} pointerEvents="box-none">
          <TouchableOpacity
            activeOpacity={0.92}
            onPress={() => goToDetails(selectedProperty.codeUuid)}
            style={[
              styles.overlayCalloutWrapper,
              getCalloutPositionStyle(markerPoints[selectedProperty.codeUuid]),
            ]}
          >
            <View style={styles.squareCard}>
              {selectedProperty.image ? (
                <Image
                  source={{ uri: selectedProperty.image }}
                  style={styles.cardImage}
                />
              ) : (
                <View style={styles.cardImagePlaceholder}>
                  <Ionicons name="image-outline" size={32} color="#94A3B8" />
                </View>
              )}

              <View style={styles.cardContent}>
                <View>
                  <Text style={styles.cardPrice}>
                    {formatPrice(selectedProperty.price)}
                  </Text>

                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {selectedProperty.title}
                  </Text>

                  <View style={styles.zoneRow}>
                    <Ionicons
                      name="location-outline"
                      size={13}
                      color="#64748B"
                    />
                    <Text style={styles.zoneText} numberOfLines={1}>
                      {selectedProperty.zoneName}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardFooter}>
                  <View style={styles.typeBadge}>
                    <Text style={styles.typeText} numberOfLines={1}>
                      {selectedProperty.categoryName}
                    </Text>
                  </View>

                  <View style={styles.detailsBtn}>
                    <Ionicons name="arrow-back" size={12} color={APP_PRIMARY} />
                    <Text style={styles.detailsBtnText}>التفاصيل</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.calloutTriangle} />
          </TouchableOpacity>
        </View>
      )}



      <SafeAreaView
        style={styles.topOverlay}
        edges={['top']}
        pointerEvents="box-none"
      >
        <View style={styles.topHeaderRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.85}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="chevron-forward" size={31} color={APP_PRIMARY} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.locationBtn}
            onPress={openLocationModal}
            activeOpacity={0.85}
          >
            <Ionicons name="location" size={19} color={APP_PRIMARY} />
            <Text style={styles.locationBtnText} numberOfLines={1}>
              {currentZoneLabel}
            </Text>
            <Ionicons name="chevron-down" size={16} color={APP_MUTED} />
          </TouchableOpacity>
        </View>

        <View style={styles.topPanelsRow}>
          <View style={[styles.rectPanel, styles.mapModePanel]}>
            {MAP_MODES.map((mode) => (
              <View key={mode.key} style={styles.panelTabSlot}>
                {renderUnderlinedTab(
                  mode.label,
                  mapMode === mode.key,
                  () => setMapMode(mode.key)
                )}
              </View>
            ))}
          </View>

          <View style={[styles.rectPanel, styles.transactionPanel]}>
            {TRANSACTION_FILTERS.map((filter) => (
              <View key={filter.key} style={styles.panelTabSlot}>
                {renderUnderlinedTab(
                  filter.label,
                  activeTransaction === filter.key,
                  () => setActiveTransaction(filter.key)
                )}
              </View>
            ))}
          </View>
        </View>

        <View style={styles.categoriesPanel}>
          <View style={styles.categoriesGrid}>
            {categories.map((category, index) => {
              const active = activeCategory === category;

              return (
                <TouchableOpacity
                  key={`cat-${category}-${index}`}
                  style={[
                    styles.categoryChip,
                    active && styles.categoryChipActive,
                  ]}
                  onPress={() => setActiveCategory(category)}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      active && styles.categoryChipTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {category}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.countBox}>
          <Text style={styles.countText}>
            {filteredProperties.length} عقار على الخريطة
          </Text>
        </View>
      </SafeAreaView>

      {properties.length === 0 && (
        <View style={styles.emptyOverlay}>
          <Ionicons name="location-outline" size={54} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>لا توجد عقارات بموقع جغرافي</Text>
          <Text style={styles.emptyText}>
            تأكد أن العقارات تحتوي على latitude و longitude
          </Text>
        </View>
      )}

      <Modal visible={isModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={closeLocationModal}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={23} color={APP_TEXT} />
              </TouchableOpacity>

              <Text style={styles.modalTitle}>
                {locationModalStep === 'city'
                  ? 'اختر المدينة'
                  : `اختر المنطقة - ${selectedModalCity?.name || ''}`}
              </Text>

              {locationModalStep === 'zone' ? (
                <TouchableOpacity
                  style={styles.modalBackBtn}
                  activeOpacity={0.85}
                  onPress={() => {
                    setLocationModalStep('city');
                    setSelectedModalCity(null);
                  }}
                >
                  <Ionicons name="chevron-forward" size={21} color={APP_PRIMARY} />
                </TouchableOpacity>
              ) : (
                <View style={styles.modalBackPlaceholder} />
              )}
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {locationModalStep === 'city' ? (
                <>
                  <TouchableOpacity
                    style={[
                      styles.modalListItem,
                      activeCity === 'ALL' &&
                        activeZone === 'ALL' &&
                        styles.modalListItemActive,
                    ]}
                    onPress={goToAllLocations}
                  >
                    <Ionicons
                      name={
                        activeCity === 'ALL' && activeZone === 'ALL'
                          ? 'checkmark-circle'
                          : 'ellipse-outline'
                      }
                      size={21}
                      color={
                        activeCity === 'ALL' && activeZone === 'ALL'
                          ? APP_PRIMARY
                          : '#CBD5E1'
                      }
                    />

                    <View style={styles.modalItemTextBox}>
                      <Text style={styles.modalListText}>كل المدن والمناطق</Text>
                      <Text style={styles.modalListSubText}>
                        {properties.length} عقار
                      </Text>
                    </View>

                    <Ionicons name="map-outline" size={20} color={APP_PRIMARY} />
                  </TouchableOpacity>

                  {cities.map((city) => {
                    const cityActive =
                      activeCity === city.name && activeZone === 'ALL';
                    const cityZones = zones.filter(
                      (zone) => zone.cityName === city.name
                    );

                    return (
                      <TouchableOpacity
                        key={`city-${city.name}`}
                        style={[
                          styles.modalListItem,
                          cityActive && styles.modalListItemActive,
                        ]}
                        onPress={() => showZonesOfCity(city)}
                        activeOpacity={0.85}
                      >
                        <Ionicons
                          name={cityActive ? 'checkmark-circle' : 'ellipse-outline'}
                          size={21}
                          color={cityActive ? APP_PRIMARY : '#CBD5E1'}
                        />

                        <View style={styles.modalItemTextBox}>
                          <Text style={styles.modalListText}>{city.name}</Text>
                          <Text style={styles.modalListSubText}>
                            {city.count} عقار - {cityZones.length} منطقة
                          </Text>
                        </View>

                        <Ionicons
                          name="chevron-back"
                          size={21}
                          color={APP_PRIMARY}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </>
              ) : (
                <>
                  {selectedModalCity && (
                    <TouchableOpacity
                      style={[
                        styles.modalListItem,
                        activeCity === selectedModalCity.name &&
                          activeZone === 'ALL' &&
                          styles.modalListItemActive,
                      ]}
                      onPress={() => chooseWholeCity(selectedModalCity)}
                      activeOpacity={0.85}
                    >
                      <Ionicons
                        name={
                          activeCity === selectedModalCity.name &&
                          activeZone === 'ALL'
                            ? 'checkmark-circle'
                            : 'ellipse-outline'
                        }
                        size={21}
                        color={
                          activeCity === selectedModalCity.name &&
                          activeZone === 'ALL'
                            ? APP_PRIMARY
                            : '#CBD5E1'
                        }
                      />

                      <View style={styles.modalItemTextBox}>
                        <Text style={styles.modalListText}>
                          كل مناطق {selectedModalCity.name}
                        </Text>
                        <Text style={styles.modalListSubText}>
                          {selectedModalCity.count} عقار
                        </Text>
                      </View>

                      <Ionicons
                        name="business-outline"
                        size={20}
                        color={APP_PRIMARY}
                      />
                    </TouchableOpacity>
                  )}

                  {zones
                    .filter((zone) => zone.cityName === selectedModalCity?.name)
                    .map((zone) => {
                      const zoneActive =
                        activeCity === zone.cityName && activeZone === zone.name;

                      return (
                        <TouchableOpacity
                          key={`${zone.cityName}-${zone.name}`}
                          style={[
                            styles.modalListItem,
                            styles.zoneListItem,
                            zoneActive && styles.modalListItemActive,
                          ]}
                          onPress={() => goToZone(zone)}
                          activeOpacity={0.85}
                        >
                          <Ionicons
                            name={zoneActive ? 'checkmark-circle' : 'ellipse-outline'}
                            size={20}
                            color={zoneActive ? APP_PRIMARY : '#CBD5E1'}
                          />

                          <View style={styles.modalItemTextBox}>
                            <Text style={styles.modalListText}>{zone.name}</Text>
                            <Text style={styles.modalListSubText}>
                              {zone.count} عقار
                            </Text>
                          </View>

                          <Ionicons
                            name="location-outline"
                            size={19}
                            color={APP_PRIMARY}
                          />
                        </TouchableOpacity>
                      );
                    })}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const shadow = {
  elevation: 6,
  shadowColor: '#2F6B24',
  shadowOpacity: 0.12,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 4 },
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
    direction: 'ltr',
  },

  centered: {
    flex: 1,
    backgroundColor: APP_BACKGROUND,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
    direction: 'rtl',
  },

  loadingText: {
    color: APP_MUTED,
    fontWeight: '800',
    fontSize: 13,
    textAlign: 'center',
    writingDirection: 'rtl',
  },

  errorBackBtn: {
    position: 'absolute',
    top: 48,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },

  errorTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: APP_TEXT,
    textAlign: 'center',
    writingDirection: 'rtl',
  },

  errorText: {
    color: APP_MUTED,
    fontSize: 13,
    textAlign: 'center',
    writingDirection: 'rtl',
  },

  retryBtn: {
    marginTop: 8,
    backgroundColor: APP_PRIMARY,
    flexDirection: 'row-reverse',
    direction: 'ltr',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },

  retryText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'right',
    writingDirection: 'rtl',
  },

  topOverlay: {
    position: 'absolute',
    top: 0,
    width: '100%',
    zIndex: 100,
    paddingHorizontal: 14,
  },

  topHeaderRow: {
    width: '100%',
    flexDirection: 'row-reverse',
    direction: 'ltr',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },

  backBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.97)',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },

  locationBtn: {
    minWidth: 130,
    maxWidth: width * 0.42,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.97)',
    paddingHorizontal: 12,
    flexDirection: 'row-reverse',
    direction: 'ltr',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },

  locationBtnText: {
    marginHorizontal: 7,
    flexShrink: 1,
    fontWeight: '900',
    color: APP_TEXT,
    fontSize: 15,
    textAlign: 'right',
    writingDirection: 'rtl',
  },

  topPanelsRow: {
    marginTop: 12,
    width: '100%',
    flexDirection: 'row-reverse',
    direction: 'ltr',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    gap: 10,
  },

  rectPanel: {
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: APP_BORDER,
    paddingHorizontal: 8,
    paddingVertical: 6,
    minHeight: 56,
    ...shadow,
  },

  mapModePanel: {
    width: width * 0.27,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  transactionPanel: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  underlineTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 42,
  },

  underlineTabText: {
    color: APP_MUTED,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '900',
    textAlign: 'center',
    writingDirection: 'rtl',
    includeFontPadding: false,
  },

  underlineTabTextActive: {
    color: APP_PRIMARY,
  },

  underlineIndicator: {
    marginTop: 7,
    width: '72%',
    height: 2.5,
    borderRadius: 999,
    backgroundColor: 'transparent',
  },

  underlineIndicatorActive: {
    backgroundColor: APP_PRIMARY,
  },

  categoriesPanel: {
    marginTop: 10,
    backgroundColor: 'transparent',
  },

  panelTabSlot: {
    flex: 1,
  },

  categoriesGrid: {
    width: '100%',
    flexDirection: 'row-reverse',
    direction: 'ltr',
    justifyContent: 'flex-start',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 2,
  },

  categoryChip: {
    minHeight: 40,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: APP_BORDER,
    paddingHorizontal: 14,
    justifyContent: 'center',
    ...shadow,
  },

  categoryChipActive: {
    borderColor: APP_PRIMARY,
    backgroundColor: '#FFFFFF',
  },

  categoryChipText: {
    fontSize: 13,
    fontWeight: '900',
    color: APP_MUTED,
    textAlign: 'center',
    writingDirection: 'rtl',
  },

  categoryChipTextActive: {
    color: APP_PRIMARY,
  },

  countBox: {
    alignSelf: 'center',
    marginTop: 10,
    backgroundColor: 'rgba(255,255,255,0.97)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: APP_BORDER,
    ...shadow,
  },

  countText: {
    color: APP_TEXT,
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
    writingDirection: 'rtl',
  },

  markerOverlayLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
  },

  overlayPriceMarker: {
    position: 'absolute',
    width: PRICE_MARKER_WIDTH,
    height: PRICE_MARKER_HEIGHT,
    alignItems: 'center',
    justifyContent: 'flex-start',
    overflow: 'visible',
    backgroundColor: 'transparent',
  },

  markerBubble: {
    width: PRICE_MARKER_WIDTH,
    height: 38,
    backgroundColor: APP_PRIMARY,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    overflow: 'visible',
    elevation: 7,
    shadowColor: APP_PRIMARY_DARK,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },

  markerBubbleSelected: {
    backgroundColor: APP_PRIMARY_DARK,
    borderWidth: 1.4,
    borderColor: '#FFFFFF',
  },

  markerText: {
    width: PRICE_MARKER_WIDTH - 14,
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
    writingDirection: 'ltr',
    includeFontPadding: false,
  },

  markerArrow: {
    width: 0,
    height: 0,
    alignSelf: 'center',
    marginTop: -1,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: APP_PRIMARY,
  },

  markerArrowSelected: {
    borderTopColor: APP_PRIMARY_DARK,
  },

  calloutOverlayLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 35,
  },

  overlayCalloutWrapper: {
    position: 'absolute',
    alignItems: 'center',
  },

  calloutWrapper: {
    width: width * 0.78,
    alignItems: 'center',
    marginBottom: -5,
  },

  squareCard: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    flexDirection: 'row-reverse',
    direction: 'ltr',
    width: '100%',
    minHeight: 120,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },

  cardImage: {
    width: 112,
    height: 120,
  },

  cardImagePlaceholder: {
    width: 112,
    height: 120,
    backgroundColor: '#EEF2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },

  cardContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
    direction: 'rtl',
  },

  cardPrice: {
    color: APP_PRIMARY,
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 3,
    textAlign: 'right',
    writingDirection: 'ltr',
  },

  cardTitle: {
    fontSize: 12,
    color: APP_TEXT,
    fontWeight: '800',
    marginBottom: 6,
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 18,
  },

  zoneRow: {
    flexDirection: 'row-reverse',
    direction: 'ltr',
    alignItems: 'center',
    gap: 4,
  },

  zoneText: {
    flex: 1,
    color: APP_MUTED,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'right',
    writingDirection: 'rtl',
  },

  cardFooter: {
    flexDirection: 'row',
    direction: 'rtl',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },

  typeBadge: {
    backgroundColor: APP_PRIMARY_LIGHT,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    maxWidth: 88,
  },

  typeText: {
    color: APP_MUTED,
    fontSize: 10,
    fontWeight: '900',
    textAlign: 'center',
    writingDirection: 'rtl',
  },

  detailsBtn: {
    backgroundColor: APP_PRIMARY_LIGHT,
    flexDirection: 'row-reverse',
    direction: 'ltr',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9,
    gap: 4,
  },

  detailsBtnText: {
    color: APP_PRIMARY,
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'right',
    writingDirection: 'rtl',
  },

  calloutTriangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#FFF',
  },

  emptyOverlay: {
    position: 'absolute',
    left: 24,
    right: 24,
    top: '42%',
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 22,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 5,
  },

  emptyTitle: {
    color: APP_TEXT,
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'center',
    writingDirection: 'rtl',
  },

  emptyText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    writingDirection: 'rtl',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },

  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 18,
    maxHeight: '72%',
  },

  modalHeader: {
    flexDirection: 'row',
    direction: 'ltr',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },

  modalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '900',
    color: APP_TEXT,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginRight: 12,
  },

  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: APP_PRIMARY_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: APP_PRIMARY_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalBackPlaceholder: {
    width: 40,
    height: 40,
  },

  modalListItem: {
    flexDirection: 'row-reverse',
    direction: 'ltr',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginBottom: 8,
    backgroundColor: APP_BACKGROUND,
  },

  modalListItemActive: {
    backgroundColor: APP_PRIMARY_LIGHT,
  },

  cityGroup: {
    marginBottom: 4,
  },

  zoneListItem: {
    marginRight: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: APP_BORDER,
  },

  modalItemTextBox: {
    flex: 1,
    alignItems: 'flex-end',
  },

  modalListText: {
    fontSize: 15,
    fontWeight: '900',
    color: APP_TEXT,
    textAlign: 'right',
    writingDirection: 'rtl',
  },

  modalListSubText: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});
