const COPY = {
  en: {
    genericIssue: "Infrastructure issue",
    near: "near",
    summaryFallback: "Issue reported by a citizen.",
    duplicateReason: "AI check unavailable, so no strong duplicate signal was found.",
    standardPriority: "Priority based on the current report details.",
    repeatedPrefix: "Elevated priority because this issue appears repeatedly",
    confirmationsSuffix: "and has multiple confirmations",
    essentialSchool: "near a school",
    essentialClinic: "near a clinic",
    essentialWater: "near drinking water infrastructure",
    essentialRoad: "on a public road",
    severe: "with higher public impact",
    aging: "and has been open for some time"
  },
  ru: {
    genericIssue: "Проблема инфраструктуры",
    near: "рядом с",
    summaryFallback: "О проблеме сообщил житель.",
    duplicateReason: "AI-проверка недоступна, поэтому явный дубликат не подтвержден.",
    standardPriority: "Приоритет определен по текущим данным обращения.",
    repeatedPrefix: "Повышенный приоритет, потому что проблема повторяется",
    confirmationsSuffix: "и получила несколько подтверждений",
    essentialSchool: "рядом со школой",
    essentialClinic: "рядом с клиникой",
    essentialWater: "рядом с объектом питьевой воды",
    essentialRoad: "на общественной дороге",
    severe: "с заметным влиянием на жителей",
    aging: "и остается открытой уже некоторое время"
  },
  uz: {
    genericIssue: "Infratuzilma muammosi",
    near: "yaqinida",
    summaryFallback: "Muammo fuqaro tomonidan yuborilgan.",
    duplicateReason: "AI tekshiruvi hozir mavjud emas, shuning uchun kuchli dublikat belgisi topilmadi.",
    standardPriority: "Ustuvorlik joriy murojaat ma'lumotlariga asoslandi.",
    repeatedPrefix: "Ustuvorlik oshirilgan, chunki bu muammo takrorlanmoqda",
    confirmationsSuffix: "va bir nechta tasdiqqa ega",
    essentialSchool: "maktab yaqinida",
    essentialClinic: "klinika yaqinida",
    essentialWater: "ichimlik suvi obyektiga yaqin",
    essentialRoad: "jamoat yo'lida",
    severe: "aholi uchun sezilarli ta'sir bilan",
    aging: "va anchadan beri ochiq turibdi"
  }
};

function pickLanguage(language) {
  return COPY[language] ? language : "en";
}

function cleanText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function clipText(value, maxLength) {
  const cleaned = cleanText(value);
  if (!cleaned) return "";
  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
}

function ensureSentence(value) {
  const cleaned = cleanText(value);
  if (!cleaned) return "";
  return /[.!?]$/.test(cleaned) ? cleaned : `${cleaned}.`;
}

function getLinkedObjectLabel(linkedObject) {
  if (!linkedObject) return "";
  if (typeof linkedObject === "string") return cleanText(linkedObject);

  return cleanText(
    linkedObject.name ||
      linkedObject.label ||
      linkedObject.placeName ||
      linkedObject.title ||
      linkedObject.objectName ||
      linkedObject.type ||
      ""
  );
}

function normalizeObjectType(linkedObjectType) {
  const value = cleanText(linkedObjectType).toLowerCase();
  if (!value) return "";
  if (value.includes("school") || value.includes("maktab")) return "school";
  if (value.includes("clinic") || value.includes("health") || value.includes("hospital") || value.includes("ssv")) {
    return "clinic";
  }
  if (value.includes("water")) return "water";
  if (value.includes("road")) return "road";
  return value;
}

function describeEssentialType(copy, linkedObjectType) {
  switch (normalizeObjectType(linkedObjectType)) {
    case "school":
      return copy.essentialSchool;
    case "clinic":
      return copy.essentialClinic;
    case "water":
      return copy.essentialWater;
    case "road":
      return copy.essentialRoad;
    default:
      return "";
  }
}

export function buildFallbackDuplicateResult(input = {}) {
  const language = pickLanguage(input.language);
  const copy = COPY[language];

  return {
    isDuplicate: false,
    matchedIssueId: null,
    confidence: 0.18,
    reason: copy.duplicateReason,
    suggestedAction: "create_new",
    fallbackUsed: true
  };
}

export function buildFallbackTitleSummary(input = {}) {
  const language = pickLanguage(input.language);
  const copy = COPY[language];
  const category = clipText(input.category || copy.genericIssue, 42) || copy.genericIssue;
  const linkedObjectLabel = clipText(getLinkedObjectLabel(input.linkedObject), 28);
  const aiTitle = clipText(
    linkedObjectLabel ? `${category} ${copy.near} ${linkedObjectLabel}` : category,
    64
  );

  const baseSummary = clipText(input.description || copy.summaryFallback, 110) || copy.summaryFallback;

  return {
    aiTitle,
    summary: ensureSentence(baseSummary),
    fallbackUsed: true
  };
}

export function buildFallbackPriorityExplanation(input = {}) {
  const language = pickLanguage(input.language);
  const copy = COPY[language];
  const repeatedIssueCount = Number(input.repeatedIssueCount) || 0;
  const confirmationsCount = Number(input.confirmationsCount) || 0;
  const statusAgeHours = Number(input.statusAgeHours) || 0;
  const severe = ["high", "critical"].includes(String(input.severity || "").toLowerCase());
  const essentialType = describeEssentialType(copy, input.linkedObjectType);

  if (!repeatedIssueCount && !confirmationsCount && !statusAgeHours && !severe && !essentialType) {
    return {
      priorityExplanation: copy.standardPriority,
      fallbackUsed: true
    };
  }

  const parts = [copy.repeatedPrefix];

  if (essentialType) {
    parts.push(essentialType);
  }

  if (confirmationsCount > 1) {
    parts.push(copy.confirmationsSuffix);
  } else if (severe) {
    parts.push(copy.severe);
  } else if (statusAgeHours >= 72) {
    parts.push(copy.aging);
  }

  return {
    priorityExplanation: ensureSentence(clipText(parts.join(" "), 120)),
    fallbackUsed: true
  };
}
