export const STORAGE_LANGUAGE_KEY = "real-holat:language";

export const SUPPORTED_LANGUAGES = [
  { code: "uz", label: "O'z" },
  { code: "en", label: "EN" },
  { code: "ru", label: "RU" }
];

export const LOCALE_BY_LANGUAGE = {
  uz: "uz-UZ",
  en: "en-US",
  ru: "ru-RU"
};

export const translations = {
  en: {
    languageSwitcher: {
      label: "Language",
      ariaLabel: "Language switcher"
    },
    nav: {
      submission: "Submission",
      dashboard: "Dashboard",
      profile: "Profile"
    },
    dashboard: {
      title: "Public Dashboard",
      subtitle: "One live map for civic reports and official registry layers.",
      searchPlaceholder: "Search reports, object name, region",
      apiEndpoint: "API Endpoint",
      status: "Status",
      date: "Date",
      sourceFilters: "Data source filters",
      noMatches: "No reports match the current filters.",
      loadingGeoAsr: "Loading GEOASR layers...",
      topContributors: "Top contributors",
      contributorsSubtitle: "Community members earning the most civic XP."
    },
    submission: {
      title: "Submission Report",
      subtitle: "Report infrastructure issues in a few quick steps.",
      category: "Category",
      media: "Photo / Video",
      description: "Description",
      descriptionPlaceholder: "Describe what is wrong and why it matters",
      placeName: "Object / Place Name",
      placeNamePlaceholder: "School No. 12 - Toilet Block A",
      location: "Location",
      locationPlaceholder: "Use current geolocation or enter address",
      uploadPreview: "Upload preview",
      geolocate: "Use current geolocation",
      locating: "Getting location...",
      submit: "Submit Report",
      incompleteError: "Please complete category, photo, description, location, and place name.",
      geolocationUnsupported: "Geolocation is not supported. Please enter address manually.",
      geolocationUnavailable: "Unable to get current location. Please enter address manually.",
      success: "Report submitted. +{xp} XP earned."
    },
    profile: {
      title: "Profile",
      subtitle: "Your civic reporting activity.",
      submittedReports: "Submitted Reports",
      reputation: "Reputation",
      currentRank: "Current Rank",
      streak: "Streak",
      streakUnit: "current streak",
      nextRankProgress: "{count} XP to {rank}",
      maxRankReached: "You have reached the highest rank.",
      badges: "Badges",
      unlockedCount: "{count} unlocked",
      unlocked: "Unlocked",
      locked: "Locked",
      settings: "Settings",
      settingsPlaceholder: "Notification and account settings can be added here later.",
      yourReports: "Your reports",
      noReports: "You have not submitted reports yet."
    },
    stats: {
      ariaLabel: "Public statistics",
      total: "Total",
      verified: "Verified",
      resolved: "Resolved",
      urgent: "Urgent"
    },
    map: {
      title: "Public Map",
      addApiKey: "Add organizer API key in .env: VITE_MAP_API_KEY=... then restart the app.",
      mappedPoints: "{count} mapped points",
      geoAsrObject: "GEOASR Object",
      source: "Source",
      approximateLocation: "Approximate location (region-based)",
      noCoordinates: "No coordinates in filtered data yet. For citizen reports use location format: lat,lng."
    },
    common: {
      all: "All",
      allTime: "All time",
      today: "Today",
      last7Days: "Last 7 days",
      last30Days: "Last 30 days",
      reports: "Reports",
      telegramUser: "Telegram user",
      you: "You",
      pointsShort: "pts"
    },
    sources: {
      reports: "Reports",
      maktab44: "Schools",
      bogcha: "Preschools",
      ssv: "Health"
    },
    categories: {
      "School infrastructure": "School infrastructure",
      "Clinic infrastructure": "Clinic infrastructure",
      "Drinking water supply": "Drinking water supply",
      "Internal roads": "Internal roads",
      "Sanitation and waste": "Sanitation and waste",
      "Street lighting": "Street lighting",
      "Public safety": "Public safety",
      Other: "Other"
    },
    statuses: {
      Submitted: "Submitted",
      "Under Review": "Under Review",
      Verified: "Verified",
      "In Progress": "In Progress",
      Resolved: "Resolved"
    },
    ranks: {
      observer: "Kuzatuvchi",
      active: "Faol",
      guardian: "Qo'riqchi",
      leader: "Sarvar",
      legend: "Shahar afsonasi"
    },
    badges: {
      "road-guard": "Road Guard",
      "water-patrol": "Water Patrol",
      explorer: "Explorer",
      "verified-hero": "Verified Hero"
    }
  },
  uz: {
    languageSwitcher: {
      label: "Til",
      ariaLabel: "Til tanlash"
    },
    nav: {
      submission: "Yuborish",
      dashboard: "Panel",
      profile: "Profil"
    },
    dashboard: {
      title: "Ochiq panel",
      subtitle: "Fuqarolar murojaatlari va rasmiy registr qatlamlari uchun yagona jonli xarita.",
      searchPlaceholder: "Murojaat, obyekt nomi yoki hudud bo'yicha qidirish",
      apiEndpoint: "API manbasi",
      status: "Holat",
      date: "Sana",
      sourceFilters: "Ma'lumot manbalari filtri",
      noMatches: "Joriy filtrlarga mos murojaatlar topilmadi.",
      loadingGeoAsr: "GEOASR qatlamlari yuklanmoqda...",
      topContributors: "Eng faol foydalanuvchilar",
      contributorsSubtitle: "Eng ko'p fuqarolik XP to'plagan ishtirokchilar."
    },
    submission: {
      title: "Murojaat yuborish",
      subtitle: "Infratuzilma muammosini bir necha qadamda yuboring.",
      category: "Kategoriya",
      media: "Foto / Video",
      description: "Tavsif",
      descriptionPlaceholder: "Muammo nimada va nima uchun muhimligini yozing",
      placeName: "Obyekt / Joy nomi",
      placeNamePlaceholder: "12-maktab - A blok hojatxonasi",
      location: "Joylashuv",
      locationPlaceholder: "Joriy geolokatsiyani oling yoki manzil kiriting",
      uploadPreview: "Yuklangan media ko'rinishi",
      geolocate: "Joriy geolokatsiyani olish",
      locating: "Joylashuv olinmoqda...",
      submit: "Murojaatni yuborish",
      incompleteError: "Kategoriya, foto, tavsif, joylashuv va obyekt nomini to'ldiring.",
      geolocationUnsupported: "Geolokatsiya qo'llab-quvvatlanmaydi. Manzilni qo'lda kiriting.",
      geolocationUnavailable: "Joriy joylashuvni olib bo'lmadi. Manzilni qo'lda kiriting.",
      success: "Murojaat yuborildi. +{xp} XP olindi."
    },
    profile: {
      title: "Profil",
      subtitle: "Fuqarolik faolligingiz statistikasi.",
      submittedReports: "Yuborilgan murojaatlar",
      reputation: "Reyting",
      currentRank: "Joriy unvon",
      streak: "Seriya",
      streakUnit: "joriy seriya",
      nextRankProgress: "{rank} uchun yana {count} XP",
      maxRankReached: "Siz eng yuqori unvonga yetdingiz.",
      badges: "Nishonlar",
      unlockedCount: "{count} ta ochilgan",
      unlocked: "Ochiq",
      locked: "Yopiq",
      settings: "Sozlamalar",
      settingsPlaceholder: "Bildirishnomalar va akkaunt sozlamalari keyinroq qo'shiladi.",
      yourReports: "Sizning murojaatlaringiz",
      noReports: "Hali murojaat yubormagansiz."
    },
    stats: {
      ariaLabel: "Ochiq statistika",
      total: "Jami",
      verified: "Tasdiqlangan",
      resolved: "Hal qilingan",
      urgent: "Shoshilinch"
    },
    map: {
      title: "Ochiq xarita",
      addApiKey: ".env fayliga VITE_MAP_API_KEY=... qo'shing va ilovani qayta ishga tushiring.",
      mappedPoints: "{count} ta nuqta xaritada",
      geoAsrObject: "GEOASR obyekti",
      source: "Manba",
      approximateLocation: "Taxminiy joylashuv (hudud bo'yicha)",
      noCoordinates: "Filtrlangan ma'lumotlarda koordinatalar yo'q. Fuqarolar murojaatlarida lat,lng formatidan foydalaning."
    },
    common: {
      all: "Barchasi",
      allTime: "Barcha vaqt",
      today: "Bugun",
      last7Days: "So'nggi 7 kun",
      last30Days: "So'nggi 30 kun",
      reports: "Murojaatlar",
      telegramUser: "Telegram foydalanuvchisi",
      you: "Siz",
      pointsShort: "ball"
    },
    sources: {
      reports: "Murojaatlar",
      maktab44: "Maktablar",
      bogcha: "Bog'chalar",
      ssv: "Sog'liq"
    },
    categories: {
      "School infrastructure": "Maktab infratuzilmasi",
      "Clinic infrastructure": "Klinika infratuzilmasi",
      "Drinking water supply": "Ichimlik suvi ta'minoti",
      "Internal roads": "Ichki yo'llar",
      "Sanitation and waste": "Sanitariya va chiqindilar",
      "Street lighting": "Ko'cha yoritilishi",
      "Public safety": "Jamoat xavfsizligi",
      Other: "Boshqa"
    },
    statuses: {
      Submitted: "Qabul qilindi",
      "Under Review": "Ko'rib chiqilmoqda",
      Verified: "Tasdiqlangan",
      "In Progress": "Jarayonda",
      Resolved: "Hal qilingan"
    },
    ranks: {
      observer: "Kuzatuvchi",
      active: "Faol",
      guardian: "Qo'riqchi",
      leader: "Sarvar",
      legend: "Shahar afsonasi"
    },
    badges: {
      "road-guard": "Yo'l qo'riqchisi",
      "water-patrol": "Suv patruli",
      explorer: "Kashshof",
      "verified-hero": "Tasdiqlangan qahramon"
    }
  },
  ru: {
    languageSwitcher: {
      label: "Язык",
      ariaLabel: "Переключение языка"
    },
    nav: {
      submission: "Отправка",
      dashboard: "Панель",
      profile: "Профиль"
    },
    dashboard: {
      title: "Публичная панель",
      subtitle: "Одна живая карта для гражданских сообщений и официальных реестровых слоев.",
      searchPlaceholder: "Поиск по сообщениям, объекту или региону",
      apiEndpoint: "Источник API",
      status: "Статус",
      date: "Дата",
      sourceFilters: "Фильтры источников данных",
      noMatches: "Нет сообщений, подходящих под текущие фильтры.",
      loadingGeoAsr: "Загрузка слоев GEOASR...",
      topContributors: "Топ участников",
      contributorsSubtitle: "Участники сообщества с наибольшим количеством civic XP."
    },
    submission: {
      title: "Отправка сообщения",
      subtitle: "Сообщите о проблеме инфраструктуры за несколько шагов.",
      category: "Категория",
      media: "Фото / Видео",
      description: "Описание",
      descriptionPlaceholder: "Опишите проблему и почему она важна",
      placeName: "Название объекта / места",
      placeNamePlaceholder: "Школа №12 - туалетный блок A",
      location: "Локация",
      locationPlaceholder: "Используйте текущую геолокацию или введите адрес",
      uploadPreview: "Предпросмотр файла",
      geolocate: "Использовать текущую геолокацию",
      locating: "Определяем локацию...",
      submit: "Отправить сообщение",
      incompleteError: "Заполните категорию, фото, описание, локацию и название объекта.",
      geolocationUnsupported: "Геолокация не поддерживается. Введите адрес вручную.",
      geolocationUnavailable: "Не удалось получить текущую локацию. Введите адрес вручную.",
      success: "Сообщение отправлено. Получено +{xp} XP."
    },
    profile: {
      title: "Профиль",
      subtitle: "Ваша активность в гражданских сообщениях.",
      submittedReports: "Отправленные сообщения",
      reputation: "Репутация",
      currentRank: "Текущий ранг",
      streak: "Серия",
      streakUnit: "текущая серия",
      nextRankProgress: "До ранга {rank}: {count} XP",
      maxRankReached: "Вы достигли максимального ранга.",
      badges: "Значки",
      unlockedCount: "Открыто: {count}",
      unlocked: "Открыт",
      locked: "Закрыт",
      settings: "Настройки",
      settingsPlaceholder: "Настройки уведомлений и аккаунта можно добавить позже.",
      yourReports: "Ваши сообщения",
      noReports: "Вы еще не отправляли сообщения."
    },
    stats: {
      ariaLabel: "Публичная статистика",
      total: "Всего",
      verified: "Подтверждено",
      resolved: "Решено",
      urgent: "Срочно"
    },
    map: {
      title: "Публичная карта",
      addApiKey: "Добавьте VITE_MAP_API_KEY=... в .env и перезапустите приложение.",
      mappedPoints: "Точек на карте: {count}",
      geoAsrObject: "Объект GEOASR",
      source: "Источник",
      approximateLocation: "Примерная локация (по региону)",
      noCoordinates: "В отфильтрованных данных пока нет координат. Для сообщений граждан используйте формат lat,lng."
    },
    common: {
      all: "Все",
      allTime: "За все время",
      today: "Сегодня",
      last7Days: "Последние 7 дней",
      last30Days: "Последние 30 дней",
      reports: "Сообщения",
      telegramUser: "Пользователь Telegram",
      you: "Вы",
      pointsShort: "балл."
    },
    sources: {
      reports: "Сообщения",
      maktab44: "Школы",
      bogcha: "Детсады",
      ssv: "Здравоохранение"
    },
    categories: {
      "No soap": "Нет мыла",
      "No water": "Нет воды",
      "No paper": "Нет бумаги",
      "Broken toilet": "Сломанный туалет",
      "Broken sink": "Сломанная раковина",
      "Construction issue": "Проблема строительства",
      "Safety issue": "Проблема безопасности",
      Other: "Другое"
    },
    statuses: {
      New: "Новый",
      "Under Review": "На рассмотрении",
      Verified: "Подтверждено",
      Resolved: "Решено"
    },
    ranks: {
      observer: "Наблюдатель",
      active: "Активист",
      guardian: "Страж",
      leader: "Лидер",
      legend: "Легенда города"
    },
    badges: {
      "road-guard": "Страж дорог",
      "water-patrol": "Водный патруль",
      explorer: "Исследователь",
      "verified-hero": "Герой решений"
    }
  }
};
