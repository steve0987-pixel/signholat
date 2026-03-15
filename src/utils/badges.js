const ROAD_CATEGORY_PATTERN = /(construction|safety|road|street|manhole|pothole)/i;
const WATER_CATEGORY_PATTERN = /(water|sink)/i;

export function computeBadges(reports = [], userId) {
  const userReports =
    userId === undefined || userId === null ? reports : reports.filter((report) => report.userId === userId);

  const roadReports = userReports.filter((report) => ROAD_CATEGORY_PATTERN.test(report.category || ""));
  const waterReports = userReports.filter((report) => WATER_CATEGORY_PATTERN.test(report.category || ""));
  const resolvedReports = userReports.filter((report) => report.status === "Resolved");

  return [
    { id: "road-guard", name: "Road Guard", unlocked: roadReports.length >= 3 },
    { id: "water-patrol", name: "Water Patrol", unlocked: waterReports.length >= 3 },
    { id: "explorer", name: "Explorer", unlocked: userReports.length >= 1 },
    { id: "verified-hero", name: "Verified Hero", unlocked: resolvedReports.length >= 1 }
  ];
}
