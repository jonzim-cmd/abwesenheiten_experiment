import React from 'react';
import { Button } from "@/components/ui/button";
import { StudentStats } from '@/lib/attendance-utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface StudentTableRowProps {
  student: string;
  index: number;
  stats: StudentStats;
  schoolYearData: {
    verspaetungen_unentsch: number;
    fehlzeiten_unentsch: number;
    fehlzeiten_gesamt: number;
  };
  weeklyData: {
    verspaetungen: { total: number; weekly: number[] };
    fehlzeiten: { total: number; weekly: number[] };
  };
  selectedWeeks: string;
  rowColor: string;
  onToggleDetails: () => void;
  onShowFilteredDetails: (student: string, type: string, weekData?: number[]) => void;
  isChecked: boolean;
  onToggleChecked: () => void;
}

const StudentTableRow = ({
  student,
  index,
  stats,
  schoolYearData,
  weeklyData,
  selectedWeeks,
  rowColor,
  onToggleDetails,
  onShowFilteredDetails,
  isChecked,
  onToggleChecked
}: StudentTableRowProps) => {
  const verspaetungenAvg = (weeklyData.verspaetungen.total / parseInt(selectedWeeks)).toFixed(2);
  const fehlzeitenAvg = (weeklyData.fehlzeiten.total / parseInt(selectedWeeks)).toFixed(2);

  const verspaetungenSum = `${weeklyData.verspaetungen.total}(${weeklyData.verspaetungen.weekly.join(',')})`;
  const fehlzeitenSum = `${weeklyData.fehlzeiten.total}(${weeklyData.fehlzeiten.weekly.join(',')})`;

  const createClickableCell = (value: number, type: string, className: string = "") => (
    <span
      className={`cursor-pointer hover:underline ${className}`}
      onClick={() => onShowFilteredDetails(student, type)}
    >
      {value}
    </span>
  );

  const createClickableWeeklyCell = (displayText: string, weeklyData: number[], type: string) => (
    <span
      className="cursor-pointer hover:underline"
      onClick={() => onShowFilteredDetails(student, type, weeklyData)}
    >
      {displayText}
    </span>
  );

  return (
    <tr className={rowColor}>
      <td className="px-4 py-3 text-sm font-medium text-gray-900 border-r border-gray-200 text-center">
        {index + 1}
      </td>
      <td className="px-4 py-3 text-sm font-medium text-gray-900 border-r border-gray-200 truncate">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isChecked}
            onChange={onToggleChecked}
            className="form-checkbox h-4 w-4"
            title="Schüler als geprüft markieren"
          />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-pointer hover:underline" onClick={onToggleDetails}>
                  {student}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  zeige unent. V./F. Zeitr.: {stats.verspaetungen_unentsch}/{stats.fehlzeiten_unentsch}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </td>
      <td className="px-4 py-3 text-sm font-medium text-gray-900 border-r border-gray-200">
        {stats.klasse}
      </td>
      <td className="px-4 py-3 text-sm text-center text-green-600 border-r border-gray-200">
        {createClickableCell(stats.verspaetungen_entsch, 'verspaetungen_entsch', 'text-green-600')}
      </td>
      <td className="px-4 py-3 text-sm text-center text-red-600 border-r border-gray-200">
        {createClickableCell(stats.verspaetungen_unentsch, 'verspaetungen_unentsch', 'text-red-600')}
      </td>
      <td className="px-4 py-3 text-sm text-center text-yellow-600 border-r border-gray-200">
        {createClickableCell(stats.verspaetungen_offen, 'verspaetungen_offen', 'text-yellow-600')}
      </td>
      <td className="px-4 py-3 text-sm text-center text-green-600 border-r border-gray-200">
        {createClickableCell(stats.fehlzeiten_entsch, 'fehlzeiten_entsch', 'text-green-600')}
      </td>
      <td className="px-4 py-3 text-sm text-center text-red-600 border-r border-gray-200">
        {createClickableCell(stats.fehlzeiten_unentsch, 'fehlzeiten_unentsch', 'text-red-600')}
      </td>
      <td className="px-4 py-3 text-sm text-center text-yellow-600 border-r border-gray-200">
        {createClickableCell(stats.fehlzeiten_offen, 'fehlzeiten_offen', 'text-yellow-600')}
      </td>
      <td className="px-4 py-3 text-sm text-center text-red-600 border-r border-gray-200">
        {createClickableCell(schoolYearData.verspaetungen_unentsch, 'sj_verspaetungen', 'text-red-600')}
      </td>
      <td className="px-4 py-3 text-sm text-center text-red-600 border-r border-gray-200">
        {createClickableCell(schoolYearData.fehlzeiten_unentsch, 'sj_fehlzeiten', 'text-red-600')}
      </td>
      <td className="px-4 py-3 text-sm text-center text-black border-r border-gray-200">
        {createClickableCell(schoolYearData.fehlzeiten_gesamt, 'sj_fehlzeiten_ges', 'text-black')}
      </td>
      <td className="px-4 py-3 text-sm text-center border-r border-gray-200">
        {createClickableWeeklyCell(verspaetungenSum, weeklyData.verspaetungen.weekly, 'sum_verspaetungen')}
      </td>
      <td className="px-4 py-3 text-sm text-center border-r border-gray-200">
        {createClickableWeeklyCell(fehlzeitenSum, weeklyData.fehlzeiten.weekly, 'sum_fehlzeiten')}
      </td>
      {/* Die Spalten Øx() V und Øx() F wurden entfernt */}
      <td className="px-4 py-3 text-sm text-center">
        {/* Detailbutton entfernt */}
      </td>
    </tr>
  );
};

export default StudentTableRow;
