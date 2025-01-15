import React from 'react';
import { StudentStats, AbsenceEntry } from '@/lib/attendance-utils';
import StudentDetailsRow from './StudentDetailsRow';

interface AttendanceTableProps {
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
  expandedStudent: string | null;
  activeFilter: { student: string; type: string } | null;
  onShowFilteredDetails: (student: string, type: string) => void;
}

const AttendanceTable = ({
  filteredStudents,
  detailedData,
  startDate,
  endDate,
  expandedStudent,
  activeFilter,
  onShowFilteredDetails
}: AttendanceTableProps) => {
  return (
    <div className="overflow-x-auto border rounded-lg">
      <table className="min-w-full border-collapse bg-white">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r">
              Name (Klasse)
            </th>
            <th colSpan={3} className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r">
              Verspätungen
            </th>
            <th colSpan={3} className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Fehlzeiten
            </th>
          </tr>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r"></th>
            <th className="px-4 py-2 text-center text-xs font-medium text-green-600 tracking-wider border-r">E</th>
            <th className="px-4 py-2 text-center text-xs font-medium text-red-600 tracking-wider border-r">U</th>
            <th className="px-4 py-2 text-center text-xs font-medium text-yellow-600 tracking-wider border-r">O</th>
            <th className="px-4 py-2 text-center text-xs font-medium text-green-600 tracking-wider border-r">E</th>
            <th className="px-4 py-2 text-center text-xs font-medium text-red-600 tracking-wider border-r">U</th>
            <th className="px-4 py-2 text-center text-xs font-medium text-yellow-600 tracking-wider">O</th>
          </tr>
        </thead>
        <tbody>
          {filteredStudents.map(([student, stats], index) => {
            const rowColor = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
            const showDetails = expandedStudent === student && 
              ['verspaetungen_entsch', 'verspaetungen_unentsch', 'verspaetungen_offen',
               'fehlzeiten_entsch', 'fehlzeiten_unentsch', 'fehlzeiten_offen'].includes(activeFilter?.type || '');

            return (
              <React.Fragment key={student}>
                <tr className={rowColor}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 border-r">
                    {student} ({stats.klasse})
                  </td>
                  <td className="px-4 py-3 text-sm text-center text-green-600 border-r">
                    <span 
                      className="cursor-pointer hover:underline"
                      onClick={() => onShowFilteredDetails(student, 'verspaetungen_entsch')}
                    >
                      {stats.verspaetungen_entsch}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-center text-red-600 border-r">
                    <span 
                      className="cursor-pointer hover:underline"
                      onClick={() => onShowFilteredDetails(student, 'verspaetungen_unentsch')}
                    >
                      {stats.verspaetungen_unentsch}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-center text-yellow-600 border-r">
                    <span 
                      className="cursor-pointer hover:underline"
                      onClick={() => onShowFilteredDetails(student, 'verspaetungen_offen')}
                    >
                      {stats.verspaetungen_offen}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-center text-green-600 border-r">
                    <span 
                      className="cursor-pointer hover:underline"
                      onClick={() => onShowFilteredDetails(student, 'fehlzeiten_entsch')}
                    >
                      {stats.fehlzeiten_entsch}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-center text-red-600 border-r">
                    <span 
                      className="cursor-pointer hover:underline"
                      onClick={() => onShowFilteredDetails(student, 'fehlzeiten_unentsch')}
                    >
                      {stats.fehlzeiten_unentsch}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-center text-yellow-600">
                    <span 
                      className="cursor-pointer hover:underline"
                      onClick={() => onShowFilteredDetails(student, 'fehlzeiten_offen')}
                    >
                      {stats.fehlzeiten_offen}
                    </span>
                  </td>
                </tr>
                {showDetails && (
                  <StudentDetailsRow
                    student={student}
                    detailedData={detailedData[student][activeFilter!.type]}
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

export default AttendanceTable;
