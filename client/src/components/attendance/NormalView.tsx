import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import StudentTableHeader from './table/StudentTableHeader';
import StudentTableRow from './table/StudentTableRow';
import StudentDetailsRow from './table/StudentDetailsRow';
import { StudentStats, AbsenceEntry, getLastNWeeks, getCurrentSchoolYear } from '@/lib/attendance-utils';

interface NormalViewProps {
  filteredStudents: [string, StudentStats][];
  detailedData: Record<string, {
    verspaetungen_entsch: AbsenceEntry[];
    verspaetungen_unentsch: AbsenceEntry[];
    verspaetungen_offen: AbsenceEntry[];
    fehlzeiten_entsch: AbsenceEntry[];
    fehlzeiten_unentsch: AbsenceEntry[];
    fehlzeiten_offen: AbsenceEntry[];
  }>;
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
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<{
    student: string;
    type: string;
  } | null>(null);

  const getFilteredDetailData = (student: string): AbsenceEntry[] => {
    if (!expandedStudent || !activeFilter || expandedStudent !== student) return [];

    const studentData = detailedData[student];
    if (!studentData) return [];

    // Return the appropriate entries based on the filter type
    switch (activeFilter.type) {
      case 'sj_verspaetungen': {
        // Schuljahresbezogene Anzeige - unabhängig vom gewählten Zeitraum
        const schoolYear = getCurrentSchoolYear();
        const sjStartDate = new Date(schoolYear.start, 8, 1); // 1. September
        const endDate = new Date(schoolYear.end, 7, 31); // 31. August

        return studentData.verspaetungen_unentsch
          .filter(entry => {
            if (entry.datum) {
              const date = new Date(entry.datum);
              return date >= sjStartDate && date <= endDate;
            }
            return false;
          })
          .sort((a, b) => new Date(b.datum).getTime() - new Date(a.datum).getTime());
      }

      case 'verspaetungen_entsch':
        return studentData.verspaetungen_entsch;
      case 'verspaetungen_unentsch':
        return studentData.verspaetungen_unentsch;
      case 'verspaetungen_offen':
        return studentData.verspaetungen_offen;
      case 'fehlzeiten_entsch':
        return studentData.fehlzeiten_entsch;
      case 'fehlzeiten_unentsch':
        return studentData.fehlzeiten_unentsch;
      case 'fehlzeiten_offen':
        return studentData.fehlzeiten_offen;
      case 'sj_fehlzeiten':
        return studentData.fehlzeiten_unentsch;

      case 'weekly_verspaetungen':
      case 'sum_verspaetungen': {
        const weeks = getLastNWeeks(parseInt(selectedWeeks));
        const studentWeeklyStats = weeklyStats[student];
        if (!studentWeeklyStats) return [];

        return studentData.verspaetungen_unentsch.filter(entry => {
          const date = new Date(entry.datum);
          const weekIndex = weeks.findIndex(week => 
            date >= week.startDate && date <= week.endDate
          );
          return weekIndex !== -1 && studentWeeklyStats.verspaetungen.weekly[weekIndex] > 0;
        });
      }
      case 'weekly_fehlzeiten':
      case 'sum_fehlzeiten': {
        const weeks = getLastNWeeks(parseInt(selectedWeeks));
        const studentWeeklyStats = weeklyStats[student];
        if (!studentWeeklyStats) return [];

        return studentData.fehlzeiten_unentsch.filter(entry => {
          const date = new Date(entry.datum);
          const weekIndex = weeks.findIndex(week => 
            date >= week.startDate && date <= week.endDate
          );
          return weekIndex !== -1 && studentWeeklyStats.fehlzeiten.weekly[weekIndex] > 0;
        });
      }
      default:
        return [];
    }
  };

  const toggleDetails = (student: string) => {
    if (expandedStudent === student && activeFilter?.type === 'details') {
      setExpandedStudent(null);
      setActiveFilter(null);
    } else {
      setExpandedStudent(student);
      setActiveFilter({ student, type: 'details' });
    }
  };

  const showFilteredDetails = (student: string, type: string) => {
    if (expandedStudent === student && activeFilter?.type === type) {
      setExpandedStudent(null);
      setActiveFilter(null);
    } else {
      setExpandedStudent(student);
      setActiveFilter({ student, type });
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
          onClick={() => {
            setExpandedStudent(null);
            setActiveFilter(null);
          }}
        >
          Alle Details einklappen
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
                  {expandedStudent === student && (
                    <StudentDetailsRow
                      student={student}
                      detailedData={getFilteredDetailData(student)}
                      rowColor={rowColor}
                      isVisible={true}
                      filterType={activeFilter?.type}
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