export function formatDateTime(isoString, locale) {
  return new Date(isoString).toLocaleString(locale ? [locale] : [], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function getDateThreshold(filterValue) {
  const now = Date.now();
  if (filterValue === "today") {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date.getTime();
  }
  if (filterValue === "7d") {
    return now - 7 * 24 * 60 * 60 * 1000;
  }
  if (filterValue === "30d") {
    return now - 30 * 24 * 60 * 60 * 1000;
  }
  return null;
}

export function statusToTone(status) {
  switch (status) {
    case "Verified":
      return "verified";
    case "Resolved":
      return "resolved";
    case "Under Review":
      return "review";
    default:
      return "new";
  }
}

export function shortText(text, maxLength = 92) {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
}
