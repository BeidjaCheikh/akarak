import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import fr from './resources/fr.json';
import ar from './resources/ar.json';

i18n.use(initReactI18next).init({
  resources: {
    fr: { translation: fr },
    ar: { translation: ar },
  },
  lng: 'fr',          // ✅ défaut fixe (ne dépend PAS du device)
  fallbackLng: 'fr',
  interpolation: { escapeValue: false },
});

export default i18n;
