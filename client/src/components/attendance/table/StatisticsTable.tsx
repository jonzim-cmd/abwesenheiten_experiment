import React from 'react';
import { StudentStats, AbsenceEntry, getCurrentSchoolYear } from '@/lib/attendance-utils';
import StudentDetailsRow from './StudentDetailsRow';

interface StatisticsTableProps {
  filteredStudents: [string, StudentStats][];
  detailedData: Record<string, {
    verspaetungen_entsch: AbsenceEntry[];
    verspaetungen_unentsch: AbsenceEntry[];
    verspaetungen_offen: AbsenceEntry[];
    fehlzeiten_entsch: AbsenceEntry[];
    fehlzeiten_unentsch: AbsenceEntry[];
    fehlzeiten_offen: AbsenceEntry[];
  }>;
  schoolYearStats: Record<string, {
    verspaetungen_unentsch: number;
    fehlzeiten_unentsch: number;
  }>;
  weeklyStats: Record<string, {
    verspaetungen: { total: number; weekly: number[] };
    fehlzeiten: { total: number; weekly: number[] };
  }>;
  selectedWeeks: string;
  expandedStudent: string | null;
  activeFilter: { student: string; type: string } | null;
  onShowFilteredDetails: (student: string, type: string, weekData?: number[]) => void;
}

const StatisticsTable = ({
  filteredStudents,
  detailedData,
  schoolYearStats,
  weeklyStats,
  selectedWeeks,
  expandedStudent,
  activeFilter,
  onShowFilteredDetails
}: StatisticsTableProps) => {
  const getDetailedData = (student: string, type: string): AbsenceEntry[] => {
    if (!detailedData[student]) return [];

    const studentData = detailedData[student];
    const schoolYear = getCurrentSchoolYear();
    const sjStartDate = new Date(schoolYear.start, 8, 1); // 1. September
    const sjEndDate = new Date(schoolYear.end, 7, 31); // 31. August

    if (type === 'sj_verspaetungen') {
      return studentData.verspaetungen_unentsch.filter(entry => {
        if (typeof entry.datum === 'string') {
          const [day, month, year] = entry.datum.split('.');
          const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          return date >= sjStartDate && date <= sjEndDate;
        }
        return false;
      });
    } else if (type === 'sj_fehlzeiten') {
      return studentData.fehlzeiten_unentsch.filter(entry => {
        if (typeof entry.datum === 'string') {
          const [day, month, year] = entry.datum.split('.');
          const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          return date >= sjStartDate && date <= sjEndDate;
        }
        return false;
      });
    }

    const baseType = type.replace('weekly_', '').replace('sum_', '');
    if (baseType === 'verspaetungen' || baseType === 'fehlzeiten') {
      return studentData[`${baseType}_unentsch`] || [];
    }
    return [];
  };

  return (
    <div className="overflow-x-auto border-l-0 rounded-r-lg">
      <table className="min-w-full border-collapse bg-white">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r invisible">
              Platzhalter
            </th>
            <th colSpan={2} className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r">
              Schuljahr
            </th>
            <th colSpan={2} className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r">
              ∅/Woche
            </th>
            <th colSpan={2} className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Summe
            </th>
          </tr>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r invisible">
              Platzhalter
            </th>
            <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 tracking-wider border-r">∑SJ V</th>
            <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 tracking-wider border-r">∑SJ F</th>
            <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 tracking-wider border-r">V</th>
            <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 tracking-wider border-r">F</th>
            <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 tracking-wider border-r">V</th>
            <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 tracking-wider">F</th>
          </tr>
        </thead>
        <tbody>
          {filteredStudents.map(([student, stats], index) => {
            const rowColor = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
            const schoolYearData = schoolYearStats[student] || {
              verspaetungen_unentsch: 0,
              fehlzeiten_unentsch: 0
            };
            const weeklyData = weeklyStats[student] || {
              verspaetungen: { total: 0, weekly: Array(parseInt(selectedWeeks)).fill(0) },
              fehlzeiten: { total: 0, weekly: Array(parseInt(selectedWeeks)).fill(0) }
            };
            const verspaetungenAvg = (weeklyData.verspaetungen.total / parseInt(selectedWeeks)).toFixed(2);
            const fehlzeitenAvg = (weeklyData.fehlzeiten.total / parseInt(selectedWeeks)).toFixed(2);
            const showDetails = expandedStudent === student && 
              ['sj_verspaetungen', 'sj_fehlzeiten', 'weekly_verspaetungen', 'weekly_fehlzeiten', 
               'sum_verspaetungen', 'sum_fehlzeiten'].includes(activeFilter?.type || '');

            return (
              <React.Fragment key={student}>
                <tr className={rowColor}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 border-r invisible">
                    Platzhalter
                  </td>
                  <td className="px-4 py-3 text-sm text-center border-r">
                    <span 
                      className="cursor-pointer hover:underline"
                      onClick={() => onShowFilteredDetails(student, 'sj_verspaetungen')}
                    >
                      {schoolYearData.verspaetungen_unentsch}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-center border-r">
                    <span 
                      className="cursor-pointer hover:underline"
                      onClick={() => onShowFilteredDetails(student, 'sj_fehlzeiten')}
                    >
                      {schoolYearData.fehlzeiten_unentsch}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-center border-r">
                    <span 
                      className="cursor-pointer hover:underline"
                      onClick={() => onShowFilteredDetails(student, 'weekly_verspaetungen', weeklyData.verspaetungen.weekly)}
                    >
                      {verspaetungenAvg}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-center border-r">
                    <span 
                      className="cursor-pointer hover:underline"
                      onClick={() => onShowFilteredDetails(student, 'weekly_fehlzeiten', weeklyData.fehlzeiten.weekly)}
                    >
                      {fehlzeitenAvg}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-center border-r">
                    <span 
                      className="cursor-pointer hover:underline"
                      onClick={() => onShowFilteredDetails(student, 'sum_verspaetungen', weeklyData.verspaetungen.weekly)}
                    >
                      {weeklyData.verspaetungen.total}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-center">
                    <span 
                      className="cursor-pointer hover:underline"
                      onClick={() => onShowFilteredDetails(student, 'sum_fehlzeiten', weeklyData.fehlzeiten.weekly)}
                    >
                      {weeklyData.fehlzeiten.total}
                    </span>
                  </td>
                </tr>
                {showDetails && (
                  <StudentDetailsRow
                    student={student}
                    detailedData={getDetailedData(student, activeFilter!.type)}
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
  );
};

export default StatisticsTable;