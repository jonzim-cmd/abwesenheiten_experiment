import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import StudentTableHeader from './table/StudentTableHeader';
import StudentTableRow from './table/StudentTableRow';
import StudentDetailsRow from './table/StudentDetailsRow';
import { StudentStats, AbsenceEntry, isEntschuldigt, isUnentschuldigt, isOffen } from '@/lib/attendance-utils';
import { getLastNWeeks, getCurrentSchoolYear } from '@/lib/attendance';

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

interface FilteredDetailState {
  student: string;
  type: string;
  weekData?: number[];
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
  const [visibleDetails, setVisibleDetails] = useState<Set<string>>(new Set());
  const [filteredDetails, setFilteredDetails] = useState<Record<string, FilteredDetailState>>({});

  const toggleAllDetails = () => {
    if (visibleDetails.size === filteredStudents.length) {
      setVisibleDetails(new Set());
      setFilteredDetails({}); // Alle gefilterten Details zurücksetzen
    } else {
      setVisibleDetails(new Set(filteredStudents.map(([student]) => student)));
    }
  };

  const toggleDetails = (student: string) => {
    const newVisibleDetails = new Set(visibleDetails);
    if (newVisibleDetails.has(student)) {
      newVisibleDetails.delete(student);
      // Gefilterte Details für diesen Schüler zurücksetzen
      const newFilteredDetails = { ...filteredDetails };
      delete newFilteredDetails[student];
      setFilteredDetails(newFilteredDetails);
    } else {
      newVisibleDetails.add(student);
    }
    setVisibleDetails(newVisibleDetails);
  };

  const showFilteredDetails = (student: string, type: string, weekData?: number[]) => {
    const newFilteredDetails = { ...filteredDetails };

    // Wenn der gleiche Filter erneut geklickt wird, alle Filter für diesen Schüler entfernen
    if (newFilteredDetails[student]?.type === type) {
      delete newFilteredDetails[student];
    } else {
      newFilteredDetails[student] = { student, type, weekData };
      // Automatisch die Details einblenden
      setVisibleDetails(new Set([...Array.from(visibleDetails), student]));
    }

    setFilteredDetails(newFilteredDetails);
  };

  const getFilteredDetailData = (student: string, type: string, weekData?: number[]) => {
    const data = detailedData[student] || [];

    switch (type) {
      case 'verspaetungen_entsch':
        return data.filter(entry => 
          entry.art === 'Verspätung' && isEntschuldigt(entry.status));

      case 'verspaetungen_unentsch':
        return data.filter(entry => 
          entry.art === 'Verspätung' && isUnentschuldigt(entry.status));

      case 'verspaetungen_offen':
        return data.filter(entry => 
          entry.art === 'Verspätung' && isOffen(entry.status));

      case 'fehlzeiten_entsch':
        return data.filter(entry => 
          entry.art !== 'Verspätung' && isEntschuldigt(entry.status));

      case 'fehlzeiten_unentsch':
        return data.filter(entry => 
          entry.art !== 'Verspätung' && isUnentschuldigt(entry.status));

      case 'fehlzeiten_offen':
        return data.filter(entry => 
          entry.art !== 'Verspätung' && isOffen(entry.status));

      case 'sj_verspaetungen':
      case 'sj_fehlzeiten': {
        const schoolYear = getCurrentSchoolYear();
        const startDate = new Date(schoolYear.start, 8, 1); // September 1st
        const endDate = new Date(schoolYear.end, 7, 31); // August 31st

        return data.filter(entry => {
          const entryDate = new Date(entry.datum);
          if (isNaN(entryDate.getTime())) return false;

          const isInSchoolYear = entryDate >= startDate && entryDate <= endDate;
          const isVerspaetung = entry.art === 'Verspätung';
          const matchesType = type === 'sj_verspaetungen' ? isVerspaetung : !isVerspaetung;

          return isInSchoolYear && isUnentschuldigt(entry.status) && matchesType;
        });
      }

      case 'weekly_verspaetungen':
      case 'weekly_fehlzeiten':
      case 'sum_verspaetungen':
      case 'sum_fehlzeiten': {
        if (!weekData) return [];
        const weeks = getLastNWeeks(parseInt(selectedWeeks));

        return data.filter(entry => {
          const entryDate = new Date(entry.datum);
          if (isNaN(entryDate.getTime())) return false;

          const isVerspaetung = type.includes('verspaetungen');
          const matchesType = isVerspaetung ? entry.art === 'Verspätung' : entry.art !== 'Verspätung';

          if (!matchesType || !isUnentschuldigt(entry.status)) return false;

          const weekIndex = weeks.findIndex(w => 
            entryDate >= w.startDate && entryDate <= w.endDate
          );

          return weekIndex !== -1 && weekData[weekIndex] > 0;
        });
      }

      default:
        return data;
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
          {visibleDetails.size === filteredStudents.length ? 'Alle Details einklappen' : 'Alle Details ausklappen'}
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
                    detailedData={
                      filteredDetails[student]
                        ? getFilteredDetailData(
                            student,
                            filteredDetails[student].type,
                            filteredDetails[student].weekData
                          )
                        : detailedData[student] || []
                    }
                    rowColor={rowColor}
                    isVisible={visibleDetails.has(student)}
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