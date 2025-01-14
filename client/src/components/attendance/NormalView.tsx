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
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<{
    type: string;
    weekData?: number[];
  } | null>(null);

  // Hilfsfunktion: Prüft ob ein Datum im Zeitraum liegt
  const isInDateRange = (date: Date, start: Date, end: Date): boolean => {
    return date >= start && date <= end;
  };

  // Alle Details schließen
  const toggleAllDetails = () => {
    setExpandedStudent(null);
    setActiveFilter(null);
  };

  // Details für einen einzelnen Schüler ein-/ausblenden
  const toggleDetails = (student: string) => {
    if (expandedStudent === student) {
      setExpandedStudent(null);
      setActiveFilter(null);
    } else {
      setExpandedStudent(student);
      setActiveFilter({ type: 'details' });
    }
  };

  // Gefilterte Details anzeigen
  const showFilteredDetails = (student: string, type: string, weekData?: number[]) => {
    // Wenn der gleiche Filter für den gleichen Schüler erneut geklickt wird, alles ausblenden
    if (expandedStudent === student && activeFilter?.type === type) {
      setExpandedStudent(null);
      setActiveFilter(null);
      return;
    }

    setExpandedStudent(student);
    setActiveFilter({ type, weekData });
  };

  // Detaildaten basierend auf aktivem Filter filtern
  const getFilteredDetailData = (student: string): AbsenceEntry[] => {
    if (!expandedStudent || expandedStudent !== student || !activeFilter) return [];

    const entries = detailedData[student] || [];
    if (!entries.length) return [];

    const { type, weekData } = activeFilter;

    // 1. Detail-Button (zeigt alle unentschuldigten Fälle im Zeitraum)
    if (type === 'details') {
      const start = new Date(startDate);
      const end = new Date(endDate);

      return entries.filter(entry => {
        const date = new Date(entry.datum);
        return isInDateRange(date, start, end) && isUnentschuldigt(entry.status);
      });
    }

    // 2. E/U/O Filter (zeigt entsprechende Fälle im Zeitraum)
    if (type.includes('_entsch') || type.includes('_unentsch') || type.includes('_offen')) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const isVerspaetung = type.startsWith('verspaetungen');
      const statusType = type.split('_')[1];

      return entries.filter(entry => {
        // Prüfe Zeitraum
        const date = new Date(entry.datum);
        if (!isInDateRange(date, start, end)) return false;

        // Prüfe Typ (Verspätung oder Fehlzeit)
        const matchesType = isVerspaetung ? 
          entry.art === 'Verspätung' : 
          entry.art !== 'Verspätung';
        if (!matchesType) return false;

        // Prüfe Status (E/U/O)
        if (statusType === 'entsch') return isEntschuldigt(entry.status);
        if (statusType === 'unentsch') return isUnentschuldigt(entry.status);
        if (statusType === 'offen') return isOffen(entry.status);
        return false;
      });
    }

    // 3. Schuljahresstatistik (zeigt unentschuldigte Fälle des gesamten Schuljahres)
    if (type.startsWith('sj_')) {
      const schoolYear = getCurrentSchoolYear();
      const start = new Date(schoolYear.start, 8, 1); // 1. September
      const end = new Date();
      const isVerspaetung = type === 'sj_verspaetungen';

      return entries.filter(entry => {
        if (!isUnentschuldigt(entry.status)) return false;

        const date = new Date(entry.datum);
        if (!isInDateRange(date, start, end)) return false;

        return isVerspaetung ? 
          entry.art === 'Verspätung' : 
          entry.art !== 'Verspätung';
      });
    }

    // 4. Wochenstatistik (zeigt unentschuldigte Fälle der ausgewählten Wochen)
    if (weekData && (type.includes('weekly_') || type.includes('sum_'))) {
      const weeks = getLastNWeeks(parseInt(selectedWeeks));
      const isVerspaetung = type.includes('verspaetungen');

      return entries.filter(entry => {
        if (!isUnentschuldigt(entry.status)) return false;

        const matchesType = isVerspaetung ? 
          entry.art === 'Verspätung' : 
          entry.art !== 'Verspätung';
        if (!matchesType) return false;

        // Finde die entsprechende Woche
        const date = new Date(entry.datum);
        const weekIndex = weeks.findIndex(week => 
          isInDateRange(date, week.startDate, week.endDate)
        );

        // Zeige nur Fälle aus Wochen mit Werten > 0
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