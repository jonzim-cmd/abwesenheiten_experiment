// Helper function to get week number from date
export const getWeekNumber = (d: Date): number => {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 4 - (date.getDay() || 7));
  const yearStart = new Date(date.getFullYear(), 0, 1);
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

type Week = {
  week: number;
  year: number;
  startDate: Date;
  endDate: Date;
};

// Helper function to get last N complete weeks (Mon-Fri)
export const getLastNWeeks = (n: number): Week[] => {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

  // Find the last completed Friday
  let lastFriday = new Date(today);
  lastFriday.setHours(23, 59, 59, 999);

  // Adjustiere auf den letzten abgeschlossenen Freitag
  if (dayOfWeek === 0) { // Sonntag
    lastFriday.setDate(lastFriday.getDate() - 2);
  } else if (dayOfWeek === 6) { // Samstag
    lastFriday.setDate(lastFriday.getDate() - 1);
  } else { // Montag bis Freitag
    lastFriday.setDate(lastFriday.getDate() - (dayOfWeek + 2));
  }

  const weeks: Week[] = [];

  // Gehe n Wochen zurück
  for (let i = 0; i < n; i++) {
    // Berechne Freitag der aktuellen Woche
    const friday = new Date(lastFriday);
    friday.setDate(lastFriday.getDate() - (7 * i));
    friday.setHours(23, 59, 59, 999);

    // Berechne Montag derselben Woche (4 Tage vor Freitag)
    const monday = new Date(friday);
    monday.setDate(friday.getDate() - 4);
    monday.setHours(0, 0, 0, 0);

    weeks.unshift({
      week: getWeekNumber(monday),
      year: monday.getFullYear(),
      startDate: monday,
      endDate: friday
    });
  }

  return weeks;
};

// Helper function to get current school year
export const getCurrentSchoolYear = () => {
  const today = new Date();
  const currentYear = today.getFullYear();
  const septemberFirst = new Date(currentYear, 8, 1);

  return today >= septemberFirst
    ? { start: currentYear, end: currentYear + 1 }
    : { start: currentYear - 1, end: currentYear };
};