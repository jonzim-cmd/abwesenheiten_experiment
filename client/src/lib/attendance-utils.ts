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

export interface FilterCriteria {
  startDate: Date;
  endDate: Date;
  type: string;
  weekData?: number[];
  selectedWeeks?: string;
}

export const filterAbsenceEntries = (
  entries: AbsenceEntry[],
  criteria: FilterCriteria
): AbsenceEntry[] => {
  if (!entries || entries.length === 0) return [];

  const { startDate, endDate, type, weekData, selectedWeeks } = criteria;

  // Hilfsfunktion für Datumsprüfung
  const isInDateRange = (date: Date) => {
    const dateObj = new Date(date);
    return dateObj >= startDate && dateObj <= endDate;
  };

  // Hilfsfunktion für Verspätungsprüfung
  const isVerspaetung = (entry: AbsenceEntry) => entry.art === 'Verspätung';

  // 1. Details Button
  if (type === 'details') {
    return entries.filter(entry => {
      const date = new Date(entry.datum);
      return isInDateRange(date) && isUnentschuldigt(entry.status);
    });
  }

  // 2. E/U/O Spalten
  const statusMatch = type.match(/^(verspaetungen|fehlzeiten)_(entsch|unentsch|offen)$/);
  if (statusMatch) {
    const [_, category, status] = statusMatch;
    return entries.filter(entry => {
      const date = new Date(entry.datum);
      if (!isInDateRange(date)) return false;

      // Prüfe ob Verspätung oder Fehlzeit
      if (category === 'verspaetungen' && !isVerspaetung(entry)) return false;
      if (category === 'fehlzeiten' && isVerspaetung(entry)) return false;

      // Prüfe den Status
      switch (status) {
        case 'entsch': return isEntschuldigt(entry.status);
        case 'unentsch': return isUnentschuldigt(entry.status);
        case 'offen': return isOffen(entry.status);
        default: return false;
      }
    });
  }

  // 3. Schuljahresstatistik
  if (type === 'sj_verspaetungen' || type === 'sj_fehlzeiten') {
    const { start: schoolYearStart } = getCurrentSchoolYear();
    const yearStart = new Date(schoolYearStart, 8, 1); // 1. September

    return entries.filter(entry => {
      if (!isUnentschuldigt(entry.status)) return false;

      const date = new Date(entry.datum);
      if (date < yearStart || date > new Date()) return false;

      const isVerspaetungenFilter = type === 'sj_verspaetungen';
      return isVerspaetungenFilter === isVerspaetung(entry);
    });
  }

  // 4. Wochenstatistik
  if (weekData && selectedWeeks && type.match(/^(weekly|sum)_(verspaetungen|fehlzeiten)$/)) {
    const weeks = getLastNWeeks(parseInt(selectedWeeks));
    const isVerspaetungenFilter = type.includes('verspaetungen');

    return entries.filter(entry => {
      if (!isUnentschuldigt(entry.status)) return false;

      if (isVerspaetungenFilter !== isVerspaetung(entry)) return false;

      const date = new Date(entry.datum);
      const weekIndex = weeks.findIndex(week => 
        date >= week.startDate && date <= week.endDate
      );

      return weekIndex !== -1 && weekData[weekIndex] > 0;
    });
  }

  return [];
};