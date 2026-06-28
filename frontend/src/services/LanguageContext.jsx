/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react'

const LanguageContext = createContext()

const translations = {
  English: {
    home: 'Home',
    catalog: 'Catalog',
    cart: 'Cart',
    account: 'Account',
    signIn: 'Sign In',
    signOut: 'Sign Out',
    settings: 'Settings',
    myProfile: 'My Profile',
    trackOrders: 'Track Orders',
    wishlist: 'Wishlist',
    searchPlaceholder: 'Search products, brands and categories...',
    searchBtn: 'Search',
    accountSettings: 'Account Settings',
    profileInfo: 'Profile Info',
    securityPassword: 'Security & Password',
    preferences: 'Preferences',
    savedCards: 'Payment Methods',
    privacyData: 'Privacy & Security',
    activeSessions: 'Active Sessions',
    saveChanges: 'Save Changes',
    updatePassword: 'Update Password',
    displayLanguage: 'Display Language',
    selectLanguage: 'Choose your preferred application language',
  },
  Tamil: {
    home: 'முகப்பு',
    catalog: 'பொருட்கள்',
    cart: 'கார்ட்',
    account: 'கணக்கு',
    signIn: 'உள்நுழை',
    signOut: 'வெளியேறு',
    settings: 'அமைப்புகள்',
    myProfile: 'என் சுயவிவரம்',
    trackOrders: 'ஆர்டர் கண்காணிப்பு',
    wishlist: 'விருப்பப் பட்டியல்',
    searchPlaceholder: 'பொருட்களைத் தேடுங்கள்...',
    searchBtn: 'தேடு',
    accountSettings: 'கணக்கு அமைப்புகள்',
    profileInfo: 'சுயவிவர தகவல்',
    securityPassword: 'பாதுகாப்பு & கடவுச்சொல்',
    preferences: 'விருப்பத்தேர்வுகள்',
    savedCards: 'பணம் செலுத்தும் முறைகள்',
    privacyData: 'தனியுரிமை & தரவு',
    activeSessions: 'செயலில் உள்ள சாதனங்கள்',
    saveChanges: 'மாற்றங்களைச் சேமி',
    updatePassword: 'கடவுச்சொல்லைப் புதுப்பி',
    displayLanguage: 'காட்சி மொழி',
    selectLanguage: 'உங்களுக்கு விருப்பமான மொழியைத் தேர்ந்தெடுக்கவும்',
  },
  Telugu: {
    home: 'హోమ్',
    catalog: 'కేటలాగ్',
    cart: 'కార్ట్',
    account: 'ఖాతా',
    signIn: 'సైన్ ఇన్',
    signOut: 'సైన్ అవుట్',
    settings: 'సెట్టింగ్‌లు',
    myProfile: 'నా ప్రొఫైల్',
    trackOrders: 'ఆర్డర్ల ట్రాకింగ్',
    wishlist: 'విష్‌లిస్ట్',
    searchPlaceholder: 'ఉత్పత్తులను శోధించండి...',
    searchBtn: 'శోధించు',
    accountSettings: 'ఖాతా సెట్టింగ్‌లు',
    profileInfo: 'ప్రొఫైల్ సమాచారం',
    securityPassword: 'భద్రత & పాస్‌వర్డ్',
    preferences: 'ప్రాధాన్యతలు',
    savedCards: 'చెల్లింపు పద్ధతులు',
    privacyData: 'గోప్యత & డేటా',
    activeSessions: 'యాక్టివ్ సెషన్‌లు',
    saveChanges: 'మార్పులను సేవ్ చేయి',
    updatePassword: 'పాస్‌వర్డ్ అప్‌డేట్ చేయి',
    displayLanguage: 'ప్రదర్శన భాష',
    selectLanguage: 'మీ ప్రాధాన్యత భాషను ఎంచుకోండి',
  },
  Hindi: {
    home: 'होम',
    catalog: 'कैटलॉग',
    cart: 'कार्ट',
    account: 'खाता',
    signIn: 'साइन इन',
    signOut: 'साइन आउट',
    settings: 'सेटिंग्स',
    myProfile: 'मेरी प्रोफाइल',
    trackOrders: 'ऑर्डर ट्रैक करें',
    wishlist: 'विशलिस्ट',
    searchPlaceholder: 'उत्पाद खोजें...',
    searchBtn: 'खोजें',
    accountSettings: 'खाता सेटिंग्स',
    profileInfo: 'प्रोफाइल जानकारी',
    securityPassword: 'सुरक्षा और पासवर्ड',
    preferences: 'प्राथमिकताएं',
    savedCards: 'भुगतान के तरीके',
    privacyData: 'गोपनीयता और डेटा',
    activeSessions: 'सक्रिय सत्र',
    saveChanges: 'परिवर्तन सहेजें',
    updatePassword: 'पासवर्ड अपडेट करें',
    displayLanguage: 'प्रदर्शन भाषा',
    selectLanguage: 'अपनी पसंदीदा भाषा चुनें',
  },
  German: {
    home: 'Startseite',
    catalog: 'Katalog',
    cart: 'Warenkorb',
    account: 'Konto',
    signIn: 'Anmelden',
    signOut: 'Abmelden',
    settings: 'Einstellungen',
    myProfile: 'Mein Profil',
    trackOrders: 'Bestellungen verfolgen',
    wishlist: 'Wunschliste',
    searchPlaceholder: 'Produkte suchen...',
    searchBtn: 'Suchen',
    accountSettings: 'Kontoeinstellungen',
    profileInfo: 'Profilinformationen',
    securityPassword: 'Sicherheit & Passwort',
    preferences: 'Einstellungen',
    savedCards: 'Zahlungsmethoden',
    privacyData: 'Datenschutz & Daten',
    activeSessions: 'Aktive Sitzungen',
    saveChanges: 'Änderungen speichern',
    updatePassword: 'Passwort aktualisieren',
    displayLanguage: 'Anzeigesprache',
    selectLanguage: 'Wählen Sie Ihre bevorzugte Sprache',
  }
}

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(localStorage.getItem('aura-lang') || 'English')

  useEffect(() => {
    localStorage.setItem('aura-lang', language)
    const langMap = { English: 'en', Tamil: 'ta', Telugu: 'te', Hindi: 'hi', German: 'de' }
    document.documentElement.setAttribute('lang', langMap[language] || 'en')
  }, [language])

  const t = (key) => {
    return translations[language]?.[key] || translations['English']?.[key] || key
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
