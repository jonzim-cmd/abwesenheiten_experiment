import React from 'react';

const StudentTableHeader = () => {
  return (
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
          <div className="text-[10px] font-normal normal-case mt-1 text-gray-400">
            zeigt unentschuldigte und überfällige Verspätungen und Fehlzeiten für den ausgewählten Zeitraum
          </div>
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
  );
};

export default StudentTableHeader;