import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Image,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Modal,
  StatusBar,
  Linking,
  Platform,
  Alert,
} from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';

import {
  getProductByCodeUuid,
  ProductDetails,
} from '@/src/api/product/service';

const SERVER_URL = 'https://www.akkaarak.com';
const SCREEN_WIDTH = Dimensions.get('window').width;
const HERO_HEIGHT = 315;

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

const STATE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  PENDING: { label: 'قيد المراجعة', color: '#D97706', bg: '#FEF3C7' },
  PUBLISHED: { label: 'منشور', color: '#059669', bg: '#D1FAE5' },
  ACTIVE: { label: 'نشط', color: '#059669', bg: '#D1FAE5' },
  REJECTED: { label: 'مرفوض', color: '#DC2626', bg: '#FEE2E2' },
  EXPIRED: { label: 'منتهي', color: '#6B7280', bg: '#F3F4F6' },
};

const STATUS_LABEL: Record<string, string> = {
  VENDRE: 'للبيع',
  ALLOUER: 'للإيجار',
};

function ProductVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer({ uri }, (player) => {
    player.loop = false;
  });

  return (
    <VideoView
      style={styles.video}
      player={player}
      nativeControls
      allowsFullscreen
    />
  );
}

export default function ProductDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const heroListRef = useRef<FlatList<string>>(null);
  const fullScreenListRef = useRef<FlatList<string>>(null);

  const [product, setProduct] = useState<ProductDetails | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [fullScreenVisible, setFullScreenVisible] = useState(false);
  const [fullScreenIndex, setFullScreenIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const imageUris = (product?.images || [])
    .map((image) => getMediaUri(image))
    .filter(Boolean) as string[];

  const loadProduct = async () => {
    try {
      setLoading(true);
      setError(null);

      const productId = Array.isArray(id) ? id[0] : id;

      if (!productId) {
        setError('معرّف العقار غير موجود');
        return;
      }

      const data = await getProductByCodeUuid(String(productId));

      console.log('PRODUCT DETAILS:', JSON.stringify(data, null, 2));

      setProduct(data);
      setActiveImageIndex(0);
      setFullScreenIndex(0);
    } catch (e: any) {
      console.log('PRODUCT DETAILS ERROR:', {
        message: e?.message,
        status: e?.response?.status,
        data: e?.response?.data,
      });

      setError('تعذر تحميل تفاصيل العقار');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProduct();
  }, [id]);

  const scrollToImage = (index: number) => {
    const total = imageUris.length;
    if (total <= 0) return;

    const safeIndex = (index + total) % total;
    setActiveImageIndex(safeIndex);

    heroListRef.current?.scrollToIndex({
      index: safeIndex,
      animated: true,
    });
  };

  const scrollFullScreenToImage = (index: number) => {
    const total = imageUris.length;
    if (total <= 0) return;

    const safeIndex = (index + total) % total;
    setFullScreenIndex(safeIndex);

    fullScreenListRef.current?.scrollToIndex({
      index: safeIndex,
      animated: true,
    });
  };

  const openFullScreen = (index: number) => {
    setFullScreenIndex(index);
    setFullScreenVisible(true);

    setTimeout(() => {
      fullScreenListRef.current?.scrollToIndex({
        index,
        animated: false,
      });
    }, 150);
  };

  const closeFullScreen = () => {
    setFullScreenVisible(false);
  };

  const openGoogleMaps = async () => {
    if (!product) return;

    const lat = Number(product.latitude);
    const lng = Number(product.longitude);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      Alert.alert('تنبيه', 'إحداثيات الموقع غير صالحة');
      return;
    }

    const googleWebUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;

    const googleAppUrl =
      Platform.OS === 'android'
        ? `google.navigation:q=${lat},${lng}`
        : `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`;

    try {
      const canOpenGoogleApp = await Linking.canOpenURL(googleAppUrl);

      if (canOpenGoogleApp) {
        await Linking.openURL(googleAppUrl);
      } else {
        await Linking.openURL(googleWebUrl);
      }
    } catch {
      await Linking.openURL(googleWebUrl);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <Stack.Screen
          options={{ title: 'تفاصيل العقار', headerShadowVisible: false }}
        />
        <ActivityIndicator size="large" color="#2B5DAE" />
        <Text style={styles.loadingText}>جاري تحميل التفاصيل...</Text>
      </View>
    );
  }

  if (error || !product) {
    return (
      <View style={styles.centered}>
        <Stack.Screen
          options={{ title: 'تفاصيل العقار', headerShadowVisible: false }}
        />

        <View style={styles.errorIconBox}>
          <Ionicons name="alert-circle-outline" size={56} color="#CBD5E1" />
        </View>

        <Text style={styles.errorTitle}>حدث خطأ</Text>
        <Text style={styles.errorText}>{error || 'تعذر تحميل العقار'}</Text>

        <TouchableOpacity style={styles.retryBtn} onPress={loadProduct}>
          <Ionicons name="refresh" size={17} color="#FFF" />
          <Text style={styles.retryText}>إعادة المحاولة</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const stateConf = STATE_CONFIG[product.state] ?? STATE_CONFIG.PENDING;
  const videoUri = getMediaUri(product.video);

  const mapLatitude = Number(product.latitude);
  const mapLongitude = Number(product.longitude);
  const hasValidLocation =
    !Number.isNaN(mapLatitude) && !Number.isNaN(mapLongitude);

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{ title: 'تفاصيل العقار', headerShadowVisible: false }}
      />

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.heroBox}>
          {imageUris.length > 0 ? (
            <FlatList
              ref={heroListRef}
              data={imageUris}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item, index) => `${item}-${index}`}
              getItemLayout={(_, index) => ({
                length: SCREEN_WIDTH,
                offset: SCREEN_WIDTH * index,
                index,
              })}
              onMomentumScrollEnd={(event) => {
                const index = Math.round(
                  event.nativeEvent.contentOffset.x / SCREEN_WIDTH
                );
                setActiveImageIndex(index);
              }}
              onScrollToIndexFailed={(info) => {
                setTimeout(() => {
                  heroListRef.current?.scrollToOffset({
                    offset: info.index * SCREEN_WIDTH,
                    animated: true,
                  });
                }, 250);
              }}
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  activeOpacity={0.95}
                  onPress={() => openFullScreen(index)}
                  style={styles.heroSlide}
                >
                  <Image
                    source={{ uri: item }}
                    style={styles.heroImage}
                    resizeMode="cover"
                    onError={(e) => {
                      console.log(
                        'DETAIL IMAGE ERROR:',
                        item,
                        e.nativeEvent.error
                      );
                    }}
                  />
                </TouchableOpacity>
              )}
            />
          ) : (
            <View style={styles.noImageBox}>
              <Ionicons name="image-outline" size={60} color="#94A3B8" />
              <Text style={styles.noImageText}>لا توجد صورة</Text>
            </View>
          )}

          <View style={styles.heroOverlay} />

          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-forward" size={22} color="#172033" />
          </TouchableOpacity>

          <View style={[styles.stateBadge, { backgroundColor: stateConf.bg }]}>
            <Text style={[styles.stateText, { color: stateConf.color }]}>
              {stateConf.label}
            </Text>
          </View>

          {imageUris.length > 1 && (
            <>
              <TouchableOpacity
                style={[styles.arrowBtn, styles.rightArrow]}
                onPress={() => scrollToImage(activeImageIndex + 1)}
                activeOpacity={0.85}
              >
                <Ionicons name="chevron-forward" size={24} color="#FFF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.arrowBtn, styles.leftArrow]}
                onPress={() => scrollToImage(activeImageIndex - 1)}
                activeOpacity={0.85}
              >
                <Ionicons name="chevron-back" size={24} color="#FFF" />
              </TouchableOpacity>

              <View style={styles.imageCounter}>
                <Text style={styles.imageCounterText}>
                  {activeImageIndex + 1} / {imageUris.length}
                </Text>
              </View>

              <View style={styles.dotsContainer}>
                {imageUris.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.dot,
                      activeImageIndex === index && styles.dotActive,
                    ]}
                  />
                ))}
              </View>
            </>
          )}

          {imageUris.length > 0 && (
            <View style={styles.tapHint}>
              <Ionicons name="expand-outline" size={14} color="#FFF" />
              <Text style={styles.tapHintText}>اضغط لعرض الصورة</Text>
            </View>
          )}
        </View>

        {imageUris.length > 1 && (
          <FlatList
            data={imageUris}
            horizontal
            inverted
            keyExtractor={(item, index) => `${item}-${index}`}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.imagesRow}
            renderItem={({ item, index }) => {
              const isSelected = activeImageIndex === index;

              return (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => scrollToImage(index)}
                  onLongPress={() => openFullScreen(index)}
                  style={[
                    styles.smallImageWrapper,
                    isSelected && styles.smallImageWrapperActive,
                  ]}
                >
                  <Image
                    source={{ uri: item }}
                    style={styles.smallImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              );
            }}
          />
        )}

        <View style={styles.content}>
          <View style={styles.mainCard}>
            <Text style={styles.title}>{product.title}</Text>

            <View style={styles.priceRow}>
              <Text style={styles.price}>
                {Number(product.price || 0).toLocaleString('fr-FR')}
                <Text style={styles.currency}> MRU</Text>
              </Text>

              <View style={styles.statusBadge}>
                <Text style={styles.statusBadgeText}>
                  {STATUS_LABEL[product.status] ?? product.status}
                </Text>
              </View>
            </View>

            <View style={styles.infoGrid}>
              <View style={styles.infoCell}>
                <Text style={styles.infoLabel}>نوع العقار</Text>
                <View style={styles.infoValueRow}>
                  <MaterialCommunityIcons
                    name="home-city-outline"
                    size={17}
                    color="#2B5DAE"
                  />
                  <Text style={styles.infoValue} numberOfLines={1}>
                    {product.categoryName}
                  </Text>
                </View>
              </View>

              <View style={styles.infoCell}>
                <Text style={styles.infoLabel}>المنطقة</Text>
                <View style={styles.infoValueRow}>
                  <Ionicons
                    name="location-outline"
                    size={17}
                    color="#2B5DAE"
                  />
                  <Text style={styles.infoValue} numberOfLines={1}>
                    {product.zoneName}
                  </Text>
                </View>
              </View>

              <View style={styles.infoCell}>
                <Text style={styles.infoLabel}>الرسوم</Text>
                <View style={styles.infoValueRow}>
                  <MaterialCommunityIcons
                    name="cash-multiple"
                    size={17}
                    color="#DC2626"
                  />
                  <Text
                    style={[styles.infoValue, styles.feesValue]}
                    numberOfLines={1}
                  >
                    {Number(product.fees || 0).toLocaleString('fr-FR')} MRU
                  </Text>
                </View>
              </View>

              <View style={styles.infoCell}>
                <Text style={styles.infoLabel}>حالة الإعلان</Text>
                <View style={styles.infoValueRow}>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={17}
                    color="#2B5DAE"
                  />
                  <Text style={styles.infoValue} numberOfLines={1}>
                    {stateConf.label}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons
                name="document-text-outline"
                size={19}
                color="#2B5DAE"
              />
              <Text style={styles.sectionTitle}>الوصف</Text>
            </View>

            <Text style={styles.description}>
              {product.description || 'لا يوجد وصف'}
            </Text>
          </View>

          {product.attributes?.length > 0 && (
            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <Ionicons name="list-outline" size={20} color="#2B5DAE" />
                <Text style={styles.sectionTitle}>الخصائص</Text>
              </View>

              {product.attributes.map((attr, index) => (
                <View
                  key={`${attr.attributeName}-${index}`}
                  style={styles.attributeRow}
                >
                  <Text style={styles.attributeName}>{attr.attributeName}</Text>
                  <Text style={styles.attributeValue}>{String(attr.value)}</Text>
                </View>
              ))}
            </View>
          )}

          {videoUri && (
            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <Ionicons name="videocam-outline" size={20} color="#2B5DAE" />
                <Text style={styles.sectionTitle}>الفيديو</Text>
              </View>

              <ProductVideo uri={videoUri} />
            </View>
          )}

          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="map-outline" size={20} color="#2B5DAE" />
              <Text style={styles.sectionTitle}>الموقع</Text>
            </View>

            {hasValidLocation ? (
              <>
                <View style={styles.locationRow}>
                  <View style={styles.locationItem}>
                    <Ionicons name="locate-outline" size={16} color="#2B5DAE" />
                    <Text style={styles.locationText}>
                      خط العرض: {product.latitude}
                    </Text>
                  </View>

                  <View style={styles.locationItem}>
                    <Ionicons
                      name="navigate-outline"
                      size={16}
                      color="#2B5DAE"
                    />
                    <Text style={styles.locationText}>
                      خط الطول: {product.longitude}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.openMapButton}
                  activeOpacity={0.85}
                  onPress={openGoogleMaps}
                >
                  <Ionicons name="navigate" size={18} color="#FFF" />
                  <Text style={styles.openMapButtonText}>الذهاب إلى الموقع</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.locationUnavailable}>
                <Ionicons
                  name="alert-circle-outline"
                  size={22}
                  color="#94A3B8"
                />
                <Text style={styles.locationUnavailableText}>
                  الموقع غير متوفر لهذا العقار
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={fullScreenVisible}
        animationType="fade"
        transparent={false}
        statusBarTranslucent
        onRequestClose={closeFullScreen}
      >
        <View style={styles.fullScreenContainer}>
          <StatusBar hidden />

          <FlatList
            ref={fullScreenListRef}
            data={imageUris}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item, index) => `full-${item}-${index}`}
            initialScrollIndex={fullScreenIndex}
            getItemLayout={(_, index) => ({
              length: SCREEN_WIDTH,
              offset: SCREEN_WIDTH * index,
              index,
            })}
            onMomentumScrollEnd={(event) => {
              const index = Math.round(
                event.nativeEvent.contentOffset.x / SCREEN_WIDTH
              );
              setFullScreenIndex(index);
            }}
            onScrollToIndexFailed={(info) => {
              setTimeout(() => {
                fullScreenListRef.current?.scrollToOffset({
                  offset: info.index * SCREEN_WIDTH,
                  animated: false,
                });
              }, 250);
            }}
            renderItem={({ item }) => (
              <View style={styles.fullScreenSlide}>
                <Image
                  source={{ uri: item }}
                  style={styles.fullScreenImage}
                  resizeMode="contain"
                />
              </View>
            )}
          />

          <TouchableOpacity
            style={styles.fullCloseBtn}
            onPress={closeFullScreen}
            activeOpacity={0.85}
          >
            <Ionicons name="close" size={28} color="#FFF" />
          </TouchableOpacity>

          {imageUris.length > 1 && (
            <>
              <TouchableOpacity
                style={[styles.fullArrowBtn, styles.fullRightArrow]}
                onPress={() => scrollFullScreenToImage(fullScreenIndex + 1)}
                activeOpacity={0.85}
              >
                <Ionicons name="chevron-forward" size={30} color="#FFF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.fullArrowBtn, styles.fullLeftArrow]}
                onPress={() => scrollFullScreenToImage(fullScreenIndex - 1)}
                activeOpacity={0.85}
              >
                <Ionicons name="chevron-back" size={30} color="#FFF" />
              </TouchableOpacity>

              <View style={styles.fullCounter}>
                <Text style={styles.fullCounterText}>
                  {fullScreenIndex + 1} / {imageUris.length}
                </Text>
              </View>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F5F7FB',
    direction: 'rtl',
  },

  centered: {
    flex: 1,
    backgroundColor: '#F5F7FB',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
    direction: 'rtl',
  },

  loadingText: {
    color: '#94A3B8',
    fontWeight: '700',
    fontSize: 13,
    textAlign: 'center',
    writingDirection: 'rtl',
  },

  errorIconBox: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#EEF2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },

  errorTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#172033',
    textAlign: 'center',
    writingDirection: 'rtl',
  },

  errorText: {
    color: '#64748B',
    textAlign: 'center',
    writingDirection: 'rtl',
    fontSize: 13,
  },

  retryBtn: {
    marginTop: 8,
    backgroundColor: '#2B5DAE',
    flexDirection: 'row-reverse',
    direction: 'ltr',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 15,
  },

  retryText: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 14,
    textAlign: 'right',
    writingDirection: 'rtl',
  },

  heroBox: {
    height: HERO_HEIGHT,
    backgroundColor: '#E2E8F0',
    position: 'relative',
  },

  heroSlide: {
    width: SCREEN_WIDTH,
    height: HERO_HEIGHT,
  },

  heroImage: {
    width: '100%',
    height: '100%',
  },

  heroOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 105,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },

  noImageBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EEF2F7',
  },

  noImageText: {
    color: '#94A3B8',
    fontWeight: '800',
    fontSize: 13,
    textAlign: 'center',
    writingDirection: 'rtl',
  },

  backBtn: {
    position: 'absolute',
    top: 48,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFFEE',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },

  stateBadge: {
    position: 'absolute',
    top: 48,
    left: 16,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 999,
    zIndex: 20,
  },

  stateText: {
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
    writingDirection: 'rtl',
  },

  arrowBtn: {
    position: 'absolute',
    top: '47%',
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },

  rightArrow: {
    right: 14,
  },

  leftArrow: {
    left: 14,
  },

  imageCounter: {
    position: 'absolute',
    top: 102,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.42)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    zIndex: 20,
  },

  imageCounterText: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 12,
    textAlign: 'center',
    writingDirection: 'ltr',
  },

  dotsContainer: {
    position: 'absolute',
    bottom: 22,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 7,
    zIndex: 20,
  },

  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },

  dotActive: {
    width: 22,
    backgroundColor: '#FFF',
  },

  tapHint: {
    position: 'absolute',
    bottom: 48,
    alignSelf: 'center',
    flexDirection: 'row-reverse',
    direction: 'ltr',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    zIndex: 20,
  },

  tapHintText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'right',
    writingDirection: 'rtl',
  },

  imagesRow: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 2,
    gap: 10,
  },

  smallImageWrapper: {
    width: 82,
    height: 82,
    borderRadius: 17,
    overflow: 'hidden',
    marginLeft: 10,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: '#E2E8F0',
  },

  smallImageWrapperActive: {
    borderColor: '#2B5DAE',
  },

  smallImage: {
    width: '100%',
    height: '100%',
  },

  content: {
    padding: 14,
    gap: 12,
    paddingBottom: 42,
    direction: 'rtl',
  },

  mainCard: {
    backgroundColor: '#FFF',
    borderRadius: 22,
    padding: 15,
    borderWidth: 1,
    borderColor: '#E6ECF5',
    gap: 12,
    elevation: 3,
    shadowColor: '#1E3A5F',
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },

  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#172033',
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 28,
  },

  priceRow: {
    flexDirection: 'row',
    direction: 'rtl',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },

  price: {
    fontSize: 23,
    fontWeight: '900',
    color: '#2B5DAE',
    textAlign: 'right',
    writingDirection: 'ltr',
  },

  currency: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '700',
  },

  statusBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },

  statusBadgeText: {
    color: '#2B5DAE',
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
    writingDirection: 'rtl',
  },

  infoGrid: {
    flexDirection: 'row',
    direction: 'rtl',
    flexWrap: 'wrap',
    gap: 10,
  },

  infoCell: {
    width: '48%',
    backgroundColor: '#F8FAFD',
    borderRadius: 15,
    paddingHorizontal: 11,
    paddingVertical: 10,
    gap: 6,
  },

  infoLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '800',
    textAlign: 'right',
    writingDirection: 'rtl',
  },

  infoValueRow: {
    flexDirection: 'row-reverse',
    direction: 'ltr',
    alignItems: 'center',
    gap: 6,
  },

  infoValue: {
    flex: 1,
    fontSize: 13,
    color: '#172033',
    fontWeight: '900',
    textAlign: 'right',
    writingDirection: 'rtl',
  },

  feesValue: {
    color: '#DC2626',
    writingDirection: 'ltr',
  },

  card: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E6ECF5',
    gap: 10,
  },

  sectionHeader: {
    flexDirection: 'row-reverse',
    direction: 'ltr',
    alignItems: 'center',
    gap: 8,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#172033',
    textAlign: 'right',
    writingDirection: 'rtl',
  },

  description: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 24,
    textAlign: 'right',
    writingDirection: 'rtl',
    fontWeight: '600',
  },

  attributeRow: {
    flexDirection: 'row',
    direction: 'rtl',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingVertical: 9,
    gap: 10,
  },

  attributeName: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '800',
    textAlign: 'right',
    writingDirection: 'rtl',
    flex: 1,
  },

  attributeValue: {
    fontSize: 13,
    color: '#172033',
    fontWeight: '900',
    textAlign: 'left',
    writingDirection: 'ltr',
  },

  video: {
    width: '100%',
    height: 220,
    borderRadius: 18,
    backgroundColor: '#000',
  },

  locationRow: {
    backgroundColor: '#F8FAFD',
    borderRadius: 15,
    padding: 12,
    gap: 10,
  },

  locationItem: {
    flexDirection: 'row-reverse',
    direction: 'ltr',
    alignItems: 'center',
    gap: 6,
  },

  locationText: {
    flex: 1,
    fontSize: 12,
    color: '#64748B',
    textAlign: 'right',
    writingDirection: 'rtl',
    fontWeight: '800',
  },

  openMapButton: {
    backgroundColor: '#2B5DAE',
    borderRadius: 15,
    paddingVertical: 13,
    flexDirection: 'row-reverse',
    direction: 'ltr',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  openMapButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'right',
    writingDirection: 'rtl',
  },

  locationUnavailable: {
    backgroundColor: '#F8FAFD',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  locationUnavailableText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
    writingDirection: 'rtl',
  },

  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#000',
  },

  fullScreenSlide: {
    width: SCREEN_WIDTH,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },

  fullScreenImage: {
    width: '100%',
    height: '100%',
  },

  fullCloseBtn: {
    position: 'absolute',
    top: 48,
    right: 18,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  fullArrowBtn: {
    position: 'absolute',
    top: '48%',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  fullRightArrow: {
    right: 16,
  },

  fullLeftArrow: {
    left: 16,
  },

  fullCounter: {
    position: 'absolute',
    bottom: 38,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },

  fullCounterText: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 14,
    textAlign: 'center',
    writingDirection: 'ltr',
  },
});