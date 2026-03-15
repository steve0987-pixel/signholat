import { parseReportLatLng } from "./enrichReport";

function normalizeText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9а-яёўқғҳ\s-]/gi, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 72);
}

export function inferObjectTypeFromReport(report = {}) {
  const text = `${report.category || ""} ${report.placeName || ""}`.toLowerCase();

  if (text.includes("school") || text.includes("maktab")) return "school";
  if (text.includes("clinic") || text.includes("hospital") || text.includes("health") || text.includes("ssv")) {
    return "clinic";
  }
  if (text.includes("water") || text.includes("suv")) return "water";
  if (text.includes("road") || text.includes("street") || text.includes("yo'l")) return "road";

  return "public-object";
}

export function getObjectKeyFromReport(report = {}) {
  const explicitName = normalizeText(report.placeName);
  const objectType = inferObjectTypeFromReport(report);

  if (explicitName) {
    return `${objectType}:${slugify(explicitName) || "object"}`;
  }

  const coords = parseReportLatLng(report.location);
  if (coords) {
    return `${objectType}:${coords.lat.toFixed(4)},${coords.lng.toFixed(4)}`;
  }

  return `${objectType}:${slugify(report.category || report.id || "object")}`;
}

function getObjectDisplayName(report = {}) {
  const placeName = normalizeText(report.placeName);
  if (placeName) return placeName;

  const coords = parseReportLatLng(report.location);
  if (coords) return `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`;

  return normalizeText(report.category) || "Public object";
}

export function buildObjectIndex(reports = []) {
  const objects = {};

  reports.forEach((report) => {
    if (!report || !report.id) return;

    const key = getObjectKeyFromReport(report);
    if (!objects[key]) {
      objects[key] = {
        key,
        name: getObjectDisplayName(report),
        objectType: inferObjectTypeFromReport(report),
        reports: [],
        latestLocation: report.location || "",
        unresolvedCount: 0,
        repeatedIssueCount: 0
      };
    }

    objects[key].reports.push(report);
    objects[key].latestLocation = objects[key].latestLocation || report.location || "";
  });

  Object.values(objects).forEach((object) => {
    const reportCountByCategory = object.reports.reduce((acc, report) => {
      const key = String(report.category || "other").toLowerCase();
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    object.unresolvedCount = object.reports.filter((report) => report.status !== "Resolved").length;
    object.repeatedIssueCount = Object.values(reportCountByCategory).reduce((total, count) => {
      return count > 1 ? total + 1 : total;
    }, 0);
    object.reports.sort((left, right) => {
      return new Date(right.createdAt || right.submittedAt || 0).getTime() -
        new Date(left.createdAt || left.submittedAt || 0).getTime();
    });
  });

  return objects;
}
