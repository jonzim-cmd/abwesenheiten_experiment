import React from 'react';
import { AbsenceEntry } from '@/lib/attendance-utils';

interface StudentDetailsRowProps {
  student: string;
  detailedData: AbsenceEntry[];
  rowColor: string;
  isVisible: boolean;
  filterType?: string;
}

const StudentDetailsRow = ({ student, detailedData, rowColor, isVisible, filterType }: StudentDetailsRowProps) => {
  const getFilterTitle = () => {
    switch (filterType) {
      case 'details':
        return 'Unentschuldigte Verspätungen und Fehlzeiten im ausgewählten Zeitraum';
      case 'verspaetungen_entsch':
        return 'Entschuldigte Verspätungen im ausgewählten Zeitraum';
      case 'verspaetungen_unentsch':
        return 'Unentschuldigte Verspätungen im ausgewählten Zeitraum';
      case 'verspaetungen_offen':
        return 'Offene Verspätungen im ausgewählten Zeitraum';
      case 'fehlzeiten_entsch':
        return 'Entschuldigte Fehlzeiten im ausgewählten Zeitraum';
      case 'fehlzeiten_unentsch':
        return 'Unentschuldigte Fehlzeiten im ausgewählten Zeitraum';
      case 'fehlzeiten_offen':
        return 'Offene Fehlzeiten im ausgewählten Zeitraum';
      case 'sj_verspaetungen':
        return 'Unentschuldigte Verspätungen im gesamten Schuljahr';
      case 'sj_fehlzeiten':
        return 'Unentschuldigte Fehlzeiten im gesamten Schuljahr';
      default:
        if (filterType?.startsWith('weekly_')) {
          const isVerspaetung = filterType.includes('verspaetungen');
          return `Unentschuldigte ${isVerspaetung ? 'Verspätungen' : 'Fehlzeiten'} (Durchschnitt)`;
        }
        if (filterType?.startsWith('sum_')) {
          const isVerspaetung = filterType.includes('verspaetungen');
          return `Unentschuldigte ${isVerspaetung ? 'Verspätungen' : 'Fehlzeiten'} (Summe)`;
        }
        return 'Details';
    }
  };

  return (
    <tr 
      id={`details-${student}`}
      style={{ display: isVisible ? 'table-row' : 'none' }}
      className={rowColor}
    >
      <td colSpan={14} className="px-4 py-2 text-sm">
        <div className="space-y-2">
          <h4 className="font-medium">{getFilterTitle()}</h4>
          <div className="pl-4">
            {detailedData.length > 0 ? (
              detailedData.map((entry, i) => (
                <div 
                  key={i}
                  className={`${entry.art === 'Verspätung' ? 'text-orange-600' : 'text-red-600'} mb-1`}
                >
                  {new Date(entry.datum).toLocaleDateString('de-DE', {
                    weekday: 'long',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                  })}
                  {entry.art === 'Verspätung' 
                    ? ` (${entry.beginnZeit} - ${entry.endZeit} Uhr)`
                    : ` - ${entry.art}${entry.grund ? ` (${entry.grund})` : ''}`
                  }
                </div>
              ))
            ) : (
              <div className="text-gray-500">Keine Einträge gefunden</div>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
};

export default StudentDetailsRow;