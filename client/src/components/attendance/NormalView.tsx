import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import StudentTableHeader from './table/StudentTableHeader';
import StudentTableRow from './table/StudentTableRow';
import StudentDetailsRow from './table/StudentDetailsRow';
import { StudentStats, AbsenceEntry, getLastNWeeks } from '@/lib/attendance-utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ClassFilter } from './ClassFilter';
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
  searchQuery: string;
  onSearchChange: (value: string) => void;
  availableClasses: string[];
  selectedClasses: string[];
  onClassesChange: (classes: string[]) => void;
}

type SortField = 'name' | 'klasse' | 
  'verspaetungen_entsch' | 'verspaetungen_unentsch' | 'verspaetungen_offen' |
  'fehlzeiten_entsch' | 'fehlzeiten_unentsch' | 'fehlzeiten_offen' |
  'sj_verspaetungen' | 'sj_fehlzeiten' |
  'weekly_verspaetungen' | 'weekly_fehlzeiten' |
  'sum_verspaetungen' | 'sum_fehlzeiten';

type SortDirection = 'asc' | 'desc';

interface SortState {
  field: SortField;
  direction: SortDirection | null;
  order: number;
}

const NormalView = ({ 
  filteredStudents, 
  detailedData, 
  schoolYearDetailedData,
  weeklyDetailedData,
  startDate, 
  endDate, 
  schoolYearStats, 
  weeklyStats,
  selectedWeeks,
  searchQuery,
  onSearchChange,
  availableClasses,
  selectedClasses,
  onClassesChange
}: NormalViewProps) => {
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set());
  const [activeFilters, setActiveFilters] = useState<Map<string, string>>(new Map());
  const [isAllExpanded, setIsAllExpanded] = useState(false);
  const [sortStates, setSortStates] = useState<Map<SortField, SortState>>(new Map());

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
        return studentData[selectedType];
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

  const handleSort = (field: SortField) => {
    setSortStates(prevStates => {
      const newStates = new Map(prevStates);
      const currentState = newStates.get(field);
      
      if (!currentState) {
        // First click: Add ascending sort
        newStates.set(field, {
          field,
          direction: 'asc',
          order: newStates.size
        });
      } else if (currentState.direction === 'asc') {
        // Second click: Change to descending
        newStates.set(field, {
          ...currentState,
          direction: 'desc'
        });
      } else {
        // Third click: Remove sort
        newStates.delete(field);
        
        // Reorder remaining sorts
        let order = 0;
        newStates.forEach(state => {
          state.order = order++;
        });
      }
      
      return newStates;
    });
  };

  const compareValues = (a: any, b: any, field: SortField, direction: SortDirection): number => {
    const [studentA, statsA] = a;
    const [studentB, statsB] = b;
    const multiplier = direction === 'asc' ? 1 : -1;

    switch (field) {
      case 'name':
        return multiplier * studentA.localeCompare(studentB);
      case 'klasse':
        return multiplier * statsA.klasse.localeCompare(statsB.klasse);
      case 'verspaetungen_entsch':
        return multiplier * (statsA.verspaetungen_entsch - statsB.verspaetungen_entsch);
      case 'verspaetungen_unentsch':
        return multiplier * (statsA.verspaetungen_unentsch - statsB.verspaetungen_unentsch);
      case 'verspaetungen_offen':
        return multiplier * (statsA.verspaetungen_offen - statsB.verspaetungen_offen);
      case 'fehlzeiten_entsch':
        return multiplier * (statsA.fehlzeiten_entsch - statsB.fehlzeiten_entsch);
      case 'fehlzeiten_unentsch':
        return multiplier * (statsA.fehlzeiten_unentsch - statsB.fehlzeiten_unentsch);
      case 'fehlzeiten_offen':
        return multiplier * (statsA.fehlzeiten_offen - statsB.fehlzeiten_offen);
      case 'sj_verspaetungen':
        return multiplier * ((schoolYearStats[studentA]?.verspaetungen_unentsch || 0) - 
                           (schoolYearStats[studentB]?.verspaetungen_unentsch || 0));
      case 'sj_fehlzeiten':
        return multiplier * ((schoolYearStats[studentA]?.fehlzeiten_unentsch || 0) - 
                           (schoolYearStats[studentB]?.fehlzeiten_unentsch || 0));
      case 'weekly_verspaetungen':
        return multiplier * ((weeklyStats[studentA]?.verspaetungen.total / parseInt(selectedWeeks) || 0) - 
                           (weeklyStats[studentB]?.verspaetungen.total / parseInt(selectedWeeks) || 0));
      case 'weekly_fehlzeiten':
        return multiplier * ((weeklyStats[studentA]?.fehlzeiten.total / parseInt(selectedWeeks) || 0) - 
                           (weeklyStats[studentB]?.fehlzeiten.total / parseInt(selectedWeeks) || 0));
      case 'sum_verspaetungen':
        return multiplier * ((weeklyStats[studentA]?.verspaetungen.total || 0) - 
                           (weeklyStats[studentB]?.verspaetungen.total || 0));
      case 'sum_fehlzeiten':
        return multiplier * ((weeklyStats[studentA]?.fehlzeiten.total || 0) - 
                           (weeklyStats[studentB]?.fehlzeiten.total || 0));
      default:
        return 0;
    }
  };

  const getSortedStudents = () => {
    return [...filteredStudents].sort((a, b) => {
      const sortEntries = Array.from(sortStates.values())
        .sort((x, y) => x.order - y.order);

      for (const sortState of sortEntries) {
        if (sortState.direction) {
          const comparison = compareValues(a, b, sortState.field, sortState.direction);
          if (comparison !== 0) return comparison;
        }
      }
      
      const [studentA, statsA] = a;
      const [studentB, statsB] = b;
      const classComparison = statsA.klasse.localeCompare(statsB.klasse);
      if (classComparison !== 0) return classComparison;
      return studentA.localeCompare(studentB);
    });
  };

  return (
    <div className="mt-6 space-y-6">
      <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4 flex-1">
            <h3 className="text-lg font-semibold">
              Ergebnisse für den Zeitraum {new Date(startDate).toLocaleDateString('de-DE')} - {new Date(endDate).toLocaleDateString('de-DE')}
            </h3>
            <div className="w-72">
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Namen eingeben..."
                className="w-full"
              />
            </div>
            <ClassFilter
              availableClasses={availableClasses}
              selectedClasses={selectedClasses}
              onChange={onClassesChange}
            />
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleAllDetails}
                >
                  {isAllExpanded ? 'Alle Details einklappen' : 'Alle Details ausklappen'}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>zeige unent. V./F. Zeitr.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      
      <div className="mt-4 flex gap-4 items-center">
        <ExportButtons 
          data={getSortedStudents()}
          startDate={startDate}
          endDate={endDate}
          schoolYearStats={schoolYearStats}
          weeklyStats={weeklyStats}
          selectedWeeks={selectedWeeks}
          isReportView={false}
          detailedData={detailedData}
          expandedStudents={expandedStudents}
          activeFilters={activeFilters}
        />
      </div>

      <div className="relative h-[500px]">
        <div className="absolute inset-0 overflow-x-auto overflow-y-auto">
          <table className="min-w-full border-collapse bg-white">
            <StudentTableHeader 
              onSort={handleSort}
              sortStates={sortStates}
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
