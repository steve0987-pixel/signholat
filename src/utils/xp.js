const COORDINATE_PATTERN = /^-?\d+\.\d+,\s*-?\d+\.\d+$/;

export function calculateXP(report = {}) {
  let xp = 10;

  if (report.media?.length > 0) xp += 15;
  if ((report.description || "").length > 50) xp += 5;
  if (COORDINATE_PATTERN.test((report.location || "").trim())) xp += 8;
  if (report.category !== null && report.category !== undefined) xp += 3;

  return xp;
}
