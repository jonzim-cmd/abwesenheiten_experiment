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

const AttendanceAnalyzer = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rawData, setRawData] = useState(null);
  const [results, setResults] = useState<any>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [detailedData, setDetailedData] = useState<Record<string, DetailedStats>>({});
  const [schoolYearDetailedData, setSchoolYearDetailedData] = useState<Record<string, DetailedStats>>({});
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
    const sjStartDate = new Date(schoolYear.start, 8, 1);
    const sjEndDate = new Date(schoolYear.end, 7, 31);
    const today = new Date();

    const stats: Record<string, { verspaetungen_unentsch: number; fehlzeiten_unentsch: number }> = {};

    data.forEach(row => {
      if (!row.Beginndatum || !row.Langname || !row.Vorname) return;
      if (row['Text/Grund']?.toLowerCase().includes('fehleintrag')) return;

      const [day, month, year] = row.Beginndatum.split('.');
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      const studentName = `${row.Langname}, ${row.Vorname}`;

      if (!stats[studentName]) {
        stats[studentName] = {
          verspaetungen_unentsch: 0,
          fehlzeiten_unentsch: 0
        };
      }

      if (date >= sjStartDate && date <= sjEndDate) {
        const isVerspaetung = row.Abwesenheitsgrund === 'Verspätung';
        const isUnentschuldigt = row.Status === 'nicht entsch.' || row.Status === 'nicht akzep.';
        const isUeberfaellig = !row.Status && (today > new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000));

        if (isUnentschuldigt || isUeberfaellig) {
          if (isVerspaetung) {
            stats[studentName].verspaetungen_unentsch++;
          } else {
            stats[studentName].fehlzeiten_unentsch++;
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
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
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

      const isVerspaetung = row.Abwesenheitsgrund === 'Verspätung';
      const today = new Date();
      const isUnentschuldigt = row.Status === 'nicht entsch.' || 
                              row.Status === 'nicht akzep.' || 
                              (!row.Status && today > new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000));

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
      const schoolYearDetails: Record<string, DetailedStats> = {};
      const weeklyDetails: Record<string, DetailedStats> = {};
      const schoolYear = getCurrentSchoolYear();
      const sjStartDate = new Date(schoolYear.start, 8, 1);
      const sjEndDate = new Date(schoolYear.end, 7, 31);

      data.forEach(row => {
        if (!row.Beginndatum || !row.Langname || !row.Vorname) return;
        if (row['Text/Grund']?.toLowerCase().includes('fehleintrag')) return;

        const [day, month, year] = row.Beginndatum.split('.');
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
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
            fehlzeiten_offen: []
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

        const isVerspaetung = row.Abwesenheitsgrund === 'Verspätung';
        let effectiveStatus = row.Status ? row.Status.trim() : '';
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
            if (isUnentschuldigt || (!effectiveStatus && isOverDeadline)) {
              schoolYearDetails[studentName].verspaetungen_unentsch.push(entry);
            }
          } else {
            if (isUnentschuldigt || (!effectiveStatus && isOverDeadline)) {
              schoolYearDetails[studentName].fehlzeiten_unentsch.push(entry);
            }
          }
        }

        if (isVerspaetung) {
          if (isUnentschuldigt || (!effectiveStatus && isOverDeadline)) {
            weeklyDetails[studentName].verspaetungen_unentsch.push(entry);
          }
        } else {
          if (isUnentschuldigt || (!effectiveStatus && isOverDeadline)) {
            weeklyDetails[studentName].fehlzeiten_unentsch.push(entry);
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
      const startDateTime = new Date(startDate);
      const endDateTime = new Date(endDate);

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
      const start = new Date(currentYear, currentMonth, 1);
      const end = new Date(currentYear, currentMonth + 1, 0);
      
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(end.toISOString().split('T')[0]);
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
      setResults({...results});
    }
  }, [selectedClasses]);

  const toggleDetails = useCallback((student: string) => {
    setExpandedStudents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(student)) {
        newSet.delete(student);
        setActiveFilters(prevFilters => {
          const newFilters = new Map(prevFilters);
          newFilters.delete(student);
          return newFilters;
        });
      } else {
        newSet.add(student);
        setActiveFilters(prevFilters => {
          const newFilters = new Map(prevFilters);
          newFilters.set(student, 'details');
          return newFilters;
        });
      }
      return newSet;
    });
  }, []);

  const showFilteredDetails = useCallback((student: string, type: string) => {
    setExpandedStudents(prev => {
      const newSet = new Set(prev);
      if (prev.has(student) && activeFilters.get(student) === type) {
        newSet.delete(student);
        setActiveFilters(prevFilters => {
          const newFilters = new Map(prevFilters);
          newFilters.delete(student);
          return newFilters;
        });
      } else {
        newSet.add(student);
        setActiveFilters(prevFilters => {
          const newFilters = new Map(prevFilters);
          newFilters.set(student, type);
          return newFilters;
        });
      }
      return newSet;
    });
  }, [activeFilters]);

  const getFilteredStudents = () => {
    if (!results) return [];

    return Object.entries(results)
      .filter(([student, stats]: [string, any]) => {
        const matchesSearch = student.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesClass = selectedClasses.length === 0 || selectedClasses.includes(stats.klasse);
        let meetsUnexcusedCriteria = true;
        
        if (filterUnexcusedLate || filterUnexcusedAbsent) {
          meetsUnexcusedCriteria = false;
          if (filterUnexcusedLate && stats.verspaetungen_unentsch > 0) meetsUnexcusedCriteria = true;
          if (filterUnexcusedAbsent && stats.fehlzeiten_unentsch > 0) meetsUnexcusedCriteria = true;
        }

        const meetsMinLates = minUnexcusedLates === '' || stats.verspaetungen_unentsch >= parseInt(minUnexcusedLates);
        const meetsMinAbsences = minUnexcusedAbsences === '' || stats.fehlzeiten_unentsch >= parseInt(minUnexcusedAbsences);

        return matchesSearch && matchesClass && meetsUnexcusedCriteria && meetsMinLates && meetsMinAbsences;
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
            {/* Date Selection and File Upload Section */}
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

            {/* Quick Selection and Week Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Schnellauswahl</Label>
                <Select
                  onValueChange={(value) => {
                    // Date range selection logic
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Dieser Monat" />
                  </SelectTrigger>
                  <SelectContent>{/* Options */}</SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="weekSelect">Wochen für Statistik</Label>
                <Select
                  value={selectedWeeks}
                  onValueChange={setSelectedWeeks}
                >
                  <SelectTrigger id="weekSelect">
                    <SelectValue placeholder="4 Wochen" />
                  </SelectTrigger>
                  <SelectContent>{/* Week options */}</SelectContent>
                </Select>
              </div>
            </div>

            {/* File Upload */}
            <div>
              <Label htmlFor="file">Daten hochladen</Label>
              <Input
                id="file"
                type="file"
                accept=".csv,.xlsx,.xls"
                ref={fileInputRef}
                onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])}
                className="mt-1"
              />
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {/* Results Section */}
            {results && (
              <>
                {/* Filters and View Toggles */}
                <Card className="mb-6">
                  <CardContent className="space-y-4">
                    {/* Filter controls */}
                  </CardContent>
                </Card>

                {/* View Controls and Export Buttons */}
                <div className="flex gap-4 items-center">
                  <Button
                    variant={isReportView ? "outline" : "default"}
                    onClick={() => setIsReportView(false)}
                  >
                    Normalansicht
                  </Button>
                  <Button
                    variant={isReportView ? "default" : "outline"}
                    onClick={() => setIsReportView(true)}
                  >
                    Berichtsansicht
                  </Button>
                  <Button variant="destructive" onClick={resetAll}>
                    Zurücksetzen
                  </Button>
                  <ExportButtons 
                    data={getFilteredStudents()}
                    startDate={startDate}
                    endDate={endDate}
                    schoolYearStats={schoolYearStats}
                    weeklyStats={weeklyStats}
                    selectedWeeks={selectedWeeks}
                    isReportView={isReportView}
                    detailedData={isReportView ? detailedData : {}}
                    expandedStudents={expandedStudents}
                    activeFilters={activeFilters}
                    normalViewDetailedData={detailedData}
                    schoolYearDetailedData={schoolYearDetailedData}
                    weeklyDetailedData={weeklyDetailedData}
                  />
                </div>

                {/* Main Content View */}
                {isReportView ? (
                  <ReportView
                    filteredStudents={getFilteredStudents()}
                    detailedData={detailedData}
                    // ... other props
                  />
                ) : (
                  <NormalView
                    filteredStudents={getFilteredStudents()}
                    detailedData={detailedData}
                    schoolYearDetailedData={schoolYearDetailedData}
                    weeklyDetailedData={weeklyDetailedData}
                    expandedStudents={expandedStudents}
                    activeFilters={activeFilters}
                    onToggleDetails={toggleDetails}
                    onShowFilteredDetails={showFilteredDetails}
                    // ... other props
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
