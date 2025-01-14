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
                  />
                  <StudentDetailsRow
                    student={student}
                    detailedData={detailedData[student] || []}
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