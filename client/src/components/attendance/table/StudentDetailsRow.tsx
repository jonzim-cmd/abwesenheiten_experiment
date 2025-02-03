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
  // Hilfsfunktion zur Formatierung von Datumsangaben
  const formatDate = (datum: Date | string) => {
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
    return datum.toLocaleDateString('de-DE', {
      weekday: 'long',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  // Hilfsfunktion zur Datumsumrechnung (in Millisekunden)
  const parseDateValue = (datum: string | Date): number => {
    if (datum instanceof Date) return datum.getTime();
    const [day, month, year] = datum.split('.');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).getTime();
  };

  // Bestimmt die Textfarbe für einen Eintrag anhand des Status und Datums
  const getStatusColor = (status: string, datum: Date | string) => {
    if (status === 'entsch.' || status === 'Attest' || status === 'Attest Amtsarzt') {
      return 'text-green-600';
    }
    if (status === 'nicht entsch.' || status === 'nicht akzep.') {
      return 'text-red-600';
    }
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
      if (today > deadlineDate) {
        return 'text-red-600';
      }
    }
    return 'text-yellow-600';
  };

  // Prüft, ob ein Eintrag unentschuldigt ist
  const isUnexcused = (entry: AbsenceEntry) => {
    const status = entry.status || '';
    const isUnentschuldigt = status === 'nicht entsch.' || status === 'nicht akzep.';
    if (!status.trim()) {
      const today = new Date();
      const dateParts = (typeof entry.datum === 'string'
        ? entry.datum
        : entry.datum.toLocaleDateString('de-DE')
      ).split('.');
      const entryDate = new Date(parseInt(dateParts[2]), parseInt(dateParts[1]) - 1, parseInt(dateParts[0]));
      const deadlineDate = new Date(entryDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      return today > deadlineDate;
    }
    return isUnentschuldigt;
  };

  // Rendert einen einzelnen Detail-Eintrag (Nummerierung, Datum, Zeiten/Art, ggf. Status)
  const renderEntry = (entry: AbsenceEntry, idx: number, total: number) => {
    const number = total - idx; // Größte Zahl ganz oben
    const statusColor = getStatusColor(entry.status || '', entry.datum);
    return (
      <div key={idx} className={`${statusColor} hover:bg-gray-50 p-1 rounded`}>
        <span className="font-medium">
          {number}. {formatDate(entry.datum)}
        </span>
        {entry.art === 'Verspätung' ? (
          <span className="ml-2">
            {entry.beginnZeit} - {entry.endZeit} Uhr{entry.grund && ` (${entry.grund})`}
          </span>
        ) : (
          <span className="ml-2">
            {entry.art}
            {entry.grund && ` - ${entry.grund}`}
          </span>
        )}
        {entry.status && (
          <span className="ml-2 italic">
            [{entry.status}]
          </span>
        )}
      </div>
    );
  };

  // Rendert den Inhalt der Details
  const renderDetailsContent = () => {
    if (!detailedData || detailedData.length === 0) {
      return <div className="text-gray-500 italic">Keine Daten verfügbar</div>;
    }

    // Bei Filtertyp "details" soll eine Tabelle mit drei Spalten dargestellt werden
    if (filterType === 'details') {
      // Aufteilen in die drei Kategorien:
      // Unentschuldigt: Entsprechende Einträge (unabhängig von der Art)
      const unexcusedEntries = detailedData
        .filter(entry => isUnexcused(entry))
        .sort((a, b) => parseDateValue(b.datum) - parseDateValue(a.datum));

      // Entschuldigt: Einträge, bei denen ein Status (z. B. "entsch.", "Attest", "Attest Amtsarzt") vorhanden ist
      const excusedEntries = detailedData
        .filter(entry => {
          const status = entry.status || '';
          return status.trim() !== '' && (status === 'entsch.' || status === 'Attest' || status === 'Attest Amtsarzt');
        })
        .sort((a, b) => parseDateValue(b.datum) - parseDateValue(a.datum));

      // Offen: Einträge ohne Status, bei denen die Frist (7 Tage) noch nicht abgelaufen ist
      const openEntries = detailedData
        .filter(entry => {
          const status = entry.status || '';
          if (status.trim()) return false;
          const today = new Date();
          const [day, month, year] = (typeof entry.datum === 'string'
            ? entry.datum
            : entry.datum.toLocaleDateString('de-DE')
          ).split('.');
          const entryDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          const deadlineDate = new Date(entryDate.getTime() + 7 * 24 * 60 * 60 * 1000);
          return today <= deadlineDate;
        })
        .sort((a, b) => parseDateValue(b.datum) - parseDateValue(a.datum));

      // Bestimme die maximale Anzahl an Einträgen, um die Zeilenanzahl der Tabelle festzulegen
      const maxRows = Math.max(unexcusedEntries.length, excusedEntries.length, openEntries.length);

      return (
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="px-2 py-1 border-b border-gray-300 text-left">Unentschuldigt</th>
                <th className="px-2 py-1 border-b border-gray-300 text-left">Entschuldigt</th>
                <th className="px-2 py-1 border-b border-gray-300 text-left">Offen</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: maxRows }).map((_, rowIndex) => (
                <tr key={rowIndex}>
                  <td className="px-2 py-1 border-b border-gray-200 align-top">
                    {unexcusedEntries[rowIndex] && renderEntry(unexcusedEntries[rowIndex], rowIndex, unexcusedEntries.length)}
                  </td>
                  <td className="px-2 py-1 border-b border-gray-200 align-top">
                    {excusedEntries[rowIndex] && renderEntry(excusedEntries[rowIndex], rowIndex, excusedEntries.length)}
                  </td>
                  <td className="px-2 py-1 border-b border-gray-200 align-top">
                    {openEntries[rowIndex] && renderEntry(openEntries[rowIndex], rowIndex, openEntries.length)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    // Für alle anderen Filtertypen: Bestehende Darstellung (sortiert nach Datum absteigend)
    const sortedData = [...detailedData].sort((a, b) => 
      parseDateValue(b.datum) - parseDateValue(a.datum)
    );

    return (
      <div className="space-y-1">
        {sortedData.length > 0 ? (
          sortedData.map((entry, i) => renderEntry(entry, i, sortedData.length))
        ) : (
          <div className="text-gray-500 italic">Keine Einträge für den ausgewählten Zeitraum gefunden</div>
        )}
      </div>
    );
  };

  // Titel der Detailanzeige, basierend auf dem Filtertyp
  const getFilterTitle = () => {
    switch (filterType) {
      case 'details':
        return 'Detaillierte Übersicht der unentschuldigten, entschuldigten und offenen Abwesenheiten';
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
            {renderDetailsContent()}
          </div>
        </div>
      </td>
    </tr>
  );
};

export default StudentDetailsRow;
