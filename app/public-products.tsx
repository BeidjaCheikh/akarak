import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  RefreshControl,
  Dimensions,
  Modal,
  TextInput,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import {
  getPublicProducts,
  PublicProductItem,
} from '@/src/api/product/service';

const SERVER_URL = 'https://www.akkaarak.com';
const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = SCREEN_WIDTH;

const APP_PRIMARY = '#4A9F35';
const APP_PRIMARY_DARK = '#2F6B24';
const APP_PRIMARY_MEDIUM = '#63B84A';
const APP_PRIMARY_LIGHT = '#EAF7E6';
const APP_PRIMARY_SOFT = '#F6FAF5';
const APP_PRIMARY_BORDER = '#CFE8C7';
const APP_BACKGROUND = '#F6FAF5';

type FilterValue = 'ALL' | string;

type FilterOption = {
  label: string;
  value: string;
};

const STATUS_LABEL: Record<string, string> = {
  VENDRE: 'للبيع',
  ALLOUER: 'للإيجار',
};

const getImageUri = (image?: string | null) => {
  if (!image) return null;

  const cleanImage = image.trim().replace(/\\/g, '/');

  if (cleanImage.startsWith('http://') || cleanImage.startsWith('https://')) {
    return encodeURI(cleanImage);
  }

  if (cleanImage.startsWith('/uploads/')) {
    return encodeURI(`${SERVER_URL}${cleanImage}`);
  }

  if (cleanImage.startsWith('uploads/')) {
    return encodeURI(`${SERVER_URL}/${cleanImage}`);
  }

  if (cleanImage.startsWith('/')) {
    return encodeURI(`${SERVER_URL}/uploads${cleanImage}`);
  }

  return encodeURI(`${SERVER_URL}/uploads/${cleanImage}`);
};

function FilterSelect({
  label,
  valueLabel,
  icon,
  iconBg,
  iconColor = '#FFFFFF',
  onPress,
}: {
  label: string;
  valueLabel: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor?: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={styles.filterSelect}
    >
      <View style={[styles.filterSelectIconBox, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={16} color={iconColor} />
      </View>

      <Text style={styles.filterSelectLabel} numberOfLines={1}>
        {label}
      </Text>

      <Text style={styles.filterSelectValue} numberOfLines={1}>
        {valueLabel}
      </Text>

      <Ionicons name="chevron-down" size={14} color={iconBg} />
    </TouchableOpacity>
  );
}

function OptionsModal({
  visible,
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: FilterOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={styles.optionsSheet}>
          <View style={styles.optionsHeader}>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose}>
              <Ionicons name="close" size={22} color="#172033" />
            </TouchableOpacity>

            <Text style={styles.optionsTitle}>{title}</Text>
          </View>

          <FlatList
            data={options}
            keyExtractor={(item) => item.value}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const active = selectedValue === item.value;

              return (
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={[styles.optionItem, active && styles.optionItemActive]}
                  onPress={() => {
                    onSelect(item.value);
                    onClose();
                  }}
                >
                  {active ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color={APP_PRIMARY}
                    />
                  ) : (
                    <View style={styles.optionEmptyCircle} />
                  )}

                  <Text
                    style={[
                      styles.optionText,
                      active && styles.optionTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

function CityZoneModal({
  visible,
  cities,
  products,
  selectedCity,
  selectedZone,
  onSelect,
  onClose,
}: {
  visible: boolean;
  cities: string[];
  products: PublicProductItem[];
  selectedCity: string;
  selectedZone: string;
  onSelect: (city: string, zone: string) => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState<'city' | 'zone'>('city');
  const [activeCity, setActiveCity] = useState<string>('ALL');

  useEffect(() => {
    if (visible) {
      setStep('city');
      setActiveCity(selectedCity);
    }
  }, [visible, selectedCity]);

  const zonesOfActiveCity = useMemo(() => {
    if (activeCity === 'ALL') return [];

    return Array.from(
      new Set(
        products
          .filter((item) => item.cityName === activeCity)
          .map((item) => item.zoneName)
          .filter((zone): zone is string => Boolean(zone))
      )
    );
  }, [products, activeCity]);

  const cityOptions: FilterOption[] = [
    { label: 'كل المدن والمناطق', value: 'ALL' },
    ...cities.map((city) => ({
      label: city,
      value: city,
    })),
  ];

  const zoneOptions: FilterOption[] = [
    { label: 'كل مناطق المدينة', value: 'ALL' },
    ...zonesOfActiveCity.map((zone) => ({
      label: zone,
      value: zone,
    })),
  ];

  const currentOptions = step === 'city' ? cityOptions : zoneOptions;

  const title =
    step === 'city' ? 'اختر المدينة' : `اختر المنطقة - ${activeCity}`;

  const selectedValue = step === 'city' ? activeCity : selectedZone;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={styles.optionsSheet}>
          <View style={styles.optionsHeader}>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose}>
              <Ionicons name="close" size={22} color="#172033" />
            </TouchableOpacity>

            <Text style={styles.optionsTitle}>{title}</Text>

            {step === 'zone' && (
              <TouchableOpacity
                style={styles.modalBackBtn}
                activeOpacity={0.85}
                onPress={() => setStep('city')}
              >
                <Ionicons name="chevron-forward" size={20} color={APP_PRIMARY} />
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            data={currentOptions}
            keyExtractor={(item) => item.value}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const active = selectedValue === item.value;

              return (
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={[styles.optionItem, active && styles.optionItemActive]}
                  onPress={() => {
                    if (step === 'city') {
                      if (item.value === 'ALL') {
                        onSelect('ALL', 'ALL');
                        onClose();
                        return;
                      }

                      setActiveCity(item.value);
                      setStep('zone');
                      return;
                    }

                    onSelect(activeCity, item.value);
                    onClose();
                  }}
                >
                  {active ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color={APP_PRIMARY}
                    />
                  ) : (
                    <View style={styles.optionEmptyCircle} />
                  )}

                  <Text
                    style={[
                      styles.optionText,
                      active && styles.optionTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.modalEmptyBox}>
                <Ionicons name="location-outline" size={36} color="#CBD5E1" />
                <Text style={styles.modalEmptyText}>
                  لا توجد مناطق لهذه المدينة
                </Text>
              </View>
            }
          />
        </View>
      </View>
    </Modal>
  );
}

function ProductImageCarousel({
  images,
  onPress,
}: {
  images?: string[];
  onPress?: () => void;
}) {
  const listRef = useRef<FlatList<string>>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const imageUris = useMemo(() => {
    return (images || [])
      .map((img) => getImageUri(img))
      .filter(Boolean) as string[];
  }, [images]);

  const total = imageUris.length;

  useEffect(() => {
    setActiveIndex(0);

    setTimeout(() => {
      listRef.current?.scrollToOffset({
        offset: 0,
        animated: false,
      });
    }, 50);
  }, [imageUris.length]);

  const scrollToImage = (index: number) => {
    if (total <= 0) return;

    const safeIndex = (index + total) % total;
    setActiveIndex(safeIndex);

    listRef.current?.scrollToIndex({
      index: safeIndex,
      animated: true,
    });
  };

  if (total === 0) {
    return (
      <TouchableOpacity
        style={styles.noImage}
        activeOpacity={0.9}
        onPress={onPress}
        disabled={!onPress}
      >
        <Ionicons name="image-outline" size={46} color="#94A3B8" />
        <Text style={styles.noImageText}>لا توجد صورة</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.carouselBox}>
      <FlatList
        ref={listRef}
        data={imageUris}
        horizontal
        pagingEnabled
        nestedScrollEnabled
        scrollEnabled={total > 1}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item, index) => `${item}-${index}`}
        getItemLayout={(_, index) => ({
          length: CARD_WIDTH,
          offset: CARD_WIDTH * index,
          index,
        })}
        onMomentumScrollEnd={(event) => {
          const index = Math.round(
            event.nativeEvent.contentOffset.x / CARD_WIDTH
          );
          setActiveIndex(index);
        }}
        onScrollToIndexFailed={(info) => {
          setTimeout(() => {
            listRef.current?.scrollToOffset({
              offset: info.index * CARD_WIDTH,
              animated: true,
            });
          }, 250);
        }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.carouselSlide}
            activeOpacity={0.95}
            onPress={onPress}
            disabled={!onPress}
          >
            <Image
              source={{ uri: item }}
              style={styles.image}
              resizeMode="cover"
              onError={(e) => {
                console.log(
                  'PUBLIC CARD IMAGE ERROR:',
                  item,
                  e.nativeEvent.error
                );
              }}
            />
          </TouchableOpacity>
        )}
      />

      <View style={styles.imageShade} />

      {total > 1 && (
        <>
          <TouchableOpacity
            style={[styles.carouselArrow, styles.carouselRightArrow]}
            onPress={() => scrollToImage(activeIndex + 1)}
            activeOpacity={0.85}
          >
            <Ionicons name="chevron-forward" size={24} color="#FFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.carouselArrow, styles.carouselLeftArrow]}
            onPress={() => scrollToImage(activeIndex - 1)}
            activeOpacity={0.85}
          >
            <Ionicons name="chevron-back" size={24} color="#FFF" />
          </TouchableOpacity>

          <View style={styles.imageCounter}>
            <Text style={styles.imageCounterText}>
              {activeIndex + 1} / {total}
            </Text>
          </View>

          <View style={styles.carouselDots}>
            {imageUris.map((_, index) => (
              <View
                key={`dot-${index}`}
                style={[
                  styles.carouselDot,
                  activeIndex === index && styles.carouselDotActive,
                ]}
              />
            ))}
          </View>
        </>
      )}
    </View>
  );
}

export default function PublicProductsScreen() {
  const [products, setProducts] = useState<PublicProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalElements, setTotalElements] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [searchText, setSearchText] = useState('');
  const [selectedCity, setSelectedCity] = useState<FilterValue>('ALL');
  const [selectedZone, setSelectedZone] = useState<FilterValue>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<FilterValue>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<FilterValue>('ALL');

  const [openFilter, setOpenFilter] = useState<
    'status' | 'cityZone' | 'category' | null
  >(null);

  const fetchProducts = useCallback(async () => {
    try {
      setError(null);

      const PAGE_SIZE = 50;
      let pageToLoad = 0;
      let totalPagesToLoad = 1;
      let allProducts: PublicProductItem[] = [];
      let totalFromApi = 0;

      do {
        const data = await getPublicProducts(pageToLoad, PAGE_SIZE);

        const content = data.content || [];
        allProducts = [...allProducts, ...content];

        totalFromApi = data.totalElements ?? allProducts.length;
        totalPagesToLoad = data.totalPages || 1;

        pageToLoad += 1;

        if (data.last) break;
      } while (pageToLoad < totalPagesToLoad);

      const uniqueProducts = Array.from(
        new Map(allProducts.map((item) => [item.codeUuid, item])).values()
      );

      setProducts(uniqueProducts);
      setTotalElements(totalFromApi || uniqueProducts.length);
    } catch (e: any) {
      console.log('PUBLIC PRODUCTS ERROR:', {
        message: e?.message,
        status: e?.response?.status,
        data: e?.response?.data,
      });

      setError('تعذر تحميل العقارات، يرجى المحاولة مجدداً');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const cities = useMemo(() => {
    return Array.from(
      new Set(
        products
          .map((item) => item.cityName)
          .filter((city): city is string => Boolean(city))
      )
    );
  }, [products]);

  const categories = useMemo(() => {
    return Array.from(
      new Set(
        products
          .map((item) => item.categoryName)
          .filter((category): category is string => Boolean(category))
      )
    );
  }, [products]);

  const statusOptions: FilterOption[] = [
    { label: 'الكل', value: 'ALL' },
    { label: 'للبيع', value: 'VENDRE' },
    { label: 'للإيجار', value: 'ALLOUER' },
  ];

  const categoryOptions: FilterOption[] = [
    { label: 'كل الفئات', value: 'ALL' },
    ...categories.map((category) => ({
      label: category,
      value: category,
    })),
  ];

  const getSelectedLabel = (options: FilterOption[], value: string) => {
    return options.find((option) => option.value === value)?.label ?? 'الكل';
  };

  const getCityZoneLabel = () => {
    if (selectedCity === 'ALL') {
      return 'كل المدن والمناطق';
    }

    if (selectedZone === 'ALL') {
      return `${selectedCity} - كل المناطق`;
    }

    return `${selectedCity} - ${selectedZone}`;
  };

  const isFilterActive =
    selectedCity !== 'ALL' ||
    selectedZone !== 'ALL' ||
    selectedCategory !== 'ALL' ||
    selectedStatus !== 'ALL' ||
    searchText.trim().length > 0;

  const filteredProducts = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    return products.filter((item) => {
      const matchSearch =
        keyword.length === 0 ||
        item.title?.toLowerCase().includes(keyword) ||
        item.categoryName?.toLowerCase().includes(keyword) ||
        item.cityName?.toLowerCase().includes(keyword) ||
        item.zoneName?.toLowerCase().includes(keyword);

      const matchCity =
        selectedCity === 'ALL' || item.cityName === selectedCity;

      const matchZone =
        selectedZone === 'ALL' || item.zoneName === selectedZone;

      const matchCategory =
        selectedCategory === 'ALL' || item.categoryName === selectedCategory;

      const matchStatus =
        selectedStatus === 'ALL' || item.status === selectedStatus;

      return matchSearch && matchCity && matchZone && matchCategory && matchStatus;
    });
  }, [
    products,
    searchText,
    selectedCity,
    selectedZone,
    selectedCategory,
    selectedStatus,
  ]);

  const resetFilters = () => {
    setSearchText('');
    setSelectedCity('ALL');
    setSelectedZone('ALL');
    setSelectedCategory('ALL');
    setSelectedStatus('ALL');
  };

  const onRefresh = () => {
    setRefreshing(true);
    resetFilters();
    fetchProducts();
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

  const renderItem = ({ item }: { item: PublicProductItem }) => {
    const cityLabel = item.cityName || 'غير محدد';
    const zoneLabel = item.zoneName || 'غير محدد';
    const categoryLabel = item.categoryName || 'غير محدد';
    const statusLabel = STATUS_LABEL[item.status] ?? item.status;

    return (
      <View style={styles.card}>
        <View style={styles.imageContainer}>
          <ProductImageCarousel
            images={item.images}
            onPress={() => goToDetails(item.codeUuid)}
          />

          <View style={styles.topBadges}>
            <View style={styles.statusTopBadge}>
              <Text style={styles.statusTopBadgeText}>{statusLabel}</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => goToDetails(item.codeUuid)}
          style={styles.content}
        >
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>

          <View style={styles.metaGrid}>
            <View style={styles.metaBox}>
              <Ionicons name="location-outline" size={16} color="#16A34A" />
              <Text style={styles.metaText} numberOfLines={1}>
                {cityLabel} - {zoneLabel}
              </Text>
            </View>

            <View style={styles.metaBox}>
              <MaterialCommunityIcons
                name="home-city-outline"
                size={16}
                color="#F97316"
              />
              <Text style={styles.metaText} numberOfLines={1}>
                {categoryLabel}
              </Text>
            </View>
          </View>

          <View style={styles.createdAtRow}>
            <Ionicons name="calendar-outline" size={14} color="#64748B" />
            <Text style={styles.createdAtText} numberOfLines={2}>
              تاريخ الإضافة: {item.createdAt || 'غير محدد'}
            </Text>
          </View>

          <View style={styles.footer}>
            <View style={styles.priceContainer}>
              <Text style={styles.price}>
                {Number(item.price || 0).toLocaleString('fr-FR')}
                <Text style={styles.currency}> MRU</Text>
              </Text>
            </View>

            <TouchableOpacity
              style={styles.detailsOutlineButton}
              activeOpacity={0.85}
              onPress={() => goToDetails(item.codeUuid)}
            >
              <Ionicons name="chevron-back" size={15} color={APP_PRIMARY} />
              <Text style={styles.detailsOutlineText}>عرض التفاصيل</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <Stack.Screen
          options={{ title: 'العقارات', headerShadowVisible: false }}
        />
        <ActivityIndicator size="large" color={APP_PRIMARY} />
        <Text style={styles.loadingText}>جاري تحميل العقارات...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Stack.Screen
          options={{ title: 'العقارات', headerShadowVisible: false }}
        />
        <Ionicons name="cloud-offline-outline" size={58} color="#CBD5E1" />
        <Text style={styles.errorTitle}>تعذر التحميل</Text>
        <Text style={styles.errorText}>{error}</Text>

        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            setLoading(true);
            fetchProducts();
          }}
        >
          <Ionicons name="refresh" size={16} color="#FFF" />
          <Text style={styles.retryText}>إعادة المحاولة</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{ title: 'العقارات', headerShadowVisible: false }}
      />

      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.codeUuid}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.listContent,
          filteredProducts.length === 0 && styles.emptyContainer,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[APP_PRIMARY]}
            tintColor={APP_PRIMARY}
          />
        }
        ListHeaderComponent={
          totalElements > 0 ? (
            <View style={styles.headerWrapper}>
              <View style={styles.searchBox}>
                <Ionicons name="search-outline" size={18} color="#94A3B8" />

                <TextInput
                  value={searchText}
                  onChangeText={setSearchText}
                  placeholder="ابحث بالعنوان، الفئة، المدينة أو المنطقة"
                  placeholderTextColor="#94A3B8"
                  style={styles.searchInput}
                  textAlign="right"
                />

                {searchText.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchText('')}>
                    <Ionicons name="close-circle" size={18} color="#CBD5E1" />
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.filtersCard}>
                <View style={styles.filterHeader}>
                  {isFilterActive ? (
                    <TouchableOpacity onPress={resetFilters} activeOpacity={0.8}>
                      <Text style={styles.clearFiltersText}>مسح الفلاتر</Text>
                    </TouchableOpacity>
                  ) : (
                    <View />
                  )}

                  <View style={styles.filterTitleRow}>
                    <Ionicons
                      name="filter-outline"
                      size={18}
                      color={APP_PRIMARY}
                    />
                    <Text style={styles.filterTitle}>تصفية النتائج</Text>
                  </View>
                </View>

                <View style={styles.filtersGrid}>
                  <FilterSelect
                    label="نوع العملية"
                    valueLabel={getSelectedLabel(statusOptions, selectedStatus)}
                    icon="swap-horizontal-outline"
                    iconBg={APP_PRIMARY_DARK}
                    onPress={() => setOpenFilter('status')}
                  />

                  <FilterSelect
                    label="المدينة / المنطقة"
                    valueLabel={getCityZoneLabel()}
                    icon="location-outline"
                    iconBg={APP_PRIMARY}
                    onPress={() => setOpenFilter('cityZone')}
                  />

                  <FilterSelect
                    label="الفئة"
                    valueLabel={getSelectedLabel(
                      categoryOptions,
                      selectedCategory
                    )}
                    icon="home-outline"
                    iconBg={APP_PRIMARY_MEDIUM}
                    onPress={() => setOpenFilter('category')}
                  />
                </View>
              </View>
            </View>
          ) : null
        }
        ListEmptyComponent={
          totalElements === 0 ? (
            <View style={styles.emptyBox}>
              <View style={styles.emptyIconBox}>
                <Ionicons name="home-outline" size={50} color="#CBD5E1" />
              </View>

              <Text style={styles.emptyTitle}>لا توجد عقارات</Text>
              <Text style={styles.emptyText}>لا توجد عقارات منشورة حالياً</Text>
            </View>
          ) : (
            <View style={styles.emptyBox}>
              <View style={styles.emptyIconBox}>
                <Ionicons name="search-outline" size={50} color="#CBD5E1" />
              </View>

              <Text style={styles.emptyTitle}>لا توجد نتائج</Text>
              <Text style={styles.emptyText}>
                لا يوجد أي عقار مطابق للفلاتر المختارة
              </Text>
            </View>
          )
        }
      />

      <OptionsModal
        visible={openFilter === 'status'}
        title="نوع العملية"
        options={statusOptions}
        selectedValue={selectedStatus}
        onSelect={setSelectedStatus}
        onClose={() => setOpenFilter(null)}
      />

      <CityZoneModal
        visible={openFilter === 'cityZone'}
        cities={cities}
        products={products}
        selectedCity={selectedCity}
        selectedZone={selectedZone}
        onSelect={(city, zone) => {
          setSelectedCity(city);
          setSelectedZone(zone);
        }}
        onClose={() => setOpenFilter(null)}
      />

      <OptionsModal
        visible={openFilter === 'category'}
        title="اختر الفئة"
        options={categoryOptions}
        selectedValue={selectedCategory}
        onSelect={setSelectedCategory}
        onClose={() => setOpenFilter(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: APP_BACKGROUND,
    direction: 'ltr',
  },

  centered: {
    flex: 1,
    backgroundColor: APP_BACKGROUND,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
    direction: 'ltr',
  },

  listContent: {
    paddingTop: 0,
    paddingHorizontal: 0,
    paddingBottom: 80,
    gap: 10,
  },

  emptyContainer: {
    flexGrow: 1,
  },

  headerWrapper: {
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
  },

  searchBox: {
    width: '100%',
    backgroundColor: '#FFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: APP_PRIMARY_BORDER,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row-reverse',
    direction: 'ltr',
    alignItems: 'center',
    gap: 8,
  },

  searchInput: {
    flex: 1,
    color: '#172033',
    fontSize: 13,
    fontWeight: '800',
    paddingVertical: 0,
    textAlign: 'right',
    writingDirection: 'rtl',
  },

  filtersCard: {
    backgroundColor: APP_PRIMARY_SOFT,
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: APP_PRIMARY_BORDER,
    gap: 10,
    elevation: 2,
    shadowColor: APP_PRIMARY_DARK,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },

  filterHeader: {
    flexDirection: 'row',
    direction: 'ltr',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  filterTitleRow: {
    flexDirection: 'row-reverse',
    direction: 'ltr',
    alignItems: 'center',
    gap: 6,
  },

  filterTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#172033',
    textAlign: 'right',
    writingDirection: 'rtl',
  },

  clearFiltersText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#DC2626',
    textAlign: 'right',
    writingDirection: 'rtl',
  },

  filtersGrid: {
    flexDirection: 'row-reverse',
    direction: 'ltr',
    flexWrap: 'wrap',
    gap: 8,
  },

  filterSelect: {
    width: '48%',
    minWidth: 0,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.4,
    borderColor: APP_PRIMARY_BORDER,
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    elevation: 1,
    shadowColor: APP_PRIMARY,
    shadowOpacity: 0.08,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },

  filterSelectIconBox: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },

  filterSelectLabel: {
    fontSize: 10,
    color: '#6B7C90',
    fontWeight: '900',
    textAlign: 'center',
    writingDirection: 'rtl',
  },

  filterSelectValue: {
    fontSize: 12,
    color: '#172033',
    fontWeight: '900',
    textAlign: 'center',
    writingDirection: 'rtl',
    maxWidth: '100%',
  },

  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },

  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },

  optionsSheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 16,
    paddingBottom: 28,
    maxHeight: '70%',
  },

  optionsHeader: {
    flexDirection: 'row',
    direction: 'ltr',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  modalCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
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

  optionsTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '900',
    color: '#172033',
    textAlign: 'right',
    writingDirection: 'rtl',
    marginRight: 12,
  },

  optionItem: {
    flexDirection: 'row-reverse',
    direction: 'ltr',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 15,
    marginBottom: 6,
    backgroundColor: '#F8FAFD',
  },

  optionItemActive: {
    backgroundColor: APP_PRIMARY_LIGHT,
  },

  optionText: {
    flex: 1,
    fontSize: 14,
    color: '#475569',
    fontWeight: '800',
    textAlign: 'right',
    writingDirection: 'rtl',
    marginHorizontal: 10,
  },

  optionTextActive: {
    color: APP_PRIMARY,
    fontWeight: '900',
  },

  optionEmptyCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#CBD5E1',
  },

  modalEmptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    gap: 8,
  },

  modalEmptyText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#94A3B8',
    textAlign: 'center',
    writingDirection: 'rtl',
  },

  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    borderRadius: 0,
    borderWidth: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#E6ECF5',
    elevation: 0,
    shadowOpacity: 0,
  },

  imageContainer: {
    height: 270,
    width: '100%',
    backgroundColor: '#EEF2F7',
    position: 'relative',
  },

  carouselBox: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },

  carouselSlide: {
    width: CARD_WIDTH,
    height: 270,
  },

  image: {
    width: '100%',
    height: '100%',
  },

  imageShade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 86,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },

  noImage: {
    flex: 1,
    backgroundColor: '#EEF2F7',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  noImageText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
    writingDirection: 'rtl',
  },

  carouselArrow: {
    position: 'absolute',
    top: '42%',
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0,0,0,0.42)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },

  carouselRightArrow: {
    right: 12,
  },

  carouselLeftArrow: {
    left: 12,
  },

  imageCounter: {
    position: 'absolute',
    top: '50%',
    alignSelf: 'center',
    transform: [{ translateY: -14 }],
    backgroundColor: 'rgba(0,0,0,0.46)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    zIndex: 20,
  },

  imageCounterText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
    writingDirection: 'ltr',
    includeFontPadding: false,
  },

  carouselDots: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
    zIndex: 20,
  },

  carouselDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },

  carouselDotActive: {
    width: 18,
    backgroundColor: '#FFF',
  },

  topBadges: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row-reverse',
    direction: 'ltr',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 30,
  },

  statusTopBadge: {
    backgroundColor: APP_PRIMARY_LIGHT,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },

  statusTopBadgeText: {
    color: APP_PRIMARY,
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
    writingDirection: 'rtl',
  },

  content: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    gap: 10,
    direction: 'ltr',
    alignItems: 'stretch',
  },

  title: {
    width: '100%',
    alignSelf: 'stretch',
    fontSize: 18,
    fontWeight: '900',
    color: '#172033',
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 25,
  },

  metaGrid: {
    flexDirection: 'row-reverse',
    direction: 'ltr',
    gap: 8,
  },

  metaBox: {
    flex: 1,
    backgroundColor: '#F8FAFD',
    borderRadius: 13,
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: 'row-reverse',
    direction: 'ltr',
    alignItems: 'center',
    gap: 6,
  },

  metaText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '800',
    textAlign: 'right',
    writingDirection: 'rtl',
    flex: 1,
  },

  createdAtRow: {
    marginTop: 2,
    flexDirection: 'row-reverse',
    direction: 'ltr',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 5,
  },

  createdAtText: {
    color: '#94A3B8',
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '800',
    textAlign: 'right',
    writingDirection: 'ltr',
    includeFontPadding: false,
  },

  footer: {
    marginTop: 12,
    flexDirection: 'row-reverse',
    direction: 'ltr',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },

  priceContainer: {
    alignItems: 'flex-end',
    flex: 1,
  },

  price: {
    fontSize: 19,
    fontWeight: '900',
    color: APP_PRIMARY,
    textAlign: 'right',
    writingDirection: 'ltr',
  },

  currency: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '700',
  },

  detailsOutlineButton: {
    minHeight: 42,
    borderRadius: 13,
    borderWidth: 1.4,
    borderColor: APP_PRIMARY,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row-reverse',
    direction: 'ltr',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  detailsOutlineText: {
    color: APP_PRIMARY,
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'right',
    writingDirection: 'rtl',
  },

  loadingText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '700',
    textAlign: 'center',
    writingDirection: 'rtl',
  },

  errorTitle: {
    fontSize: 18,
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

  retryButton: {
    marginTop: 6,
    backgroundColor: APP_PRIMARY,
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

  emptyBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 32,
    paddingTop: 80,
  },

  emptyIconBox: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: '#EEF2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#172033',
    textAlign: 'center',
    writingDirection: 'rtl',
  },

  emptyText: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
});