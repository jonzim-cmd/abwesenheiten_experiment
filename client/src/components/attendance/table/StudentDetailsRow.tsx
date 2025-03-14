import React from 'react';
import { AbsenceEntry, getLastNWeeks } from '@/lib/attendance-utils';

interface StudentDetailsRowProps {
  student: string;
  detailedData: AbsenceEntry[];
  rowColor: string;
  isVisible: boolean;
  filterType?: string;
  selectedWeeks: string;
}

const StudentDetailsRow = ({ student, detailedData, rowColor, isVisible, filterType, selectedWeeks }: StudentDetailsRowProps) => {
  const getFilterTitle = () => {
    switch (filterType) {
      case 'details':
        return 'Detaillierte Übersicht der unentschuldigten Abwesenheiten';
      case 'verspaetungen_entsch':
        return 'Entschuldigte Verspätungen im ausgewählten Zeitraum';
      case 'verspaetungen_unentsch':
        return 'Unentschuldigte Verspätungen im ausgewählten Zeitraum';
      case 'verspaetungen_offen':
        return 'Noch zu entschuldigende Verspätungen (Frist läuft noch)';
      case 'fehlzeiten_entsch':
        return 'Entschuldigte Fehltage im ausgewählten Zeitraum';
      case 'fehlzeiten_unentsch':
        return 'Unentschuldigte Fehltage im ausgewählten Zeitraum';
      case 'fehlzeiten_offen':
        return 'Noch zu entschuldigende Fehltage im ausgewählten Zeitraum (Frist läuft noch)';
      case 'sj_verspaetungen':
        return 'Unentschuldigte Verspätungen im gesamten Schuljahr (der Übersichtlichkeit halber werden auch entschuldigte und offene Verspätungen mit angezeigt)';
      case 'sj_fehlzeiten':
        return 'Unentschuldigte Fehlzeiten im gesamten Schuljahr';
      case 'sj_fehlzeiten_ges':
        return 'Gesamte Fehlzeiten im gesamten Schuljahr (entschuldigt, unentschuldigt und offen)';
      default:
        if (filterType?.startsWith('sum_')) {
          const isVerspaetung = filterType.includes('verspaetungen');
          return `Unentschuldigte ${isVerspaetung ? 'Verspätungen' : 'Fehlzeiten'} (Details nach Wochen)`;
        }
        return 'Abwesenheitsdetails';
    }
  };

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

  const renderDetailSection = (entries: AbsenceEntry[], title: string) => {
    if (!entries || entries.length === 0) return null;

    return (
      <div className="mb-4">
        <h5 className="font-medium text-gray-700 mb-2">{title}</h5>
        <div className="space-y-1 pl-4">
          {entries.map((entry, i) => {
            const statusColor = getStatusColor(entry.status || '', entry.datum);
            const reverseIndex = entries.length - i;
            return (
              <div 
                key={i}
                className={`${statusColor} hover:bg-gray-50 p-1 rounded`}
              >
                <span className="font-medium">{reverseIndex}. {formatDate(entry.datum)}</span>
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
                  <span className="ml-2 italic">
                    [{entry.status}]
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const isUnexcused = (entry: AbsenceEntry) => {
    const status = entry.status || '';
    const isUnentschuldigt = status === 'nicht entsch.' || status === 'nicht akzep.';

    if (!status.trim()) {
      const today = new Date();
      const dateParts = (typeof entry.datum === 'string' ? entry.datum : entry.datum.toLocaleDateString('de-DE')).split('.');
      const entryDate = new Date(parseInt(dateParts[2]), parseInt(dateParts[1]) - 1, parseInt(dateParts[0]));
      const deadlineDate = new Date(entryDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      return today > deadlineDate;
    }

    return isUnentschuldigt;
  };

  const parseDateString = (datum: string | Date): Date => {
    if (typeof datum === 'string') {
      const [day, month, year] = datum.split('.');
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    return datum;
  };

  const groupEntriesByWeek = (entries: AbsenceEntry[], weeks: { startDate: Date; endDate: Date }[]) => {
    const grouped: AbsenceEntry[][] = weeks.map(() => []);
    entries.forEach(entry => {
      const entryDate = parseDateString(entry.datum);
      const weekIndex = weeks.findIndex(week => entryDate >= week.startDate && entryDate <= week.endDate);
      if (weekIndex >= 0) {
        grouped[weekIndex].push(entry);
      }
    });
    return grouped;
  };

  const renderWeeklyDetails = () => {
    const weeks = getLastNWeeks(parseInt(selectedWeeks));
    const reversedWeeks = [...weeks].reverse();
    const groupedEntries = groupEntriesByWeek(detailedData, weeks);
    const reversedGroupedEntries = [...groupedEntries].reverse();

    return (
      <div className="space-y-4">
        {reversedWeeks.map((week, index) => {
          const weekEntries = reversedGroupedEntries[index];
          const weekStart = week.startDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
          const weekEnd = week.endDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });

          const sortedWeekEntries = weekEntries.sort((a, b) => 
            parseDateString(b.datum).getTime() - parseDateString(a.datum).getTime()
          );

          return (
            <div key={index}>
              <h5 className="font-medium text-gray-700 mb-2">Woche {index + 1} ({weekStart} - {weekEnd})</h5>
              <div className="space-y-1 pl-4">
                {sortedWeekEntries.length > 0 ? (
                  sortedWeekEntries.map((entry, i) => {
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
                          <span className="ml-2 italic">
                            [{entry.status}]
                          </span>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-gray-500 italic">Keine Einträge</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderDetailsContent = () => {
    if (!detailedData) return (
      <div className="text-gray-500 italic">Keine Daten verfügbar</div>
    );

    if (filterType === 'details') {
      const unexcusedLates = detailedData
        .filter(entry => entry.art === 'Verspätung' && isUnexcused(entry))
        .sort((a, b) => parseDateString(b.datum).getTime() - parseDateString(a.datum).getTime());
      const unexcusedAbsences = detailedData
        .filter(entry => entry.art !== 'Verspätung' && isUnexcused(entry));

      return (
        <>
          {renderDetailSection(unexcusedLates, 'Unentschuldigte Verspätungen')}
          {renderDetailSection(unexcusedAbsences, 'Unentschuldigte Fehlzeiten')}
          {(!unexcusedLates?.length && !unexcusedAbsences?.length) && (
            <div className="text-gray-500 italic">Keine unentschuldigten Einträge für den ausgewählten Zeitraum gefunden</div>
          )}
        </>
      );
    }

    if (filterType === 'sum_verspaetungen' || filterType === 'sum_fehlzeiten') {
      return renderWeeklyDetails();
    }

    const sortedData = [...detailedData].sort((a, b) => 
      parseDateString(b.datum).getTime() - parseDateString(a.datum).getTime()
    );

    return (
      <div className="space-y-1">
        {sortedData.length > 0 ? (
          <div className="space-y-1">
            {sortedData.map((entry, i) => {
              const statusColor = getStatusColor(entry.status || '', entry.datum);
              const reverseIndex = sortedData.length - i;
              return (
                <div 
                  key={i}
                  className={`${statusColor} hover:bg-gray-50 p-1 rounded`}
                >
                  <span className="font-medium">{reverseIndex}. {formatDate(entry.datum)}</span>
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
                    <span className="ml-2 italic">
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
    );
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
