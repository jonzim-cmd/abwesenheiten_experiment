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
};

// Helper function to get last N weeks
export const getLastNWeeks = (n: number): Week[] => {
  const today = new Date();
  const currentWeek = getWeekNumber(today);
  const currentYear = today.getFullYear();
  
  const weeks: Week[] = [];
  let weekCounter = n;
  let currentWeekNum = currentWeek;
  let year = currentYear;
  
  while (weekCounter > 0) {
    if (currentWeekNum < 1) {
      year--;
      currentWeekNum = getWeekNumber(new Date(year, 11, 31));
    }
    weeks.unshift({ week: currentWeekNum, year });
    currentWeekNum--;
    weekCounter--;
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
