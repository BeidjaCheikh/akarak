/**
 * characteristicIcons.ts
 * Icônes générales pour les caractéristiques en arabe.
 *
 * Objectif : éviter les problèmes quand le backend ajoute de nouveaux champs
 * comme: الطول، العرض، الارتفاع، الواجهة، عرض الشارع, etc.
 */

type IconResult = { name: string; lib: 'mci' | 'ion' };

const normalizeArabic = (value: string) =>
  String(value || '')
    .trim()
    .replace(/[ًٌٍَُِّْـ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ');

const includesAny = (text: string, terms: string[]) => {
  const normalizedText = normalizeArabic(text);
  return terms.some((term) => normalizedText.includes(normalizeArabic(term)));
};

export const getCharacteristicIcon = (libelle: string): IconResult => {
  const l = normalizeArabic(libelle);

  // Dimensions / mesures
  if (includesAny(l, ['مساحة', 'المساحة', 'متر مربع', 'م²', 'm2', 'm²']))
    return { name: 'ruler-square', lib: 'mci' };

  if (includesAny(l, ['عرض الشارع', 'شارع', 'الشارع', 'واجهه', 'واجهة']))
    return { name: 'road-variant', lib: 'mci' };

  if (includesAny(l, ['العرض', 'عرض']))
    return { name: 'arrow-expand-horizontal', lib: 'mci' };

  if (includesAny(l, ['الطول', 'طول']))
    return { name: 'arrow-expand-vertical', lib: 'mci' };

  if (includesAny(l, ['الارتفاع', 'ارتفاع']))
    return { name: 'arrow-up-down', lib: 'mci' };

  if (includesAny(l, ['ابعاد', 'أبعاد', 'بعد', 'dimension']))
    return { name: 'ruler', lib: 'mci' };

  // Pièces / intérieur
  if (includesAny(l, ['غرفة', 'غرف', 'غرفه']))
    return { name: 'bed-outline', lib: 'mci' };

  if (includesAny(l, ['حمام', 'حمامات']))
    return { name: 'shower', lib: 'mci' };

  if (includesAny(l, ['مطبخ', 'المطابخ']))
    return { name: 'countertop-outline', lib: 'mci' };

  if (includesAny(l, ['صاله', 'صالة', 'معيشه', 'معيشة']))
    return { name: 'television-play', lib: 'mci' };

  if (includesAny(l, ['صالون', 'استقبال', 'ضيوف']))
    return { name: 'sofa-single-outline', lib: 'mci' };

  if (includesAny(l, ['جلسه', 'جلسة', 'جلسات', 'مجلس']))
    return { name: 'seat-outline', lib: 'mci' };

  if (includesAny(l, ['مفروش', 'اثاث', 'أثاث']))
    return { name: 'sofa-outline', lib: 'mci' };

  // Etage / structure
  if (includesAny(l, ['طابق', 'دور']))
    return { name: 'stairs', lib: 'mci' };

  if (includesAny(l, ['سطح', 'روف']))
    return { name: 'home-roof', lib: 'mci' };

  if (includesAny(l, ['عمر', 'سنه', 'سنة', 'تاريخ']))
    return { name: 'calendar-outline', lib: 'mci' };

  // Parking / services
  if (includesAny(l, ['مراب', 'مرآب', 'جراج', 'كراج']))
    return { name: 'garage-variant', lib: 'mci' };

  if (includesAny(l, ['سياره', 'سيارة', 'موقف', 'مواقف']))
    return { name: 'car-outline', lib: 'mci' };

  if (includesAny(l, ['مصعد', 'اسانسر', 'أسانسير', 'اسانسير']))
    return { name: 'elevator-passenger-outline', lib: 'mci' };

  if (includesAny(l, ['مسبح', 'حوض سباحه', 'حوض سباحة']))
    return { name: 'pool', lib: 'mci' };

  if (includesAny(l, ['حديقه', 'حديقة', 'بستان']))
    return { name: 'tree-outline', lib: 'mci' };

  if (includesAny(l, ['بلكونه', 'بلكونة', 'شرفه', 'شرفة']))
    return { name: 'balcony', lib: 'mci' };

  if (includesAny(l, ['مخزن', 'مستودع']))
    return { name: 'warehouse', lib: 'mci' };

  if (includesAny(l, ['خادمه', 'خادمة', 'عماله', 'عمالة', 'خدمة', 'خدمه']))
    return { name: 'account-hard-hat-outline', lib: 'mci' };

  if (includesAny(l, ['اطلاله', 'إطلالة', 'منظر']))
    return { name: 'binoculars', lib: 'mci' };

  // Confort / équipements
  if (includesAny(l, ['تكييف', 'مكيف']))
    return { name: 'air-conditioner', lib: 'mci' };

  if (includesAny(l, ['تدفئه', 'تدفئة']))
    return { name: 'fire', lib: 'mci' };

  if (includesAny(l, ['انترنت', 'إنترنت', 'واي فاي', 'wifi', 'wi-fi']))
    return { name: 'wifi', lib: 'mci' };

  if (includesAny(l, ['كاميرا', 'كاميرات', 'مراقبه', 'مراقبة']))
    return { name: 'cctv', lib: 'mci' };

  if (includesAny(l, ['امن', 'أمن', 'حراسه', 'حراسة', 'بواب']))
    return { name: 'shield-outline', lib: 'mci' };

  // Energie / eau
  if (includesAny(l, ['كهرباء']))
    return { name: 'lightning-bolt-outline', lib: 'mci' };

  if (includesAny(l, ['مولد', 'احتياطي']))
    return { name: 'generator-portable', lib: 'mci' };

  if (includesAny(l, ['غاز']))
    return { name: 'gas-cylinder', lib: 'mci' };

  if (includesAny(l, ['ماء', 'مياه']))
    return { name: 'water-outline', lib: 'mci' };

  if (includesAny(l, ['خزان', 'صهريج']))
    return { name: 'water-pump', lib: 'mci' };

  return { name: 'tune-vertical', lib: 'mci' };
};
