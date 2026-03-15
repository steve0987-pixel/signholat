export const STATUS_FLOW = ["Submitted", "Under Review", "Verified", "In Progress", "Resolved"];

const LEGACY_STATUS_MAP = {
  New: "Submitted",
  Submitted: "Submitted",
  "Under Review": "Under Review",
  Verified: "Verified",
  "In Progress": "In Progress",
  Resolved: "Resolved"
};

export function normalizeStatus(value) {
  const normalized = LEGACY_STATUS_MAP[String(value || "").trim()];
  return normalized || "Submitted";
}

export function getNextStatus(currentStatus) {
  const normalized = normalizeStatus(currentStatus);
  const index = STATUS_FLOW.indexOf(normalized);
  if (index === -1 || index >= STATUS_FLOW.length - 1) return null;
  return STATUS_FLOW[index + 1];
}
