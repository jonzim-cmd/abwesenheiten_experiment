import React, { useState } from 'react';
import { Button } from "@/components/ui/button";

interface NormalViewProps {
  filteredStudents: [string, any][];
  detailedData: Record<string, any>;
  startDate: string;
  endDate: string;
  schoolYearStats: Record<string, any>;
  weeklyStats: Record<string, any>;
  selectedWeeks: string;
}

const NormalView = ({ 
  filteredStudents, 
  detailedData, 
  startDate, 
  endDate, 
  schoolYearStats, 
  weeklyStats, 
  selectedWeeks 
}: NormalViewProps) => {
  const [areAllDetailsVisible, setAreAllDetailsVisible] = useState(false);

  const toggleAllDetails = () => {
    setAreAllDetailsVisible(!areAllDetailsVisible);
    filteredStudents.forEach(([student]) => {
      const row = document.getElementById(`details-${student}`);
      if (row) {
        row.style.display = !areAllDetailsVisible ? 'table-row' : 'none';
      }
    });
  };

  return (
    <div className="mt-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">
          Ergebnisse für den Zeitraum {new Date(startDate).toLocaleDateString('de-DE')} - {new Date(endDate).toLocaleDateString('de-DE')}
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={toggleAllDetails}
        >
          {areAllDetailsVisible ? 'Alle Details einklappen' : 'Alle Details ausklappen'}
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse bg-white">
          <thead>
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-r border-gray-200">
                Name (Klasse)
              </th>
              <th colSpan={3} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-r border-gray-200">
                Verspätungen
                <div className="text-[10px] font-normal normal-case mt-1 text-gray-400">
                  bezieht sich auf ausgewählten Zeitraum
                </div>
              </th>
              <th colSpan={3} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-r border-gray-200">
                Fehlzeiten
                <div className="text-[10px] font-normal normal-case mt-1 text-gray-400">
                  bezieht sich auf ausgewählten Zeitraum
                </div>
              </th>
              <th colSpan={6} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-r border-gray-200">
                Statistik
                <div className="text-[10px] font-normal normal-case mt-1 text-gray-400">
                  ∑SJ = Summe gesamtes Schuljahr; x = Anzahl der Wochen, die zurückgeschaut werden;<br/>
                  Øx() = Durchschnitt der letzten x Wochen; ∑x() = Summe der letzten x Wochen;<br/>
                  Jeweils in Klammer = Anzahl jeder Woche beginnend mit der am weitesten zurückliegenden vollständig abgeschlossenen Woche
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                Details
              </th>
            </tr>
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 border-b border-gray-200"></th>
              <th className="px-4 py-2 text-center text-xs font-medium text-green-600 border-b border-r border-gray-200">E</th>
              <th className="px-4 py-2 text-center text-xs font-medium text-red-600 border-b border-r border-gray-200">U</th>
              <th className="px-4 py-2 text-center text-xs font-medium text-yellow-600 border-b border-r border-gray-200">O</th>
              <th className="px-4 py-2 text-center text-xs font-medium text-green-600 border-b border-r border-gray-200">E</th>
              <th className="px-4 py-2 text-center text-xs font-medium text-red-600 border-b border-r border-gray-200">U</th>
              <th className="px-4 py-2 text-center text-xs font-medium text-yellow-600 border-b border-r border-gray-200">O</th>
              <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 border-b border-r border-gray-200">∑SJ V</th>
              <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 border-b border-r border-gray-200">∑SJ F</th>
              <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 border-b border-r border-gray-200">Øx() V</th>
              <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 border-b border-r border-gray-200">Øx() F</th>
              <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 border-b border-r border-gray-200">∑x() V</th>
              <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 border-b border-r border-gray-200">∑x() F</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 border-b border-gray-200"></th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map(([student, stats], index) => {
              const rowColor = index % 2 === 0 ? 'bg-white' : 'bg-gray-100';
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
              
              const verspaetungenWeekly = `${verspaetungenAvg}(${weeklyData.verspaetungen.weekly.join(',')})`;
              const fehlzeitenWeekly = `${fehlzeitenAvg}(${weeklyData.fehlzeiten.weekly.join(',')})`;
              
              const verspaetungenSum = `${weeklyData.verspaetungen.total}(${weeklyData.verspaetungen.weekly.join(',')})`;
              const fehlzeitenSum = `${weeklyData.fehlzeiten.total}(${weeklyData.fehlzeiten.weekly.join(',')})`;

              return (
                <React.Fragment key={student}>
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
                        onClick={() => {
                          const row = document.getElementById(`details-${student}`);
                          if (row) {
                            row.style.display = row.style.display === 'none' ? 'table-row' : 'none';
                          }
                        }}
                      >
                        Details
                      </Button>
                    </td>
                  </tr>
                  <tr id={`details-${student}`} style={{ display: 'none' }} className={rowColor}>
                    <td colSpan={14} className="px-4 py-2 text-sm">
                      <div className="space-y-2">
                        <h4 className="font-medium">Unentschuldigte Verspätungen:</h4>
                        <div className="pl-4">
                          {detailedData[student]
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
                          {detailedData[student]
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
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default NormalView;
