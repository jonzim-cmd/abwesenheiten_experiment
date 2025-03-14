import React, { useState, useRef, useCallback } from 'react';
import Papa from 'papaparse';
import _ from 'lodash';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import NormalView from '@/components/attendance/NormalView';
import ReportView from '@/components/attendance/ReportView';
import { ClassFilter } from './ClassFilter';
import { getWeekNumber, getLastNWeeks, getCurrentSchoolYear } from '@/lib/attendance';
import * as XLSX from 'xlsx';
import ExportButtons from '@/components/attendance/ExportButtons';

interface AbsenceEntry {
  datum: Date;
  art: string;
  beginnZeit?: string;
  endZeit?: string;
  grund?: string;
  status: AbsenceStatus;
}

type AbsenceStatus = 'entsch.' | 'nicht entsch.' | 'nicht akzep.' | 'Attest' | 'Attest Amtsarzt' | '';

interface DetailedStats {
  verspaetungen_entsch: AbsenceEntry[];
  verspaetungen_unentsch: AbsenceEntry[];
  verspaetungen_offen: AbsenceEntry[];
  fehlzeiten_entsch: AbsenceEntry[];
  fehlzeiten_unentsch: AbsenceEntry[];
  fehlzeiten_offen: AbsenceEntry[];
}

// Hilfsfunktion: Wandelt eine Zeitangabe (z. B. "16:50") in Minuten um
const parseTimeToMinutes = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

// Angepasste Funktion zur Erkennung von Verspätung ausschließlich basierend auf Abwesenheitsgrund und Endzeit
const isVerspaetungFunc = (row: any): boolean => {
  // Nutze ausschließlich Abwesenheitsgrund zur Klassifizierung
  const absenceReason = row.Abwesenheitsgrund ? row.Abwesenheitsgrund.trim() : '';
  const isTardyByReason = absenceReason === 'Verspätung';
  
  // Falls kein Abwesenheitsgrund vorliegt, dann prüfe die Endzeit
  const expectedMinutes = parseTimeToMinutes('16:50');
  const isTardyByEndzeit =
    (!absenceReason || absenceReason === '') &&
    row.Endzeit &&
    parseTimeToMinutes(row.Endzeit) < expectedMinutes;
  
  return isTardyByReason || isTardyByEndzeit;
};

const AttendanceAnalyzer = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rawData, setRawData] = useState<any>(null);
  const [results, setResults] = useState<any>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [detailedData, setDetailedData] = useState<Record<string, DetailedStats>>({});
  const [schoolYearDetailedData, setSchoolYearDetailedData] = useState<Record<string, any>>({});
  const [filterUnexcusedLate, setFilterUnexcusedLate] = useState(false);
  const [filterUnexcusedAbsent, setFilterUnexcusedAbsent] = useState(false);
  const [minUnexcusedLates, setMinUnexcusedLates] = useState('');
  const [minUnexcusedAbsences, setMinUnexcusedAbsences] = useState('');
  const [isReportView, setIsReportView] = useState(false);
  const [availableStudents, setAvailableStudents] = useState<string[]>([]);
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [selectedWeeks, setSelectedWeeks] = useState('4');
  const [schoolYearStats, setSchoolYearStats] = useState<any>({});
  const [weeklyStats, setWeeklyStats] = useState<any>({});
  const [weeklyDetailedData, setWeeklyDetailedData] = useState<Record<string, DetailedStats>>({});
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set());
  const [activeFilters, setActiveFilters] = useState<Map<string, string>>(new Map());

  const resetAll = () => {
    setRawData(null);
    setResults(null);
    setStartDate('');
    setEndDate('');
    setSearchQuery('');
    setError('');
    setDetailedData({});
    setSchoolYearDetailedData({});
    setFilterUnexcusedLate(false);
    setFilterUnexcusedAbsent(false);
    setMinUnexcusedLates('');
    setMinUnexcusedAbsences('');
    setIsReportView(false);
    setAvailableStudents([]);
    setAvailableClasses([]);
    setSelectedClasses([]);
    setSelectedWeeks('4');
    setSchoolYearStats({});
    setWeeklyStats({});
    setWeeklyDetailedData({});
    setExpandedStudents(new Set());
    setActiveFilters(new Map());
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const calculateSchoolYearStats = useCallback((data: any[]) => {
    const schoolYear = getCurrentSchoolYear();
    const sjStartDate = new Date(schoolYear.start + '-09-01T00:00:00');
    const sjEndDate = new Date(schoolYear.end + '-07-31T23:59:59');
    const today = new Date();

    const stats: Record<string, { verspaetungen_unentsch: number; fehlzeiten_unentsch: number; fehlzeiten_gesamt: number }> = {};

    data.forEach(row => {
      if (!row.Beginndatum || !row.Langname || !row.Vorname) return;
      if (row['Text/Grund']?.toLowerCase().includes('fehleintrag')) return;

      const [day, month, year] = row.Beginndatum.split('.');
      const date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T12:00:00`);
      const studentName = `${row.Langname}, ${row.Vorname}`;

      if (!stats[studentName]) {
        stats[studentName] = {
          verspaetungen_unentsch: 0,
          fehlzeiten_unentsch: 0,
          fehlzeiten_gesamt: 0
        };
      }

      const effectiveStatus = row.Status ? row.Status.trim() : '';
      const isVerspaetung = isVerspaetungFunc(row);

      if (date >= sjStartDate && date <= sjEndDate) {
        if (!isVerspaetung) {
          // Fehlzeiten: immer zur Gesamtzahl hinzufügen
          stats[studentName].fehlzeiten_gesamt++;
          const isUnentschuldigt = effectiveStatus === 'nicht entsch.' || effectiveStatus === 'nicht akzep.';
          const deadlineDate = new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000);
          if (isUnentschuldigt || (!effectiveStatus && today > deadlineDate)) {
            stats[studentName].fehlzeiten_unentsch++;
          }
        } else {
          // Bei Verspätungen soll als Zahl nur unentschuldigt gezählt werden.
          const isUnentschuldigt = effectiveStatus === 'nicht entsch.' || effectiveStatus === 'nicht akzep.' || (!effectiveStatus && today > new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000));
          if (isUnentschuldigt) {
            stats[studentName].verspaetungen_unentsch++;
          }
        }
      }
    });

    setSchoolYearStats(stats);
  }, []);

  const calculateWeeklyStats = useCallback((data: any[]) => {
    const weeks = getLastNWeeks(parseInt(selectedWeeks));
    const stats: any = {};

    data.forEach(row => {
      if (!row.Beginndatum || !row.Langname || !row.Vorname) return;
      if (row['Text/Grund']?.toLowerCase().includes('fehleintrag')) return;

      const [day, month, year] = row.Beginndatum.split('.');
      const date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T12:00:00`);
      const studentName = `${row.Langname}, ${row.Vorname}`;

      const weekIndex = weeks.findIndex(w => {
        const startDate = w.startDate;
        const endDate = w.endDate;
        return date >= startDate && date <= endDate;
      });

      if (weekIndex === -1) return;

      if (!stats[studentName]) {
        stats[studentName] = {
          verspaetungen: { total: 0, weekly: Array(weeks.length).fill(0) },
          fehlzeiten: { total: 0, weekly: Array(weeks.length).fill(0) }
        };
      }

      const effectiveStatus = row.Status ? row.Status.trim() : '';
      const isVerspaetung = isVerspaetungFunc(row);

      const today = new Date();
      const deadline = new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000);
      const isUnentschuldigt = effectiveStatus === 'nicht entsch.' ||
                                effectiveStatus === 'nicht akzep.' ||
                                (!effectiveStatus && today > deadline);

      if (isUnentschuldigt) {
        if (isVerspaetung) {
          stats[studentName].verspaetungen.weekly[weekIndex]++;
          stats[studentName].verspaetungen.total++;
        } else {
          stats[studentName].fehlzeiten.weekly[weekIndex]++;
          stats[studentName].fehlzeiten.total++;
        }
      }
    });

    setWeeklyStats(stats);
  }, [selectedWeeks]);

  const processData = useCallback((data: any[], startDateTime: Date, endDateTime: Date) => {
    try {
      const today = new Date();
      const studentStats: any = {};
      const detailedStats: Record<string, DetailedStats> = {};
      const schoolYearDetails: Record<string, any> = {};
      const weeklyDetails: Record<string, DetailedStats> = {};
      const schoolYear = getCurrentSchoolYear();
      const sjStartDate = new Date(schoolYear.start + '-09-01T00:00:00');
      const sjEndDate = new Date(schoolYear.end + '-07-31T23:59:59');

      data.forEach(row => {
        if (!row.Beginndatum || !row.Langname || !row.Vorname) return;
        if (row['Text/Grund']?.toLowerCase().includes('fehleintrag')) return;

        const [day, month, year] = row.Beginndatum.split('.');
        const date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T12:00:00`);
        const studentName = `${row.Langname}, ${row.Vorname}`;

        if (!studentStats[studentName]) {
          studentStats[studentName] = {
            verspaetungen_entsch: 0,
            verspaetungen_unentsch: 0,
            verspaetungen_offen: 0,
            fehlzeiten_entsch: 0,
            fehlzeiten_unentsch: 0,
            fehlzeiten_offen: 0,
            klasse: row.Klasse
          };
        }

        if (!detailedStats[studentName]) {
          detailedStats[studentName] = {
            verspaetungen_entsch: [],
            verspaetungen_unentsch: [],
            verspaetungen_offen: [],
            fehlzeiten_entsch: [],
            fehlzeiten_unentsch: [],
            fehlzeiten_offen: []
          };
        }

        if (!schoolYearDetails[studentName]) {
          schoolYearDetails[studentName] = {
            verspaetungen_entsch: [],
            verspaetungen_unentsch: [],
            verspaetungen_offen: [],
            fehlzeiten_entsch: [],
            fehlzeiten_unentsch: [],
            fehlzeiten_offen: [],
            fehlzeiten_gesamt: []  // neu für Gesamtzahl (entschuldigt + unentschuldigt)
          };
        }

        if (!weeklyDetails[studentName]) {
          weeklyDetails[studentName] = {
            verspaetungen_entsch: [],
            verspaetungen_unentsch: [],
            verspaetungen_offen: [],
            fehlzeiten_entsch: [],
            fehlzeiten_unentsch: [],
            fehlzeiten_offen: []
          };
        }

        const effectiveStatus = row.Status ? row.Status.trim() : '';
        const isVerspaetung = isVerspaetungFunc(row);
        const isAttest = effectiveStatus === 'Attest' || effectiveStatus === 'Attest Amtsarzt';
        const isEntschuldigt = effectiveStatus === 'entsch.' || isAttest;
        const isUnentschuldigt = effectiveStatus === 'nicht entsch.' || effectiveStatus === 'nicht akzep.';
        const deadlineDate = new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000);
        const isOverDeadline = today > deadlineDate;
        const isOffen = !effectiveStatus && !isOverDeadline;

        const entry: AbsenceEntry = {
          datum: date,
          art: isVerspaetung ? 'Verspätung' : (row.Abwesenheitsgrund || 'Fehltag'),
          beginnZeit: row.Beginnzeit,
          endZeit: row.Endzeit,
          grund: row['Text/Grund'],
          status: effectiveStatus as AbsenceStatus
        };

        if (date >= startDateTime && date <= endDateTime) {
          if (isVerspaetung) {
            if (isEntschuldigt) {
              studentStats[studentName].verspaetungen_entsch++;
              detailedStats[studentName].verspaetungen_entsch.push(entry);
            } else if (isUnentschuldigt || (!effectiveStatus && isOverDeadline)) {
              studentStats[studentName].verspaetungen_unentsch++;
              detailedStats[studentName].verspaetungen_unentsch.push(entry);
            } else if (isOffen) {
              studentStats[studentName].verspaetungen_offen++;
              detailedStats[studentName].verspaetungen_offen.push(entry);
            }
          } else {
            if (isEntschuldigt) {
              studentStats[studentName].fehlzeiten_entsch++;
              detailedStats[studentName].fehlzeiten_entsch.push(entry);
            } else if (isUnentschuldigt || (!effectiveStatus && isOverDeadline)) {
              studentStats[studentName].fehlzeiten_unentsch++;
              detailedStats[studentName].fehlzeiten_unentsch.push(entry);
            } else if (isOffen) {
              studentStats[studentName].fehlzeiten_offen++;
              detailedStats[studentName].fehlzeiten_offen.push(entry);
            }
          }
        }

        if (date >= sjStartDate && date <= sjEndDate) {
          if (isVerspaetung) {
            // Für die Details: alle Verspätungen (entschuldigt, unentschuldigt, offen) sollen in den Detaildaten erscheinen.
            schoolYearDetails[studentName].verspaetungen_unentsch.push(entry);
          } else {
            // Für Fehlzeiten: immer in fehlzeiten_gesamt aufnehmen
            schoolYearDetails[studentName].fehlzeiten_gesamt.push(entry);
            if (isUnentschuldigt || (!effectiveStatus && isOverDeadline)) {
              schoolYearDetails[studentName].fehlzeiten_unentsch.push(entry);
            }
            if (isEntschuldigt) {
              schoolYearDetails[studentName].fehlzeiten_entsch.push(entry);
            }
          }
        }

        if (isVerspaetung) {
          if (isEntschuldigt) {
            weeklyDetails[studentName].verspaetungen_entsch.push(entry);
          } else if (isUnentschuldigt || (!effectiveStatus && isOverDeadline)) {
            weeklyDetails[studentName].verspaetungen_unentsch.push(entry);
          } else if (isOffen) {
            weeklyDetails[studentName].verspaetungen_offen.push(entry);
          }
        } else {
          if (isEntschuldigt) {
            weeklyDetails[studentName].fehlzeiten_entsch.push(entry);
          } else if (isUnentschuldigt || (!effectiveStatus && isOverDeadline)) {
            weeklyDetails[studentName].fehlzeiten_unentsch.push(entry);
          } else if (isOffen) {
            weeklyDetails[studentName].fehlzeiten_offen.push(entry);
          }
        }
      });

      setResults(studentStats);
      setDetailedData(detailedStats);
      setSchoolYearDetailedData(schoolYearDetails);
      setWeeklyDetailedData(weeklyDetails);
      setAvailableStudents(Object.keys(studentStats).sort());

      const classes = new Set<string>();
      data.forEach(row => {
        if (row.Klasse) {
          classes.add(row.Klasse);
        }
      });
      setAvailableClasses(Array.from(classes).sort());
      
      setError('');
    } catch (err: any) {
      setError('Fehler bei der Datenverarbeitung: ' + err.message);
    }
  }, []);

  const processFile = async (file: File) => {
    try {
      if (!startDate || !endDate) {
        setError('Bitte wählen Sie erst den Zeitraum aus.');
        return;
      }

      if (file.name.toLowerCase().endsWith('.csv')) {
        const text = await file.text();
        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          delimiter: '\t',
          complete: (results) => {
            if (results.data && Array.isArray(results.data) && results.data.length > 0) {
              const firstRow = results.data[0] as any;
              if (!firstRow.Langname || !firstRow.Vorname || !firstRow.Beginndatum) {
                Papa.parse(text, {
                  header: true,
                  skipEmptyLines: true,
                  delimiter: ',',
                  complete: (results) => {
                    if (results.data && Array.isArray(results.data) && results.data.length > 0) {
                      const firstRow = results.data[0] as any;
                      if (!firstRow.Langname || !firstRow.Vorname || !firstRow.Beginndatum) {
                        Papa.parse(text, {
                          header: true,
                          skipEmptyLines: true,
                          delimiter: ';',
                          complete: (results) => {
                            setRawData(results.data);
                          },
                          error: (error) => {
                            setError('Fehler beim Verarbeiten der CSV-Datei: ' + error.message);
                          }
                        });
                      } else {
                        setRawData(results.data);
                      }
                    }
                  },
                  error: (error) => {
                    setError('Fehler beim Verarbeiten der CSV-Datei: ' + error.message);
                  }
                });
              } else {
                setRawData(results.data);
              }
            }
          },
          error: (error) => {
            setError('Fehler beim Verarbeiten der CSV-Datei: ' + error.message);
          }
        });
      } else if (file.name.toLowerCase().match(/\.xlsx?$/)) {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer);
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false });
        setRawData(jsonData);
      } else {
        setError('Nicht unterstütztes Dateiformat. Bitte laden Sie eine CSV- oder Excel-Datei hoch.');
      }
    } catch (err: any) {
      setError('Fehler beim Lesen der Datei: ' + err.message);
    }
  };

  React.useEffect(() => {
    if (rawData && startDate && endDate) {
      const startDateTime = new Date(startDate + 'T00:00:00');
      const endDateTime = new Date(endDate + 'T23:59:59');

      if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
        setError('Ungültiges Datum');
        return;
      }

      if (startDateTime > endDateTime) {
        setError('Das Startdatum muss vor dem Enddatum liegen');
        return;
      }

      processData(rawData, startDateTime, endDateTime);
    }
  }, [startDate, endDate, rawData, processData]);

  React.useEffect(() => {
    if (!startDate && !endDate) {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      const start = new Date(currentYear + '-' + String(currentMonth + 1).padStart(2, '0') + '-01T00:00:00');
      const end = new Date(currentYear + '-' + String(currentMonth + 1).padStart(2, '0') + '-' + String(new Date(currentYear, currentMonth + 1, 0).getDate()).padStart(2, '0') + 'T23:59:59');
      
      setStartDate(start.toLocaleDateString('sv').split('T')[0]);
      setEndDate(end.toLocaleDateString('sv').split('T')[0]);
    }
  }, []);
  
  React.useEffect(() => {
    if (rawData) {
      calculateSchoolYearStats(rawData);
      calculateWeeklyStats(rawData);
    }
  }, [rawData, selectedWeeks, calculateSchoolYearStats, calculateWeeklyStats]);

  React.useEffect(() => {
    if (results) {
      setResults({ ...results });
    }
  }, [selectedClasses]);

  const getFilteredStudents = () => {
    if (!results) return [];

    return Object.entries(results)
      .filter(([student, stats]: [string, any]) => {
        const matchesSearch = student.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesClass = selectedClasses.length === 0 || selectedClasses.includes(stats.klasse);
        
        let meetsUnexcusedCriteria = true;
        if (filterUnexcusedLate || filterUnexcusedAbsent) {
          meetsUnexcusedCriteria = false;
          if (filterUnexcusedLate && stats.verspaetungen_unentsch > 0) {
            meetsUnexcusedCriteria = true;
          }
          if (filterUnexcusedAbsent && stats.fehlzeiten_unentsch > 0) {
            meetsUnexcusedCriteria = true;
          }
        }

        const meetsMinUnexcusedLates = minUnexcusedLates === '' || 
          stats.verspaetungen_unentsch >= parseInt(minUnexcusedLates);
        const meetsMinUnexcusedAbsences = minUnexcusedAbsences === '' || 
          stats.fehlzeiten_unentsch >= parseInt(minUnexcusedAbsences);

        return matchesSearch && 
               matchesClass && 
               meetsUnexcusedCriteria && 
               meetsMinUnexcusedLates && 
               meetsMinUnexcusedAbsences;
      })
      .sort(([a], [b]) => a.localeCompare(b));
  };
   
  return (
    <div className="container mx-auto py-6 px-4">
      <Card className="w-full bg-white">
        <CardHeader className="border-b">
          <CardTitle>Anwesenheitsanalyse</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Zeitraum von</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="endDate">bis</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Schnellauswahl</Label>
                <Select
                  onValueChange={(value) => {
                    const now = new Date();
                    const currentYear = now.getFullYear();
                    const currentMonth = now.getMonth();
                    let start, end;

                    switch (value) {
                      case 'thisWeek': {
                        const currentDay = now.getDay();
                        const diff = currentDay === 0 ? 6 : currentDay - 1;
                        const startDate = new Date(now);
                        startDate.setDate(now.getDate() - diff);
                        const endDate = new Date(startDate);
                        endDate.setDate(startDate.getDate() + 6);
                        start = new Date(startDate.getFullYear() + '-' + String(startDate.getMonth() + 1).padStart(2, '0') + '-' + String(startDate.getDate()).padStart(2, '0') + 'T00:00:00');
                        end = new Date(endDate.getFullYear() + '-' + String(endDate.getMonth() + 1).padStart(2, '0') + '-' + String(endDate.getDate()).padStart(2, '0') + 'T23:59:59');
                        break;
                      }
                      case 'lastWeek': {
                        const currentDay = now.getDay();
                        const diff = currentDay === 0 ? 6 : currentDay - 1;
                        const startDate = new Date(now);
                        startDate.setDate(now.getDate() - diff - 7);
                        const endDate = new Date(startDate);
                        endDate.setDate(startDate.getDate() + 6);
                        start = new Date(startDate.getFullYear() + '-' + String(startDate.getMonth() + 1).padStart(2, '0') + '-' + String(startDate.getDate()).padStart(2, '0') + 'T00:00:00');
                        end = new Date(endDate.getFullYear() + '-' + String(endDate.getMonth() + 1).padStart(2, '0') + '-' + String(endDate.getDate()).padStart(2, '0') + 'T23:59:59');
                        break;
                      }
                      case 'lastTwoWeeks': {
                        const currentDay = now.getDay();
                        const diff = currentDay === 0 ? 6 : currentDay - 1;
                        const startDate = new Date(now);
                        startDate.setDate(now.getDate() - diff - 14);
                        const endDate = new Date(startDate);
                        endDate.setDate(startDate.getDate() + 13);
                        start = new Date(startDate.getFullYear() + '-' + String(startDate.getMonth() + 1).padStart(2, '0') + '-' + String(startDate.getDate()).padStart(2, '0') + 'T00:00:00');
                        end = new Date(endDate.getFullYear() + '-' + String(endDate.getMonth() + 1).padStart(2, '0') + '-' + String(endDate.getDate()).padStart(2, '0') + 'T23:59:59');
                        break;
                      }
                      case 'thisMonth': {
                        start = new Date(currentYear + '-' + String(currentMonth + 1).padStart(2, '0') + '-01T00:00:00');
                        end = new Date(currentYear + '-' + String(currentMonth + 1).padStart(2, '0') + '-' + String(new Date(currentYear, currentMonth + 1, 0).getDate()).padStart(2, '0') + 'T23:59:59');
                        break;
                      }
                      case 'lastMonth': {
                        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
                        const yearOfLastMonth = currentMonth === 0 ? currentYear - 1 : currentYear;
                        start = new Date(yearOfLastMonth + '-' + String(lastMonth + 1).padStart(2, '0') + '-01T00:00:00');
                        end = new Date(yearOfLastMonth + '-' + String(lastMonth + 1).padStart(2, '0') + '-' + String(new Date(yearOfLastMonth, lastMonth + 1, 0).getDate()).padStart(2, '0') + 'T23:59:59');
                        break;
                      }
                      case 'schoolYear': {
                        const schoolYear = getCurrentSchoolYear();
                        start = new Date(schoolYear.start + '-09-01T00:00:00');
                        end = new Date(schoolYear.end + '-07-31T23:59:59');
                        break;
                      }
                      default:
                        return;
                    }

                    setStartDate(start.toLocaleDateString('sv').split('T')[0]);
                    setEndDate(end.toLocaleDateString('sv').split('T')[0]);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Dieser Monat" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">Benutzerdefiniert</SelectItem>
                    <SelectItem value="thisWeek">Diese Woche</SelectItem>
                    <SelectItem value="lastWeek">Letzte Woche</SelectItem>
                    <SelectItem value="lastTwoWeeks">Letzte zwei Wochen</SelectItem>
                    <SelectItem value="thisMonth">Dieser Monat</SelectItem>
                    <SelectItem value="lastMonth">Letzter Monat</SelectItem>
                    <SelectItem value="schoolYear">Gesamtes Schuljahr</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="weekSelect">Für Statistik: Anzahl vollständige Wochen zurück</Label>
                <Select
                  value={selectedWeeks}
                  onValueChange={setSelectedWeeks}
                >
                  <SelectTrigger id="weekSelect">
                    <SelectValue placeholder="Wählen Sie die Anzahl der Wochen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Woche</SelectItem>
                    <SelectItem value="2">2 Wochen</SelectItem>
                    <SelectItem value="3">3 Wochen</SelectItem>
                    <SelectItem value="4">4 Wochen</SelectItem>
                    <SelectItem value="5">5 Woche</SelectItem>
                    <SelectItem value="6">6 Wochen</SelectItem>
                    <SelectItem value="7">7 Wochen</SelectItem>
                    <SelectItem value="8">8 Wochen</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="file">CSV-Datei oder Excel-Datei hochladen</Label>
              <Input
                id="file"
                type="file"
                accept=".csv,.xlsx,.xls"
                ref={fileInputRef}
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    processFile(e.target.files[0]);
                  }
                }}
                className="mt-1"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {results && (
              <>
                <div className="mb-6">
                  {/*Removed search bar here */}
                </div>

                <Card className="mb-6">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Filter für den ausgewählten Zeitraum</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Anzeigefilter</Label>
                      <div className="flex gap-4 mt-1">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={filterUnexcusedLate}
                            onChange={(e) => setFilterUnexcusedLate(e.target.checked)}
                            className="mr-2"
                          />
                          Unentschuldigte Verspätungen
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={filterUnexcusedAbsent}
                            onChange={(e) => setFilterUnexcusedAbsent(e.target.checked)}
                            className="mr-2"
                          />
                          Unentschuldigte Fehlzeiten
                        </label>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="minLates">Minimale unentschuldigte Verspätungen</Label>
                        <Input
                          id="minLates"
                          type="number"
                          min="0"
                          value={minUnexcusedLates}
                          onChange={(e) => setMinUnexcusedLates(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="minAbsences">Minimale unentschuldigte Fehlzeiten</Label>
                        <Input
                          id="minAbsences"
                          type="number"
                          min="0"
                          value={minUnexcusedAbsences}
                          onChange={(e) => setMinUnexcusedAbsences(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex gap-4 items-center">
                  <Button variant={isReportView ? "outline" : "default"}
                    onClick={() => setIsReportView(false)}>
                    Normale Ansicht
                  </Button>
                  <Button variant={isReportView ? "default" : "outline"}
                    onClick={() => setIsReportView(true)}>
                    Berichtsansicht
                  </Button>
                  <Button variant="destructive" onClick={resetAll}>
                    Zurücksetzen
                  </Button>
                  <ExportButtons 
                    getFilteredStudents={getFilteredStudents}
                    startDate={startDate}
                    endDate={endDate}
                    schoolYearStats={schoolYearStats}
                    weeklyStats={weeklyStats}
                    selectedWeeks={selectedWeeks}
                    isReportView={isReportView}
                    detailedData={detailedData}
                    schoolYearDetailedData={schoolYearDetailedData}
                    weeklyDetailedData={weeklyDetailedData}
                    expandedStudents={expandedStudents}
                    activeFilters={activeFilters}
                  />
                </div>
                
                {isReportView ? (
                  <ReportView
                    getFilteredStudents={getFilteredStudents}
                    detailedData={detailedData}
                    startDate={startDate}
                    endDate={endDate}
                    searchQuery={searchQuery}
                    onSearchChange={(value) => setSearchQuery(value)}
                    availableClasses={availableClasses}
                    selectedClasses={selectedClasses}
                    onClassesChange={setSelectedClasses}
                  />
                ) : (
                  <NormalView
                    getFilteredStudents={getFilteredStudents}
                    detailedData={detailedData}
                    schoolYearDetailedData={schoolYearDetailedData}
                    weeklyDetailedData={weeklyDetailedData}
                    startDate={startDate}
                    endDate={endDate}
                    schoolYearStats={schoolYearStats}
                    weeklyStats={weeklyStats}
                    selectedWeeks={selectedWeeks}
                    searchQuery={searchQuery}
                    onSearchChange={(value) => setSearchQuery(value)}
                    availableClasses={availableClasses}
                    selectedClasses={selectedClasses}
                    onClassesChange={setSelectedClasses}
                    expandedStudents={expandedStudents}
                    setExpandedStudents={setExpandedStudents}
                    activeFilters={activeFilters}
                    setActiveFilters={setActiveFilters}
                  />
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AttendanceAnalyzer;
