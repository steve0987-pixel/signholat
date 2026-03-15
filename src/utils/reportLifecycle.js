import { STATUS_FLOW, normalizeStatus } from "../constants/statusLifecycle";

function stringifyId(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function clipText(value, maxLength = 220) {
  const cleaned = String(value || "")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, Math.max(0, maxLength - 1)).trim()}...`;
}

export function createStatusEvent({ reportId, status, note = "", changedBy = "", createdAt, id } = {}) {
  return {
    id: stringifyId(id || `status-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    reportId: stringifyId(reportId),
    status: normalizeStatus(status),
    note: clipText(note),
    changedBy: stringifyId(changedBy),
    createdAt: String(createdAt || new Date().toISOString())
  };
}

export function getStatusStageIndex(status) {
  const index = STATUS_FLOW.indexOf(normalizeStatus(status));
  return index === -1 ? 0 : index;
}

export function buildSyntheticStatusHistory(report = {}) {
  const reportId = stringifyId(report.id);
  if (!reportId) return [];

  const finalStatus = normalizeStatus(report.status);
  const finalIndex = getStatusStageIndex(finalStatus);
  const createdAt = new Date(report.createdAt || report.submittedAt || Date.now()).getTime();

  return STATUS_FLOW.slice(0, finalIndex + 1).map((status, index) => {
    return createStatusEvent({
      reportId,
      status,
      createdAt: new Date(createdAt + index * 60 * 60 * 1000).toISOString(),
      note: index === 0 ? "Initial submission event" : ""
    });
  });
}

export function mergeStatusHistoryMaps(baseMap = {}, incomingMap = {}) {
  const merged = { ...baseMap };

  Object.entries(incomingMap || {}).forEach(([reportId, events]) => {
    const reportKey = stringifyId(reportId);
    if (!reportKey) return;

    const current = Array.isArray(merged[reportKey]) ? [...merged[reportKey]] : [];
    const nextEvents = Array.isArray(events) ? events : [];

    nextEvents.forEach((event) => {
      const normalized = createStatusEvent({ ...event, reportId: reportKey });
      const duplicate = current.some((entry) => {
        return (
          (entry.id && normalized.id && entry.id === normalized.id) ||
          (entry.status === normalized.status && String(entry.createdAt) === String(normalized.createdAt))
        );
      });

      if (!duplicate) {
        current.push(normalized);
      }
    });

    current.sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());
    merged[reportKey] = current;
  });

  return merged;
}

export function appendStatusHistoryEvent(historyMap = {}, reportId, event) {
  const reportKey = stringifyId(reportId);
  if (!reportKey || !event) return historyMap || {};

  const existing = Array.isArray(historyMap[reportKey]) ? historyMap[reportKey] : [];
  const normalized = createStatusEvent({ ...event, reportId: reportKey });

  return mergeStatusHistoryMaps(historyMap, {
    [reportKey]: [...existing, normalized]
  });
}
