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
import { getWeekNumber, getLastNWeeks, getCurrentSchoolYear } from '@/lib/attendance';

const AttendanceAnalyzer = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rawData, setRawData] = useState(null);
  const [results, setResults] = useState<any>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [detailedData, setDetailedData] = useState<any>({});
  const [filterUnexcusedLate, setFilterUnexcusedLate] = useState(false);
  const [filterUnexcusedAbsent, setFilterUnexcusedAbsent] = useState(false);
  const [minUnexcusedLates, setMinUnexcusedLates] = useState('');
  const [minUnexcusedAbsences, setMinUnexcusedAbsences] = useState('');
  const [isReportView, setIsReportView] = useState(false);
  const [availableStudents, setAvailableStudents] = useState<string[]>([]);
  const [selectedWeeks, setSelectedWeeks] = useState('1');
  const [schoolYearStats, setSchoolYearStats] = useState<any>({});
  const [weeklyStats, setWeeklyStats] = useState<any>({});

  const resetAll = () => {
    setRawData(null);
    setResults(null);
    setStartDate('');
    setEndDate('');
    setSearchQuery('');
    setError('');
    setDetailedData({});
    setFilterUnexcusedLate(false);
    setFilterUnexcusedAbsent(false);
    setMinUnexcusedLates('');
    setMinUnexcusedAbsences('');
    setIsReportView(false);
    setAvailableStudents([]);
    setSelectedWeeks('1');
    setSchoolYearStats({});
    setWeeklyStats({});
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const calculateSchoolYearStats = useCallback((data: any[]) => {
    const schoolYear = getCurrentSchoolYear();
    const startDate = new Date(Date.UTC(schoolYear.start, 8, 1)); // September 1st
    const endDate = new Date(Date.UTC(schoolYear.end, 7, 31)); // August 31st

    const stats: any = {};

    data.forEach(row => {
      if (!row.Beginndatum || !row.Langname || !row.Vorname) return;
      if (row['Text/Grund']?.toLowerCase().includes('fehleintrag')) return;

      const [day, month, year] = row.Beginndatum.split('.');
      const date = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));
      const studentName = `${row.Langname}, ${row.Vorname}`;

      if (date >= startDate && date <= endDate) {
        if (!stats[studentName]) {
          stats[studentName] = { 
            verspaetungen_unentsch: 0, 
            fehlzeiten_unentsch: 0 
          };
        }

        const isVerspaetung = row.Abwesenheitsgrund === 'Verspätung';
        const isUnentschuldigt = row.Status === 'nicht entsch.' || row.Status === 'nicht akzep.';

        if (isUnentschuldigt) {
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
      const date = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));
      const studentName = `${row.Langname}, ${row.Vorname}`;
      const weekNumber = getWeekNumber(date);
      const yearNumber = date.getFullYear();

      const weekIndex = weeks.findIndex(w => w.week === weekNumber && w.year === yearNumber);
      if (weekIndex === -1) return;

      if (!stats[studentName]) {
        stats[studentName] = {
          verspaetungen: { total: 0, weekly: Array(weeks.length).fill(0) },
          fehlzeiten: { total: 0, weekly: Array(weeks.length).fill(0) }
        };
      }

      const isVerspaetung = row.Abwesenheitsgrund === 'Verspätung';
      const isUnentschuldigt = row.Status === 'nicht entsch.' || row.Status === 'nicht akzep.';

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
      const detailedUnexcused: any = {};

      data.forEach(row => {
        if (!row.Beginndatum || !row.Langname || !row.Vorname) return;
        if (row['Text/Grund']?.toLowerCase().includes('fehleintrag')) return;

        const [day, month, year] = row.Beginndatum.split('.');
        const date = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));
        const studentName = `${row.Langname}, ${row.Vorname}`;

        if (date >= startDateTime && date <= endDateTime) {
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

          if (!detailedUnexcused[studentName]) {
            detailedUnexcused[studentName] = [];
          }

          const isVerspaetung = row.Abwesenheitsgrund === 'Verspätung';
          let effectiveStatus = row.Status ? row.Status.trim() : '';
          const isAttest = effectiveStatus === 'Attest' || effectiveStatus === 'Attest Amtsarzt';
          const isEntschuldigt = effectiveStatus === 'entsch.' || isAttest;
          const isUnentschuldigt = effectiveStatus === 'nicht entsch.' || effectiveStatus === 'nicht akzep.';
          const deadlineDate = new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000);
          const isOverDeadline = today > deadlineDate;

          if (isVerspaetung) {
            if (isEntschuldigt) {
              studentStats[studentName].verspaetungen_entsch++;
            } else if (isUnentschuldigt) {
              studentStats[studentName].verspaetungen_unentsch++;
              detailedUnexcused[studentName].push({
                datum: date,
                art: 'Verspätung',
                beginnZeit: row.Beginnzeit,
                endZeit: row.Endzeit
              });
            } else {
              studentStats[studentName].verspaetungen_offen++;
            }
          } else {
            if (isEntschuldigt) {
              studentStats[studentName].fehlzeiten_entsch++;
            } else if (isUnentschuldigt || (!effectiveStatus && isOverDeadline)) {
              studentStats[studentName].fehlzeiten_unentsch++;
              detailedUnexcused[studentName].push({
                datum: date,
                art: row.Abwesenheitsgrund || 'Fehltag',
                beginnZeit: row.Beginnzeit,
                endZeit: row.Endzeit,
                grund: row['Text/Grund']
              });
            } else {
              studentStats[studentName].fehlzeiten_offen++;
            }
          }
        }
      });

      setResults(studentStats);
      setDetailedData(detailedUnexcused);
      setAvailableStudents(Object.keys(studentStats).sort());
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

      const text = await file.text();

      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setRawData(results.data);
        },
        error: (error) => {
          setError('Fehler beim Verarbeiten der CSV-Datei: ' + error.message);
        }
      });
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
    if (rawData) {
      calculateSchoolYearStats(rawData);
      calculateWeeklyStats(rawData);
    }
  }, [rawData, selectedWeeks, calculateSchoolYearStats, calculateWeeklyStats]);

  const getFilteredStudents = () => {
    if (!results) return [];

    return Object.entries(results)
      .filter(([student, stats]: [string, any]) => {
        const matchesSearch = student.toLowerCase().includes(searchQuery.toLowerCase());
        const hasUnexcusedLate = filterUnexcusedLate ? stats.verspaetungen_unentsch > 0 : true;
        const hasUnexcusedAbsent = filterUnexcusedAbsent ? stats.fehlzeiten_unentsch > 0 : true;
        const meetsMinUnexcusedLates = minUnexcusedLates === '' || stats.verspaetungen_unentsch >= parseInt(minUnexcusedLates);
        const meetsMinUnexcusedAbsences = minUnexcusedAbsences === '' || stats.fehlzeiten_unentsch >= parseInt(minUnexcusedAbsences);

        if (!filterUnexcusedLate && !filterUnexcusedAbsent) {
          return matchesSearch && meetsMinUnexcusedLates && meetsMinUnexcusedAbsences;
        }

        if (filterUnexcusedLate && filterUnexcusedAbsent) {
          return matchesSearch && (hasUnexcusedLate || hasUnexcusedAbsent) && meetsMinUnexcusedLates && meetsMinUnexcusedAbsences;
        }

        return matchesSearch && (hasUnexcusedLate && hasUnexcusedAbsent) && meetsMinUnexcusedLates && meetsMinUnexcusedAbsences;
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
                        start = new Date(now);
                        start.setDate(now.getDate() - diff);
                        end = new Date(start);
                        end.setDate(start.getDate() + 6);
                        break;
                      }
                      case 'lastWeek': {
                        const currentDay = now.getDay();
                        const diff = currentDay === 0 ? 6 : currentDay - 1;
                        start = new Date(now);
                        start.setDate(now.getDate() - diff - 7);
                        end = new Date(start);
                        end.setDate(start.getDate() + 6);
                        break;
                      }
                      case 'thisMonth': {
                        start = new Date(currentYear, currentMonth, 1);
                        end = new Date(currentYear, currentMonth + 1, 0);
                        break;
                      }
                      case 'lastMonth': {
                        start = new Date(currentYear, currentMonth - 1, 1);
                        end = new Date(currentYear, currentMonth, 0);
                        break;
                      }
                      case 'schoolYear': {
                        const schoolYear = getCurrentSchoolYear();
                        start = new Date(schoolYear.start, 8, 1);
                        end = new Date(schoolYear.end, 7, 31);
                        break;
                      }
                      default:
                        return;
                    }

                    setStartDate(start.toISOString().split('T')[0]);
                    setEndDate(end.toISOString().split('T')[0]);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Zeitraum auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">Benutzerdefiniert</SelectItem>
                    <SelectItem value="thisWeek">Diese Woche</SelectItem>
                    <SelectItem value="lastWeek">Letzte Woche</SelectItem>
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
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="file">CSV-Datei hochladen</Label>
              <Input
                id="file"
                type="file"
                accept=".csv"
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="searchQuery">Suche nach Namen</Label>
                    <Input
                      id="searchQuery"
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Namen eingeben..."
                      className="mt-1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Filter</Label>
                    <div className="flex gap-4">
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

                <div className="flex gap-4">
                  <Button
                    variant={isReportView ? "outline" : "default"}
                    onClick={() => setIsReportView(false)}
                  >
                    Normale Ansicht
                  </Button>
                  <Button
                    variant={isReportView ? "default" : "outline"}
                    onClick={() => setIsReportView(true)}
                  >
                    Berichtsansicht
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={resetAll}
                  >
                    Zurücksetzen
                  </Button>
                </div>

                {isReportView ? (
                  <ReportView
                    filteredStudents={getFilteredStudents()}
                    detailedData={detailedData}
                    startDate={startDate}
                    endDate={endDate}
                  />
                ) : (
                  <NormalView
                    filteredStudents={getFilteredStudents()}
                    detailedData={detailedData}
                    startDate={startDate}
                    endDate={endDate}
                    schoolYearStats={schoolYearStats}
                    weeklyStats={weeklyStats}
                    selectedWeeks={selectedWeeks}
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