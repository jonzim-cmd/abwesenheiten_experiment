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
        return 'Detaillierte Übersicht der Abwesenheiten';
      case 'verspaetungen_entsch':
        return 'Entschuldigte Verspätungen im ausgewählten Zeitraum';
      case 'verspaetungen_unentsch':
        return 'Unentschuldigte Verspätungen im ausgewählten Zeitraum';
      case 'verspaetungen_offen':
        return 'Noch zu entschuldigende Verspätungen (Frist läuft noch)';
      case 'fehlzeiten_entsch':
        return 'Entschuldigte Fehlzeiten im ausgewählten Zeitraum';
      case 'fehlzeiten_unentsch':
        return 'Unentschuldigte Fehlzeiten im ausgewählten Zeitraum';
      case 'fehlzeiten_offen':
        return 'Noch zu entschuldigende Fehlzeiten (Frist läuft noch)';
      case 'sj_verspaetungen':
        return 'Unentschuldigte Verspätungen im gesamten Schuljahr';
      case 'sj_fehlzeiten':
        return 'Unentschuldigte Fehlzeiten im gesamten Schuljahr';
      default:
        if (filterType?.startsWith('weekly_')) {
          const isVerspaetung = filterType.includes('verspaetungen');
          return `Unentschuldigte ${isVerspaetung ? 'Verspätungen' : 'Fehlzeiten'} (Wochendurchschnitt)`;
        }
        if (filterType?.startsWith('sum_')) {
          const isVerspaetung = filterType.includes('verspaetungen');
          return `Unentschuldigte ${isVerspaetung ? 'Verspätungen' : 'Fehlzeiten'} (Gesamtsumme)`;
        }
        return 'Abwesenheitsdetails';
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('de-DE', {
      weekday: 'long',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  return (
    <tr 
      id={`details-${student}`}
      style={{ display: isVisible ? 'table-row' : 'none' }}
      className={rowColor}
    >
      <td colSpan={14} className="px-4 py-2 text-sm">
        <div className="space-y-2">
          <h4 className="font-medium text-gray-900">{getFilterTitle()}</h4>
          <div className="pl-4">
            {detailedData.length > 0 ? (
              <div className="space-y-1">
                {detailedData.map((entry, i) => (
                  <div 
                    key={i}
                    className={`
                      ${entry.art === 'Verspätung' ? 'text-orange-600' : 'text-red-600'}
                      hover:bg-gray-50 p-1 rounded
                    `}
                  >
                    <span className="font-medium">{formatDate(entry.datum)}</span>
                    {entry.art === 'Verspätung' ? (
                      <span className="ml-2">
                        {entry.beginnZeit} - {entry.endZeit} Uhr
                        {entry.grund && ` (${entry.grund})`}
                      </span>
                    ) : (
                      <span className="ml-2">
                        {entry.art}
                        {entry.grund && ` - ${entry.grund}`}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-500 italic">Keine Einträge für den ausgewählten Zeitraum gefunden</div>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
};

export default StudentDetailsRow;