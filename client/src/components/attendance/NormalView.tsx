import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import StudentTableHeader from './table/StudentTableHeader';
import StudentTableRow from './table/StudentTableRow';
import StudentDetailsRow from './table/StudentDetailsRow';
import { StudentStats, AbsenceEntry, getLastNWeeks, getCurrentSchoolYear } from '@/lib/attendance-utils';

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
      // Expand all students with relevant cases
      const newExpandedStudents = new Set<string>();
      const newActiveFilters = new Map<string, string>();

      filteredStudents.forEach(([student, stats]) => {
        if (stats.verspaetungen_unentsch > 0 || 
            stats.fehlzeiten_unentsch > 0 ||
            stats.verspaetungen_offen > 0 ||
            stats.fehlzeiten_offen > 0) {
          newExpandedStudents.add(student);
          newActiveFilters.set(student, 'details');
        }
      });

      setExpandedStudents(newExpandedStudents);
      setActiveFilters(newActiveFilters);
    } else {
      // Collapse all
      setExpandedStudents(new Set());
      setActiveFilters(new Map());
    }
  };

  return (
    <div className="mt-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">
          Ergebnisse für den Zeitraum {new Date(startDate).toLocaleDateString('de-DE')} - {new Date(endDate).toLocaleDateString('de-DE')}
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={toggleAllDetails}
        >
          {isAllExpanded ? 'Alle Details einklappen' : 'Alle Details ausklappen'}
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse bg-white">
          <StudentTableHeader />
          <tbody>
            {filteredStudents.map(([student, stats], index) => {
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
  );
};

export default NormalView;