import React from 'react';
import { Button } from "@/components/ui/button";
import { StudentStats } from '@/lib/attendance-utils';

interface StudentTableRowProps {
  student: string;
  stats: StudentStats;
  schoolYearData: {
    verspaetungen_unentsch: number;
    fehlzeiten_unentsch: number;
  };
  weeklyData: {
    verspaetungen: { total: number; weekly: number[] };
    fehlzeiten: { total: number; weekly: number[] };
  };
  selectedWeeks: string;
  rowColor: string;
  onToggleDetails: () => void;
}

const StudentTableRow = ({
  student,
  stats,
  schoolYearData,
  weeklyData,
  selectedWeeks,
  rowColor,
  onToggleDetails
}: StudentTableRowProps) => {
  const verspaetungenAvg = (weeklyData.verspaetungen.total / parseInt(selectedWeeks)).toFixed(2);
  const fehlzeitenAvg = (weeklyData.fehlzeiten.total / parseInt(selectedWeeks)).toFixed(2);
  
  const verspaetungenWeekly = `${verspaetungenAvg}(${weeklyData.verspaetungen.weekly.join(',')})`;
  const fehlzeitenWeekly = `${fehlzeitenAvg}(${weeklyData.fehlzeiten.weekly.join(',')})`;
  
  const verspaetungenSum = `${weeklyData.verspaetungen.total}(${weeklyData.verspaetungen.weekly.join(',')})`;
  const fehlzeitenSum = `${weeklyData.fehlzeiten.total}(${weeklyData.fehlzeiten.weekly.join(',')})`;

  return (
    <tr className={rowColor}>
      <td className="px-4 py-3 text-sm font-medium text-gray-900 border-r border-gray-200">
        {student} ({stats.klasse})
      </td>
      <td className="px-4 py-3 text-sm text-center text-green-600 border-r border-gray-200">
        {stats.verspaetungen_entsch}
      </td>
      <td className="px-4 py-3 text-sm text-center text-red-600 border-r border-gray-200">
        {stats.verspaetungen_unentsch}
      </td>
      <td className="px-4 py-3 text-sm text-center text-yellow-600 border-r border-gray-200">
        {stats.verspaetungen_offen}
      </td>
      <td className="px-4 py-3 text-sm text-center text-green-600 border-r border-gray-200">
        {stats.fehlzeiten_entsch}
      </td>
      <td className="px-4 py-3 text-sm text-center text-red-600 border-r border-gray-200">
        {stats.fehlzeiten_unentsch}
      </td>
      <td className="px-4 py-3 text-sm text-center text-yellow-600 border-r border-gray-200">
        {stats.fehlzeiten_offen}
      </td>
      <td className="px-4 py-3 text-sm text-center border-r border-gray-200">
        {schoolYearData.verspaetungen_unentsch}
      </td>
      <td className="px-4 py-3 text-sm text-center border-r border-gray-200">
        {schoolYearData.fehlzeiten_unentsch}
      </td>
      <td className="px-4 py-3 text-sm text-center border-r border-gray-200">
        {verspaetungenWeekly}
      </td>
      <td className="px-4 py-3 text-sm text-center border-r border-gray-200">
        {fehlzeitenWeekly}
      </td>
      <td className="px-4 py-3 text-sm text-center border-r border-gray-200">
        {verspaetungenSum}
      </td>
      <td className="px-4 py-3 text-sm text-center border-r border-gray-200">
        {fehlzeitenSum}
      </td>
      <td className="px-4 py-3 text-sm text-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleDetails}
        >
          Details
        </Button>
      </td>
    </tr>
  );
};

export default StudentTableRow;
