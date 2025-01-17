import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import StudentTableHeader, { SortConfig } from './table/StudentTableHeader';
import StudentTableRow from './table/StudentTableRow';
import StudentDetailsRow from './table/StudentDetailsRow';
import { StudentStats, AbsenceEntry, getLastNWeeks, getCurrentSchoolYear } from '@/lib/attendance-utils';
import ExportButtons from './ExportButtons';

interface DetailedStats {
  verspaetungen_entsch: AbsenceEntry[];
  verspaetungen_unentsch: AbsenceEntry[];
  verspaetungen_offen: AbsenceEntry[];
  fehlzeiten_entsch: AbsenceEntry[];
  fehlzeiten_unentsch: AbsenceEntry[];
  fehlzeiten_offen: AbsenceEntry[];
}

interface NormalViewProps {
  filteredStudents: [string, StudentStats][];
  detailedData: Record<string, DetailedStats>;
  schoolYearDetailedData: Record<string, DetailedStats>;
  weeklyDetailedData: Record<string, DetailedStats>;
  startDate: string;
  endDate: string;
  schoolYearStats: Record<string, {
    verspaetungen_unentsch: number;
    fehlzeiten_unentsch: number;
  }>;
  weeklyStats: Record<string, {
    verspaetungen: { total: number; weekly: number[] };
    fehlzeiten: { total: number; weekly: number[] };
  }>;
  selectedWeeks: string;
}

type SortField = 'name' | 'klasse' | 
  'verspaetungen_entsch' | 'verspaetungen_unentsch' | 'verspaetungen_offen' |
  'fehlzeiten_entsch' | 'fehlzeiten_unentsch' | 'fehlzeiten_offen' |
  'sj_verspaetungen' | 'sj_fehlzeiten' |
  'weekly_verspaetungen' | 'weekly_fehlzeiten' |
  'sum_verspaetungen' | 'sum_fehlzeiten';

const NormalView = ({ 
  filteredStudents, 
  detailedData, 
  schoolYearDetailedData,
  weeklyDetailedData,
  startDate, 
  endDate, 
  schoolYearStats, 
  weeklyStats,
  selectedWeeks 
}: NormalViewProps) => {
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set());
  const [activeFilters, setActiveFilters] = useState<Map<string, string>>(new Map());
  const [isAllExpanded, setIsAllExpanded] = useState(false);
  const [sortConfigs, setSortConfigs] = useState<SortConfig[]>([]);

  const parseDate = (dateStr: string | Date): Date => {
    if (dateStr instanceof Date) return dateStr;
    if (typeof dateStr === 'string') {
      const [day, month, year] = dateStr.split('.');
      if (day && month && year) {
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      }
    }
    return new Date();
  };

  const getFilteredDetailData = (student: string): AbsenceEntry[] => {
    if (!expandedStudents.has(student) || !activeFilters.has(student)) return [];

    const studentData = detailedData[student];
    const studentSchoolYearData = schoolYearDetailedData[student];
    const studentWeeklyData = weeklyDetailedData[student];
    if (!studentData || !studentSchoolYearData || !studentWeeklyData) return [];

    const filterType = activeFilters.get(student);

    switch (filterType) {
      case 'details': {
        const unexcusedEntries = [
          ...studentData.verspaetungen_unentsch,
          ...studentData.fehlzeiten_unentsch
        ];

        const today = new Date();
        const addOverdueEntries = (entries: AbsenceEntry[]) => {
          return entries.filter(entry => {
            const entryDate = parseDate(entry.datum);
            const deadlineDate = new Date(entryDate.getTime() + 7 * 24 * 60 * 60 * 1000);
            return today > deadlineDate;
          });
        };

        const overdueEntries = [
          ...addOverdueEntries(studentData.verspaetungen_offen),
          ...addOverdueEntries(studentData.fehlzeiten_offen)
        ];

        return [...unexcusedEntries, ...overdueEntries]
          .sort((a, b) => parseDate(b.datum).getTime() - parseDate(a.datum).getTime());
      }

      case 'sj_verspaetungen':
      case 'sj_fehlzeiten': {
        const entries = filterType === 'sj_verspaetungen' 
          ? studentSchoolYearData.verspaetungen_unentsch
          : studentSchoolYearData.fehlzeiten_unentsch;

        return entries.sort((a, b) => parseDate(b.datum).getTime() - parseDate(a.datum).getTime());
      }

      case 'weekly_verspaetungen':
      case 'sum_verspaetungen': {
        const weeks = getLastNWeeks(parseInt(selectedWeeks));
        const entries = studentWeeklyData.verspaetungen_unentsch
          .filter(entry => {
            const date = parseDate(entry.datum);
            return weeks.some(week => 
              date >= week.startDate && date <= week.endDate
            );
          });

        return entries.sort((a, b) => parseDate(b.datum).getTime() - parseDate(a.datum).getTime());
      }

      case 'weekly_fehlzeiten':
      case 'sum_fehlzeiten': {
        const weeks = getLastNWeeks(parseInt(selectedWeeks));
        const entries = studentWeeklyData.fehlzeiten_unentsch
          .filter(entry => {
            const date = parseDate(entry.datum);
            return weeks.some(week => 
              date >= week.startDate && date <= week.endDate
            );
          });

        return entries.sort((a, b) => parseDate(b.datum).getTime() - parseDate(a.datum).getTime());
      }

      default: {
        const selectedType = filterType as keyof DetailedStats;
        return studentData[selectedType].sort((a, b) => 
          parseDate(b.datum).getTime() - parseDate(a.datum).getTime()
        );
      }
    }
  };

  const toggleDetails = (student: string) => {
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
  };

  const showFilteredDetails = (student: string, type: string) => {
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
  };

  const toggleAllDetails = () => {
    setIsAllExpanded(prev => !prev);
    if (!isAllExpanded) {
      const newExpandedStudents = new Set<string>();
      const newActiveFilters = new Map<string, string>();

      filteredStudents.forEach(([student, stats]) => {
        if (stats.verspaetungen_unentsch > 0 || stats.fehlzeiten_unentsch > 0) {
          newExpandedStudents.add(student);
          newActiveFilters.set(student, 'details');
        }
      });

      setExpandedStudents(newExpandedStudents);
      setActiveFilters(newActiveFilters);
    } else {
      setExpandedStudents(new Set());
      setActiveFilters(new Map());
    }
  };

  const handleSort = (field: SortField, event: React.MouseEvent) => {
    setSortConfigs(prev => {
      const newConfigs = [...prev];
      const existingIndex = newConfigs.findIndex(config => config.field === field);

      // If shift key is not pressed, handle single sort
      if (!event.shiftKey) {
        // If the same column is clicked
        if (existingIndex !== -1) {
          // If it's ascending, make it descending
          if (newConfigs[existingIndex].direction === 'asc') {
            return [{ field, direction: 'desc' }];
          }
          // If it's descending, remove sort
          return [];
        }
        // New single sort
        return [{ field, direction: 'asc' }];
      }

      // Shift key is pressed - handle multi-sort
      if (existingIndex === -1) {
        // Add new sort
        newConfigs.push({ field, direction: 'asc' });
      } else {
        // Toggle existing sort
        if (newConfigs[existingIndex].direction === 'asc') {
          newConfigs[existingIndex].direction = 'desc';
        } else {
          // Remove this sort
          newConfigs.splice(existingIndex, 1);
        }
      }

      return newConfigs;
    });
  };

  const getSortedStudents = () => {
    if (sortConfigs.length === 0) {
      // Wenn keine Sortierung aktiv ist, Standard-Sortierung nach Name
      return [...filteredStudents].sort((a, b) => a[0].localeCompare(b[0]));
    }

    return [...filteredStudents].sort((a, b) => {
      for (const config of sortConfigs) {
        const [studentA, statsA] = a;
        const [studentB, statsB] = b;
        const direction = config.direction === 'asc' ? 1 : -1;

        let comparison = 0;
        switch (config.field) {
          case 'name':
            comparison = studentA.localeCompare(studentB);
            break;
          case 'klasse':
            comparison = statsA.klasse.localeCompare(statsB.klasse);
            break;
          case 'verspaetungen_entsch':
            comparison = statsA.verspaetungen_entsch - statsB.verspaetungen_entsch;
            break;
          case 'verspaetungen_unentsch':
            comparison = statsA.verspaetungen_unentsch - statsB.verspaetungen_unentsch;
            break;
          case 'verspaetungen_offen':
            comparison = statsA.verspaetungen_offen - statsB.verspaetungen_offen;
            break;
          case 'fehlzeiten_entsch':
            comparison = statsA.fehlzeiten_entsch - statsB.fehlzeiten_entsch;
            break;
          case 'fehlzeiten_unentsch':
            comparison = statsA.fehlzeiten_unentsch - statsB.fehlzeiten_unentsch;
            break;
          case 'fehlzeiten_offen':
            comparison = statsA.fehlzeiten_offen - statsB.fehlzeiten_offen;
            break;
          case 'sj_verspaetungen':
            comparison = ((schoolYearStats[studentA]?.verspaetungen_unentsch || 0) - 
                        (schoolYearStats[studentB]?.verspaetungen_unentsch || 0));
            break;
          case 'sj_fehlzeiten':
            comparison = ((schoolYearStats[studentA]?.fehlzeiten_unentsch || 0) - 
                        (schoolYearStats[studentB]?.fehlzeiten_unentsch || 0));
            break;
          case 'weekly_verspaetungen':
            comparison = ((weeklyStats[studentA]?.verspaetungen.total / parseInt(selectedWeeks) || 0) - 
                        (weeklyStats[studentB]?.verspaetungen.total / parseInt(selectedWeeks) || 0));
            break;
          case 'weekly_fehlzeiten':
            comparison = ((weeklyStats[studentA]?.fehlzeiten.total / parseInt(selectedWeeks) || 0) - 
                        (weeklyStats[studentB]?.fehlzeiten.total / parseInt(selectedWeeks) || 0));
            break;
          case 'sum_verspaetungen':
            comparison = ((weeklyStats[studentA]?.verspaetungen.total || 0) - 
                        (weeklyStats[studentB]?.verspaetungen.total || 0));
            break;
          case 'sum_fehlzeiten':
            comparison = ((weeklyStats[studentA]?.fehlzeiten.total || 0) - 
                        (weeklyStats[studentB]?.fehlzeiten.total || 0));
            break;
        }

        if (comparison !== 0) {
          return direction * comparison;
        }
      }

      return 0;
    });
  };

  returnreturn (
    <div className="mt-6 space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">
          Ergebnisse für den Zeitraum {new Date(startDate).toLocaleDateString('de-DE')} - {new Date(endDate).toLocaleDateString('de-DE')}
        </h3>
        <div className="flex gap-4">
          <ExportButtons
            data={filteredStudents}
            startDate={startDate}
            endDate={endDate}
            schoolYearStats={schoolYearStats}
            weeklyStats={weeklyStats}
            selectedWeeks={selectedWeeks}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={toggleAllDetails}
          >
            {isAllExpanded ? 'Alle Details einklappen' : 'Alle Details ausklappen'}
          </Button>
        </div>
      </div>
      <div className="relative h-[500px]">
        <div className="absolute inset-0 overflow-x-auto overflow-y-auto">
          <table className="min-w-full border-collapse bg-white">
            <StudentTableHeader 
              onSort={handleSort}
              sortConfigs={sortConfigs}
            />
            <tbody>
              {getSortedStudents().map(([student, stats], index) => {
                const rowColor = index % 2 === 0 ? 'bg-white' : 'bg-gray-100';
                const schoolYearData = schoolYearStats[student] || { 
                  verspaetungen_unentsch: 0, 
                  fehlzeiten_unentsch: 0 
                };
                const weeklyData = weeklyStats[student] || { 
                  verspaetungen: { total: 0, weekly: Array(parseInt(selectedWeeks)).fill(0) },
                  fehlzeiten: { total: 0, weekly: Array(parseInt(selectedWeeks)).fill(0) }
                };

                return (
                  <React.Fragment key={student}>
                    <StudentTableRow
                      student={student}
                      index={index}
                      stats={stats}
                      schoolYearData={schoolYearData}
                      weeklyData={weeklyData}
                      selectedWeeks={selectedWeeks}
                      rowColor={rowColor}
                      onToggleDetails={() => toggleDetails(student)}
                      onShowFilteredDetails={showFilteredDetails}
                    />
                    {expandedStudents.has(student) && (
                      <StudentDetailsRow
                        student={student}
                        detailedData={getFilteredDetailData(student)}
                        rowColor={rowColor}
                        isVisible={true}
                        filterType={activeFilters.get(student)}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default NormalView;
