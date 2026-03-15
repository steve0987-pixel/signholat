import { calculateDistanceMeters, parseReportLatLng } from "./enrichReport";

export const PARTICIPATION_STORAGE_KEY = "real-holat:participation:v1";

function stringifyUserId(userId) {
  if (userId === null || userId === undefined) return "";
  return String(userId).trim();
}

function clipText(value, maxLength = 220) {
  const cleaned = String(value || "")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, Math.max(0, maxLength - 1)).trim()}...`;
}

function normalizeConfirmations(rawEntries = []) {
  if (!Array.isArray(rawEntries)) return [];

  const uniqueByUser = new Map();

  rawEntries.forEach((entry) => {
    const userId = stringifyUserId(typeof entry === "object" ? entry?.userId : entry);
    if (!userId || uniqueByUser.has(userId)) return;

    const createdAt =
      typeof entry === "object" && entry?.createdAt ? String(entry.createdAt) : new Date().toISOString();

    uniqueByUser.set(userId, { userId, createdAt });
  });

  return [...uniqueByUser.values()];
}

function normalizeEvidence(rawEntries = []) {
  if (!Array.isArray(rawEntries)) return [];

  return rawEntries
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;

      const userId = stringifyUserId(entry.userId);
      const note = clipText(entry.note || "");
      if (!userId || !note) return null;

      return {
        id: String(entry.id || `ev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
        userId,
        note,
        createdAt: entry.createdAt ? String(entry.createdAt) : new Date().toISOString()
      };
    })
    .filter(Boolean);
}

export function createEmptyParticipationState() {
  return {
    version: 1,
    confirmationsByReport: {},
    evidenceByReport: {}
  };
}

export function loadParticipationState() {
  if (typeof window === "undefined") return createEmptyParticipationState();

  try {
    const stored = window.localStorage.getItem(PARTICIPATION_STORAGE_KEY);
    if (!stored) return createEmptyParticipationState();

    const parsed = JSON.parse(stored);
    if (!parsed || typeof parsed !== "object") return createEmptyParticipationState();

    const confirmationsByReport = Object.entries(parsed.confirmationsByReport || {}).reduce((acc, [reportId, entries]) => {
      acc[String(reportId)] = normalizeConfirmations(entries);
      return acc;
    }, {});

    const evidenceByReport = Object.entries(parsed.evidenceByReport || {}).reduce((acc, [reportId, entries]) => {
      acc[String(reportId)] = normalizeEvidence(entries);
      return acc;
    }, {});

    return {
      version: 1,
      confirmationsByReport,
      evidenceByReport
    };
  } catch {
    return createEmptyParticipationState();
  }
}

export function saveParticipationState(state) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(PARTICIPATION_STORAGE_KEY, JSON.stringify(state || createEmptyParticipationState()));
  } catch {
    // Ignore storage failures in low-storage or private mode.
  }
}

function getConfirmationsForReport(state, reportId) {
  const reportKey = String(reportId || "");
  return normalizeConfirmations(state?.confirmationsByReport?.[reportKey] || []);
}

function getEvidenceForReport(state, reportId) {
  const reportKey = String(reportId || "");
  return normalizeEvidence(state?.evidenceByReport?.[reportKey] || []);
}

export function hasUserConfirmedReport(state, reportId, userId) {
  const normalizedUserId = stringifyUserId(userId);
  if (!normalizedUserId) return false;

  return getConfirmationsForReport(state, reportId).some((entry) => entry.userId === normalizedUserId);
}

export function addReportConfirmation(state, { reportId, userId, createdAt = new Date().toISOString() } = {}) {
  const reportKey = String(reportId || "");
  const normalizedUserId = stringifyUserId(userId);
  if (!reportKey || !normalizedUserId) {
    return { state: state || createEmptyParticipationState(), added: false };
  }

  const currentState = state || createEmptyParticipationState();
  const currentEntries = getConfirmationsForReport(currentState, reportKey);
  if (currentEntries.some((entry) => entry.userId === normalizedUserId)) {
    return { state: currentState, added: false };
  }

  const nextEntries = [...currentEntries, { userId: normalizedUserId, createdAt: String(createdAt) }];
  const nextState = {
    ...currentState,
    confirmationsByReport: {
      ...currentState.confirmationsByReport,
      [reportKey]: nextEntries
    }
  };

  return { state: nextState, added: true };
}

export function addReportEvidence(state, { reportId, userId, note, createdAt = new Date().toISOString() } = {}) {
  const reportKey = String(reportId || "");
  const normalizedUserId = stringifyUserId(userId);
  const cleanedNote = clipText(note, 240);

  if (!reportKey || !normalizedUserId || cleanedNote.length < 8) {
    return { state: state || createEmptyParticipationState(), added: false, evidence: null };
  }

  const currentState = state || createEmptyParticipationState();
  const currentEntries = getEvidenceForReport(currentState, reportKey);
  const evidence = {
    id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    userId: normalizedUserId,
    note: cleanedNote,
    createdAt: String(createdAt)
  };

  const nextEntries = [...currentEntries, evidence];
  const nextState = {
    ...currentState,
    evidenceByReport: {
      ...currentState.evidenceByReport,
      [reportKey]: nextEntries
    }
  };

  return { state: nextState, added: true, evidence };
}

export function getReportParticipation(state, reportId, userId) {
  const confirmations = getConfirmationsForReport(state, reportId);
  const evidenceItems = getEvidenceForReport(state, reportId);
  const normalizedUserId = stringifyUserId(userId);

  return {
    confirmationsCount: confirmations.length,
    evidenceCount: evidenceItems.length,
    hasConfirmed: normalizedUserId ? confirmations.some((entry) => entry.userId === normalizedUserId) : false,
    userEvidenceCount: normalizedUserId
      ? evidenceItems.filter((entry) => entry.userId === normalizedUserId).length
      : 0,
    latestEvidence: evidenceItems.length ? evidenceItems[evidenceItems.length - 1] : null
  };
}

function buildWeekWindow(referenceDate = new Date()) {
  const start = new Date(referenceDate);
  const weekday = start.getDay();
  const shift = weekday === 0 ? 6 : weekday - 1;
  start.setDate(start.getDate() - shift);
  start.setHours(0, 0, 0, 0);
  return start.getTime();
}

function isInCurrentWeek(isoDate, weekStart) {
  const timestamp = new Date(isoDate || 0).getTime();
  return Number.isFinite(timestamp) && timestamp >= weekStart;
}

export function getUserParticipationStats(state, userId, repeatedReportIds = new Set()) {
  const normalizedUserId = stringifyUserId(userId);
  const empty = {
    confirmationsTotal: 0,
    evidenceTotal: 0,
    confirmationsThisWeek: 0,
    evidenceThisWeek: 0,
    repeatedParticipationsTotal: 0,
    repeatedParticipationsThisWeek: 0
  };

  if (!normalizedUserId) return empty;

  const weekStart = buildWeekWindow();
  let confirmationsTotal = 0;
  let confirmationsThisWeek = 0;
  let evidenceTotal = 0;
  let evidenceThisWeek = 0;
  let repeatedParticipationsTotal = 0;
  let repeatedParticipationsThisWeek = 0;

  Object.entries(state?.confirmationsByReport || {}).forEach(([reportId, entries]) => {
    const normalizedEntries = normalizeConfirmations(entries);
    normalizedEntries.forEach((entry) => {
      if (entry.userId !== normalizedUserId) return;

      confirmationsTotal += 1;
      const currentWeek = isInCurrentWeek(entry.createdAt, weekStart);
      if (currentWeek) confirmationsThisWeek += 1;

      if (repeatedReportIds.has(String(reportId))) {
        repeatedParticipationsTotal += 1;
        if (currentWeek) repeatedParticipationsThisWeek += 1;
      }
    });
  });

  Object.entries(state?.evidenceByReport || {}).forEach(([reportId, entries]) => {
    const normalizedEntries = normalizeEvidence(entries);
    normalizedEntries.forEach((entry) => {
      if (entry.userId !== normalizedUserId) return;

      evidenceTotal += 1;
      const currentWeek = isInCurrentWeek(entry.createdAt, weekStart);
      if (currentWeek) evidenceThisWeek += 1;

      if (repeatedReportIds.has(String(reportId))) {
        repeatedParticipationsTotal += 1;
        if (currentWeek) repeatedParticipationsThisWeek += 1;
      }
    });
  });

  return {
    confirmationsTotal,
    evidenceTotal,
    confirmationsThisWeek,
    evidenceThisWeek,
    repeatedParticipationsTotal,
    repeatedParticipationsThisWeek
  };
}

export function getRepeatedReportIdSet(reports = [], radiusMeters = 400) {
  const repeated = new Set();

  for (let leftIndex = 0; leftIndex < reports.length; leftIndex += 1) {
    const left = reports[leftIndex];
    if (!left?.id) continue;

    const leftCoords = parseReportLatLng(left.location);
    const leftPlace = String(left.placeName || "").trim().toLowerCase();

    for (let rightIndex = leftIndex + 1; rightIndex < reports.length; rightIndex += 1) {
      const right = reports[rightIndex];
      if (!right?.id) continue;
      if (left.category !== right.category) continue;

      const rightCoords = parseReportLatLng(right.location);
      let isMatch = false;

      if (leftCoords && rightCoords) {
        const distance = calculateDistanceMeters(leftCoords.lat, leftCoords.lng, rightCoords.lat, rightCoords.lng);
        isMatch = distance <= radiusMeters;
      } else if (leftPlace) {
        isMatch = leftPlace === String(right.placeName || "").trim().toLowerCase();
      }

      if (isMatch) {
        repeated.add(String(left.id));
        repeated.add(String(right.id));
      }
    }
  }

  return repeated;
}
