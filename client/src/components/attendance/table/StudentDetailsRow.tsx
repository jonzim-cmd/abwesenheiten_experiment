import React from 'react';
import { AbsenceEntry } from '@/lib/attendance-utils';

interface StudentDetailsRowProps {
  student: string;
  detailedData: AbsenceEntry[];
  rowColor: string;
  isVisible: boolean;
}

const StudentDetailsRow = ({ student, detailedData, rowColor, isVisible }: StudentDetailsRowProps) => {
  return (
    <tr id={`details-${student}`} style={{ display: isVisible ? 'table-row' : 'none' }} className={rowColor}>
      <td colSpan={14} className="px-4 py-2 text-sm">
        <div className="space-y-2">
          <h4 className="font-medium">Unentschuldigte Verspätungen:</h4>
          <div className="pl-4">
            {detailedData
              ?.filter(entry => entry.art === 'Verspätung')
              .map((entry, i) => (
                <div key={i} className="text-red-600">
                  {new Date(entry.datum).toLocaleDateString('de-DE', {
                    weekday: 'long',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                  })} ({entry.beginnZeit} - {entry.endZeit} Uhr)
                </div>
              )) || 'Keine'}
          </div>
          <h4 className="font-medium mt-4">Unentschuldigte Fehlzeiten:</h4>
          <div className="pl-4">
            {detailedData
              ?.filter(entry => entry.art !== 'Verspätung')
              .map((entry, i) => (
                <div key={i} className="text-red-600">
                  {new Date(entry.datum).toLocaleDateString('de-DE', {
                    weekday: 'long',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                  })} - {entry.art}
                  {entry.grund && ` (${entry.grund})`}
                </div>
              )) || 'Keine'}
          </div>
        </div>
      </td>
    </tr>
  );
};

export default StudentDetailsRow;
