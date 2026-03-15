const LAST_SUBMIT_DATE_KEY = "real-holat:last-submit-date";
const STREAK_COUNT_KEY = "real-holat:streak-count";

function getStorage() {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseDateKey(value) {
  if (!value) return null;

  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;

  return new Date(year, month - 1, day);
}

function getDayDifference(previousDate, currentDate) {
  const previous = new Date(previousDate.getFullYear(), previousDate.getMonth(), previousDate.getDate()).getTime();
  const current = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()).getTime();

  return Math.round((current - previous) / (1000 * 60 * 60 * 24));
}

export function getStreak() {
  const storage = getStorage();
  if (!storage) {
    return { lastSubmitDate: "", streakCount: 0 };
  }

  const lastSubmitDate = storage.getItem(LAST_SUBMIT_DATE_KEY) || "";
  const streakCount = Number.parseInt(storage.getItem(STREAK_COUNT_KEY) || "0", 10);

  return {
    lastSubmitDate,
    streakCount: Number.isFinite(streakCount) ? streakCount : 0
  };
}

export function updateStreak() {
  const storage = getStorage();
  if (!storage) return 0;

  const today = new Date();
  const todayKey = formatDateKey(today);
  const { lastSubmitDate, streakCount } = getStreak();
  const previousDate = parseDateKey(lastSubmitDate);

  let nextStreak = 1;

  if (previousDate) {
    const dayDifference = getDayDifference(previousDate, today);

    if (dayDifference === 0 || dayDifference === 1) {
      nextStreak = Math.max(streakCount, 0) + 1;
    } else if (dayDifference < 0) {
      nextStreak = Math.max(streakCount, 1);
    }
  }

  storage.setItem(LAST_SUBMIT_DATE_KEY, todayKey);
  storage.setItem(STREAK_COUNT_KEY, `${nextStreak}`);

  return nextStreak;
}
