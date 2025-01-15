import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import AttendanceTable from './table/AttendanceTable';
import StatisticsTable from './table/StatisticsTable';
import { StudentStats, AbsenceEntry } from '@/lib/attendance-utils';

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

  const showFilteredDetails = (student: string, type: string, weekData?: number[]) => {
    if (expandedStudent === student && activeFilter?.type === type) {
      setExpandedStudent(null);
      setActiveFilter(null);
    } else {
      setExpandedStudent(student);
      setActiveFilter({ student, type });
    }
  };

  return (
    <div className="mt-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">
          Ergebnisse für den Zeitraum {new Date(startDate).toLocaleDateString('de-DE')} - {new Date(endDate).toLocaleDateString('de-DE')}
        </h3>
        <div className="flex justify-end mb-4">
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
      </div>

      <div className="flex flex-row space-x-0">
        <AttendanceTable
          filteredStudents={filteredStudents}
          detailedData={detailedData}
          startDate={startDate}
          endDate={endDate}
          expandedStudent={expandedStudent}
          activeFilter={activeFilter}
          onShowFilteredDetails={showFilteredDetails}
        />

        <StatisticsTable
          filteredStudents={filteredStudents}
          detailedData={detailedData}
          schoolYearStats={schoolYearStats}
          weeklyStats={weeklyStats}
          selectedWeeks={selectedWeeks}
          expandedStudent={expandedStudent}
          activeFilter={activeFilter}
          onShowFilteredDetails={showFilteredDetails}
        />
      </div>
    </div>
  );
};

export default NormalView;