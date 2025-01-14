import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import StudentTableHeader from './table/StudentTableHeader';
import StudentTableRow from './table/StudentTableRow';
import StudentDetailsRow from './table/StudentDetailsRow';
import { StudentStats, AbsenceEntry, isEntschuldigt, isUnentschuldigt, isOffen } from '@/lib/attendance-utils';
import { getLastNWeeks, getCurrentSchoolYear } from '@/lib/attendance-utils';

interface NormalViewProps {
  filteredStudents: [string, StudentStats][];
  detailedData: Record<string, AbsenceEntry[]>;
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
  startDate, 
  endDate, 
  schoolYearStats, 
  weeklyStats, 
  selectedWeeks 
}: NormalViewProps) => {
  // State for expanded student and active filter
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<{
    type: string;
    weekData?: number[];
  } | null>(null);

  // Close all details
  const toggleAllDetails = () => {
    setExpandedStudent(null);
    setActiveFilter(null);
  };

  // Toggle details for a single student
  const toggleDetails = (student: string) => {
    if (expandedStudent === student) {
      setExpandedStudent(null);
      setActiveFilter(null);
    } else {
      setExpandedStudent(student);
      setActiveFilter(null);
    }
  };

  // Show filtered details
  const showFilteredDetails = (student: string, type: string, weekData?: number[]) => {
    // If clicking the same filter again, close details completely
    if (expandedStudent === student && activeFilter?.type === type) {
      setExpandedStudent(null);
      setActiveFilter(null);
      return;
    }

    // Set new student and filter
    setExpandedStudent(student);
    setActiveFilter({ type, weekData });
  };

  // Get filtered data based on current filter
  const getFilteredDetailData = (student: string): AbsenceEntry[] => {
    if (!expandedStudent || !activeFilter || expandedStudent !== student) {
      return [];
    }

    const entries = detailedData[student] || [];
    const { type, weekData } = activeFilter;

    // Helper function to check if entry is within date range
    const isInRange = (date: Date, start: Date, end: Date) => 
      date >= start && date <= end;

    // Period filters (E/U/O)
    if (type.includes('_entsch') || type.includes('_unentsch') || type.includes('_offen')) {
      const periodStart = new Date(startDate);
      const periodEnd = new Date(endDate);
      const isLate = type.startsWith('verspaetungen');
      const statusType = type.split('_')[1]; // 'entsch', 'unentsch', or 'offen'

      return entries.filter(entry => {
        const entryDate = new Date(entry.datum);

        // Check if entry is within the selected period
        if (!isInRange(entryDate, periodStart, periodEnd)) return false;

        // Check if entry type matches (late or absence)
        const matchesType = isLate ? 
          entry.art === 'Verspätung' : 
          entry.art !== 'Verspätung';
        if (!matchesType) return false;

        // Check status based on filter type
        switch (statusType) {
          case 'entsch': return isEntschuldigt(entry.status);
          case 'unentsch': return isUnentschuldigt(entry.status);
          case 'offen': return isOffen(entry.status);
          default: return false;
        }
      });
    }

    // School year statistics (∑SJ V/F)
    if (type.startsWith('sj_')) {
      const schoolYear = getCurrentSchoolYear();
      const schoolYearStart = new Date(schoolYear.start, 8, 1); // September 1st
      const today = new Date();
      const isLate = type === 'sj_verspaetungen';

      return entries.filter(entry => {
        const entryDate = new Date(entry.datum);

        // Check if entry is within the school year
        if (!isInRange(entryDate, schoolYearStart, today)) return false;

        // Must be unexcused and match the type (late or absence)
        return isUnentschuldigt(entry.status) && 
               (isLate ? entry.art === 'Verspätung' : entry.art !== 'Verspätung');
      });
    }

    // Weekly statistics
    if (weekData && (type.includes('weekly_') || type.includes('sum_'))) {
      const weeks = getLastNWeeks(parseInt(selectedWeeks));
      const isLate = type.includes('verspaetungen');

      return entries.filter(entry => {
        // Must be unexcused
        if (!isUnentschuldigt(entry.status)) return false;

        const entryDate = new Date(entry.datum);

        // Check type (late or absence)
        const matchesType = isLate ? 
          entry.art === 'Verspätung' : 
          entry.art !== 'Verspätung';
        if (!matchesType) return false;

        // Find matching week and check if there's a value > 0
        const weekIndex = weeks.findIndex(week => 
          isInRange(entryDate, week.startDate, week.endDate)
        );

        return weekIndex !== -1 && weekData[weekIndex] > 0;
      });
    }

    return [];
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
          {expandedStudent ? 'Alle Details einklappen' : 'Alle Details ausklappen'}
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
                  <StudentDetailsRow
                    student={student}
                    detailedData={getFilteredDetailData(student)}
                    rowColor={rowColor}
                    isVisible={expandedStudent === student}
                  />
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