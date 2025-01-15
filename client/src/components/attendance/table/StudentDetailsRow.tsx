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

  const formatDate = (datum: Date | string) => {
    // Wenn datum ein String im Format "DD.MM.YYYY" ist
    if (typeof datum === 'string') {
      const [day, month, year] = datum.split('.');
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return date.toLocaleDateString('de-DE', {
        weekday: 'long',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    }
    // Wenn datum bereits ein Date-Objekt ist
    return datum.toLocaleDateString('de-DE', {
      weekday: 'long',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const getStatusColor = (status: string, datum: Date | string) => {
    // Für entschuldigte Abwesenheiten (grün)
    if (status === 'entsch.' || status === 'Attest' || status === 'Attest Amtsarzt') {
      return 'text-green-600';
    }

    // Für unentschuldigte Abwesenheiten (rot)
    if (status === 'nicht entsch.' || status === 'nicht akzep.') {
      return 'text-red-600';
    }

    // Für leeren Status prüfen wir die 7-Tage-Frist
    if (!status || status.trim() === '') {
      const today = new Date();
      let abwesenheitsDatum: Date;

      if (typeof datum === 'string') {
        const [day, month, year] = datum.split('.');
        abwesenheitsDatum = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      } else {
        abwesenheitsDatum = new Date(datum);
      }

      const deadlineDate = new Date(abwesenheitsDatum.getTime() + 7 * 24 * 60 * 60 * 1000);

      // Nach der Frist -> unentschuldigt (rot)
      if (today > deadlineDate) {
        return 'text-red-600';
      }
    }

    // Standardfall: offen/in Bearbeitung (gelb)
    return 'text-yellow-600';
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
                {detailedData.map((entry, i) => {
                  const statusColor = getStatusColor(entry.status || '', entry.datum);
                  return (
                    <div 
                      key={i}
                      className={`${statusColor} hover:bg-gray-50 p-1 rounded`}
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
                      {entry.status && (
                        <span className={`ml-2 italic`}>
                          [{entry.status}]
                        </span>
                      )}
                    </div>
                  );
                })}
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