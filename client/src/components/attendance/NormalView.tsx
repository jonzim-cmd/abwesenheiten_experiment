import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import StudentTableHeader from './table/StudentTableHeader';
import StudentTableRow from './table/StudentTableRow';
import StudentDetailsRow from './table/StudentDetailsRow';
import { StudentStats } from '@/lib/attendance-utils';

interface NormalViewProps {
  filteredStudents: [string, StudentStats][];
  detailedData: Record<string, any>;
  startDate: string;
  endDate: string;
  schoolYearStats: Record<string, any>;
  weeklyStats: Record<string, any>;
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
    } else {
      setVisibleDetails(new Set(filteredStudents.map(([student]) => student)));
    }
  };

  const toggleDetails = (student: string) => {
    const newVisibleDetails = new Set(visibleDetails);
    if (newVisibleDetails.has(student)) {
      newVisibleDetails.delete(student);
    } else {
      newVisibleDetails.add(student);
    }
    setVisibleDetails(newVisibleDetails);

    // Wenn Details ausgeblendet werden, auch gefilterte Details ausblenden
    if (!newVisibleDetails.has(student)) {
      const newFilteredDetails = { ...filteredDetails };
      delete newFilteredDetails[student];
      setFilteredDetails(newFilteredDetails);
    }
  };

  const showFilteredDetails = (student: string, type: string, weekData?: number[]) => {
    const newFilteredDetails = { ...filteredDetails };
    if (newFilteredDetails[student]?.type === type) {
      delete newFilteredDetails[student];
    } else {
      newFilteredDetails[student] = { student, type, weekData };

      // Automatisch die Details einblenden, wenn sie noch nicht sichtbar sind
      if (!visibleDetails.has(student)) {
        setVisibleDetails(new Set([...visibleDetails, student]));
      }
    }
    setFilteredDetails(newFilteredDetails);
  };

  const getFilteredDetailData = (student: string, type: string, weekData?: number[]) => {
    if (!detailedData[student]) return [];

    switch (type) {
      case 'verspaetungen_entsch':
        return detailedData[student].filter(entry => 
          entry.art === 'Verspätung' && ['entsch.', 'Attest', 'Attest Amtsarzt'].includes(entry.status));
      case 'verspaetungen_unentsch':
        return detailedData[student].filter(entry => 
          entry.art === 'Verspätung' && ['nicht entsch.', 'nicht akzep.'].includes(entry.status));
      case 'verspaetungen_offen':
        return detailedData[student].filter(entry => 
          entry.art === 'Verspätung' && !['entsch.', 'Attest', 'Attest Amtsarzt', 'nicht entsch.', 'nicht akzep.'].includes(entry.status));
      case 'fehlzeiten_entsch':
        return detailedData[student].filter(entry => 
          entry.art !== 'Verspätung' && ['entsch.', 'Attest', 'Attest Amtsarzt'].includes(entry.status));
      case 'fehlzeiten_unentsch':
        return detailedData[student].filter(entry => 
          entry.art !== 'Verspätung' && ['nicht entsch.', 'nicht akzep.'].includes(entry.status));
      case 'fehlzeiten_offen':
        return detailedData[student].filter(entry => 
          entry.art !== 'Verspätung' && !['entsch.', 'Attest', 'Attest Amtsarzt', 'nicht entsch.', 'nicht akzep.'].includes(entry.status));
      case 'sj_verspaetungen':
      case 'sj_fehlzeiten':
        // Diese Daten kommen aus schoolYearStats und zeigen nur unentschuldigte Fälle
        return detailedData[student].filter(entry => 
          (type === 'sj_verspaetungen' ? entry.art === 'Verspätung' : entry.art !== 'Verspätung') && 
          ['nicht entsch.', 'nicht akzep.'].includes(entry.status));
      case 'weekly_verspaetungen':
      case 'weekly_fehlzeiten':
      case 'sum_verspaetungen':
      case 'sum_fehlzeiten':
        if (!weekData) return [];
        const weeks = getLastNWeeks(parseInt(selectedWeeks));
        return detailedData[student]
          .filter(entry => {
            const isVerspaetung = type.includes('verspaetungen');
            const matchesType = isVerspaetung ? entry.art === 'Verspätung' : entry.art !== 'Verspätung';
            if (!matchesType) return false;

            const entryDate = new Date(entry.datum);
            const weekIndex = weeks.findIndex(w => 
              entryDate >= w.startDate && entryDate <= w.endDate);

            return weekIndex !== -1 && weekData[weekIndex] > 0;
          });
      default:
        return detailedData[student];
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

import { getLastNWeeks } from '@/lib/attendance';
export default NormalView;