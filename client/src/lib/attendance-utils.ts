// Helper functions for attendance analysis
export const getWeekNumber = (d: Date): number => {
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
  status?: AbsenceStatus;
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

// Hilfsfunktionen für die Statusprüfung
const isEntschuldigt = (status: AbsenceStatus): boolean =>
  ['entsch.', 'Attest', 'Attest Amtsarzt'].includes(status);

const isUnentschuldigt = (status: AbsenceStatus): boolean =>
  ['nicht entsch.', 'nicht akzep.'].includes(status);

const isUnentschuldigtOrOverdue = (entry: AbsenceEntry, today: Date): boolean => {
  const status = entry.status || '';
  if (isUnentschuldigt(status)) return true;

  // Wenn kein Status vorhanden ist, prüfe ob die 7-Tage-Frist überschritten wurde
  if (!status) {
    const date = new Date(entry.datum);
    const deadlineDate = new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000);
    return today > deadlineDate;
  }

  return false;
};

const isVerspaetung = (entry: AbsenceEntry): boolean => entry.art === 'Verspätung';