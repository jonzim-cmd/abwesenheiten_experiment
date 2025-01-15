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
        // Schuljahresbezogene Anzeige
        const schoolYear = getCurrentSchoolYear();
        const sjStartDate = new Date(schoolYear.start, 8, 1); // 1. September
        const endDate = new Date(schoolYear.end, 7, 31); // 31. August

        return studentData.verspaetungen_unentsch
          .filter(entry => {
            if (typeof entry.datum === 'string') {
              const [day, month, year] = entry.datum.split('.');
              const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
              return date >= sjStartDate && date <= endDate;
            }
            return false;
          })
          .sort((a, b) => {
            const [dayA, monthA, yearA] = a.datum.toString().split('.');
            const [dayB, monthB, yearB] = b.datum.toString().split('.');
            const dateA = new Date(parseInt(yearA), parseInt(monthA) - 1, parseInt(dayA));
            const dateB = new Date(parseInt(yearB), parseInt(monthB) - 1, parseInt(dayB));
            return dateB.getTime() - dateA.getTime();
          });
      }

      case 'verspaetungen_entsch':
      case 'verspaetungen_unentsch':
      case 'verspaetungen_offen':
      case 'fehlzeiten_entsch':
      case 'fehlzeiten_unentsch':
      case 'fehlzeiten_offen': {
        // Zeitraumbezogene Anzeige
        const entries = studentData[activeFilter.type];
        return entries.filter(entry => {
          if (typeof entry.datum === 'string') {
            const [day, month, year] = entry.datum.split('.');
            const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            return date >= new Date(startDate) && date <= new Date(endDate);
          }
          return false;
        });
      }

      case 'weekly_verspaetungen':
      case 'weekly_fehlzeiten':
      case 'sum_verspaetungen':
      case 'sum_fehlzeiten': {
        // Wochenbezogene Anzeige
        const weeks = getLastNWeeks(parseInt(selectedWeeks));
        const isVerspaetung = activeFilter.type.includes('verspaetungen');
        const entries = isVerspaetung ? studentData.verspaetungen_unentsch : studentData.fehlzeiten_unentsch;

        return entries.filter(entry => {
          if (typeof entry.datum === 'string') {
            const [day, month, year] = entry.datum.split('.');
            const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            return weeks.some(week => date >= week.startDate && date <= week.endDate);
          }
          return false;
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