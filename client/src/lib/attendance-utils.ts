// Helper functions for attendance analysis
export const getWeekNumber = (d: Date | string): number => {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 4 - (date.getDay() || 7));
  const yearStart = new Date(date.getFullYear(), 0, 1);
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

export interface Week {
  week: number;
  year: number;
  startDate: Date;
  endDate: Date;
}

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
    // Berechne Start- und Enddatum für diese Woche
    const startDate = new Date(year, 0, 1);
    startDate.setDate(1 + (currentWeekNum - 1) * 7 - startDate.getDay() + 1);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);

    weeks.unshift({ week: currentWeekNum, year, startDate, endDate });
    currentWeekNum--;
    weekCounter--;
  }

  return weeks;
};

export interface SchoolYear {
  start: number;
  end: number;
}

export const getCurrentSchoolYear = (): SchoolYear => {
  const today = new Date();
  const currentYear = today.getFullYear();
  const septemberFirst = new Date(currentYear, 8, 1);

  return today >= septemberFirst
    ? { start: currentYear, end: currentYear + 1 }
    : { start: currentYear - 1, end: currentYear };
};

export type AbsenceStatus = 
  | 'entsch.' 
  | 'Attest' 
  | 'Attest Amtsarzt'
  | 'nicht entsch.'
  | 'nicht akzep.'
  | '';

export type AbsenceType = 'Verspätung' | 'Fehltag' | string;

export interface AbsenceEntry {
  datum: Date;
  art: AbsenceType;
  beginnZeit?: string;
  endZeit?: string;
  grund?: string;
  status: AbsenceStatus;
}

export interface StudentStats {
  verspaetungen_entsch: number;
  verspaetungen_unentsch: number;
  verspaetungen_offen: number;
  fehlzeiten_entsch: number;
  fehlzeiten_unentsch: number;
  fehlzeiten_offen: number;
  klasse: string;
}

export const isEntschuldigt = (status: AbsenceStatus): boolean => 
  ['entsch.', 'Attest', 'Attest Amtsarzt'].includes(status);

export const isUnentschuldigt = (status: AbsenceStatus): boolean => 
  ['nicht entsch.', 'nicht akzep.'].includes(status);

export const isOffen = (status: AbsenceStatus): boolean => 
  !status || (!isEntschuldigt(status) && !isUnentschuldigt(status));