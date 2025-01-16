import React from 'react';

const StudentTableHeader = () => {
  return (
    <thead className="sticky top-0 z-10 bg-white shadow-sm">
      <tr>
        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-r border-gray-200 bg-white">
          Name (Klasse)
        </th>
        <th colSpan={3} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-r border-gray-200 bg-white">
          Verspätungen
          <div className="text-[8px] font-normal normal-case text-gray-400">
            ausgewählter Zeitraum
          </div>
        </th>
        <th colSpan={3} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-r border-gray-200 bg-white">
          Fehlzeiten
          <div className="text-[8px] font-normal normal-case text-gray-400">
            ausgewählter Zeitraum
          </div>
        </th>
        <th colSpan={6} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-r border-gray-200 bg-white">
          Statistik
        </th>
        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200 bg-white">
          Details
          <div className="text-[8px] font-normal normal-case text-gray-400">
            unentsch. Verspätungen/Fehlzeiten
          </div>
        </th>
      </tr>
      <tr className="bg-white">
        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 border-b border-gray-200"></th>
        <th className="px-4 py-2 text-center text-xs font-medium text-green-600 border-b border-r border-gray-200 bg-white">E</th>
        <th className="px-4 py-2 text-center text-xs font-medium text-red-600 border-b border-r border-gray-200 bg-white">U</th>
        <th className="px-4 py-2 text-center text-xs font-medium text-yellow-600 border-b border-r border-gray-200 bg-white">O</th>
        <th className="px-4 py-2 text-center text-xs font-medium text-green-600 border-b border-r border-gray-200 bg-white">E</th>
        <th className="px-4 py-2 text-center text-xs font-medium text-red-600 border-b border-r border-gray-200 bg-white">U</th>
        <th className="px-4 py-2 text-center text-xs font-medium text-yellow-600 border-b border-r border-gray-200 bg-white">O</th>
        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 border-b border-r border-gray-200 bg-white">∑SJ V</th>
        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 border-b border-r border-gray-200 bg-white">∑SJ F</th>
        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 border-b border-r border-gray-200 bg-white">Øx() V</th>
        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 border-b border-r border-gray-200 bg-white">Øx() F</th>
        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 border-b border-r border-gray-200 bg-white">∑x() V</th>
        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 border-b border-r border-gray-200 bg-white">∑x() F</th>
        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 border-b border-gray-200 bg-white"></th>
      </tr>
    </thead>
  );
};

export default StudentTableHeader;
