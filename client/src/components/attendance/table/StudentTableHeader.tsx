import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

type SortField = 'name' | 'klasse' | 
  'verspaetungen_entsch' | 'verspaetungen_unentsch' | 'verspaetungen_offen' |
  'fehlzeiten_entsch' | 'fehlzeiten_unentsch' | 'fehlzeiten_offen' |
  'sj_verspaetungen' | 'sj_fehlzeiten' |
  'weekly_verspaetungen' | 'weekly_fehlzeiten' |
  'sum_verspaetungen' | 'sum_fehlzeiten';

type SortDirection = 'asc' | 'desc';

interface StudentTableHeaderProps {
  onSort: (field: SortField) => void;
  sortField: SortField;
  sortDirection: SortDirection;
}

const StudentTableHeader = ({ onSort, sortField, sortDirection }: StudentTableHeaderProps) => {
  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) return null;

    return sortDirection === 'asc' ? 
      <ChevronUp className="w-4 h-4 inline-block ml-1" /> :
      <ChevronDown className="w-4 h-4 inline-block ml-1" />;
  };

  const getSortableHeaderClass = (field: SortField) => {
    return `cursor-pointer hover:bg-gray-50 ${sortField === field ? 'bg-gray-50' : ''}`;
  };

  return (
    <thead className="sticky top-0 z-10 bg-white shadow-sm">
      <tr>
        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-r border-gray-200 bg-white w-12">
          Nr.
        </th>
        <th 
          onClick={() => onSort('name')}
          className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-r border-gray-200 bg-white w-48 ${getSortableHeaderClass('name')}`}
        >
          Name {renderSortIndicator('name')}
        </th>
        <th 
          onClick={() => onSort('klasse')}
          className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-r border-gray-200 bg-white w-24 ${getSortableHeaderClass('klasse')}`}
        >
          Klasse {renderSortIndicator('klasse')}
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
        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200 bg-white w-16">
          Details
          <div className="text-[8px] font-normal normal-case text-gray-400">
            unentsch.
          </div>
        </th>
      </tr>
      <tr className="bg-white">
        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 border-b border-r border-gray-200"></th>
        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 border-b border-r border-gray-200"></th>
        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 border-b border-r border-gray-200"></th>
        <th 
          onClick={() => onSort('verspaetungen_entsch')}
          className={`px-4 py-2 text-center text-xs font-medium text-green-600 border-b border-r border-gray-200 bg-white ${getSortableHeaderClass('verspaetungen_entsch')}`}
        >
          E {renderSortIndicator('verspaetungen_entsch')}
        </th>
        <th 
          onClick={() => onSort('verspaetungen_unentsch')}
          className={`px-4 py-2 text-center text-xs font-medium text-red-600 border-b border-r border-gray-200 bg-white ${getSortableHeaderClass('verspaetungen_unentsch')}`}
        >
          U {renderSortIndicator('verspaetungen_unentsch')}
        </th>
        <th 
          onClick={() => onSort('verspaetungen_offen')}
          className={`px-4 py-2 text-center text-xs font-medium text-yellow-600 border-b border-r border-gray-200 bg-white ${getSortableHeaderClass('verspaetungen_offen')}`}
        >
          O {renderSortIndicator('verspaetungen_offen')}
        </th>
        <th 
          onClick={() => onSort('fehlzeiten_entsch')}
          className={`px-4 py-2 text-center text-xs font-medium text-green-600 border-b border-r border-gray-200 bg-white ${getSortableHeaderClass('fehlzeiten_entsch')}`}
        >
          E {renderSortIndicator('fehlzeiten_entsch')}
        </th>
        <th 
          onClick={() => onSort('fehlzeiten_unentsch')}
          className={`px-4 py-2 text-center text-xs font-medium text-red-600 border-b border-r border-gray-200 bg-white ${getSortableHeaderClass('fehlzeiten_unentsch')}`}
        >
          U {renderSortIndicator('fehlzeiten_unentsch')}
        </th>
        <th 
          onClick={() => onSort('fehlzeiten_offen')}
          className={`px-4 py-2 text-center text-xs font-medium text-yellow-600 border-b border-r border-gray-200 bg-white ${getSortableHeaderClass('fehlzeiten_offen')}`}
        >
          O {renderSortIndicator('fehlzeiten_offen')}
        </th>
        <th 
          onClick={() => onSort('sj_verspaetungen')}
          className={`px-4 py-2 text-center text-xs font-medium text-gray-500 border-b border-r border-gray-200 bg-white ${getSortableHeaderClass('sj_verspaetungen')}`}
        >
          ∑SJ V {renderSortIndicator('sj_verspaetungen')}
        </th>
        <th 
          onClick={() => onSort('sj_fehlzeiten')}
          className={`px-4 py-2 text-center text-xs font-medium text-gray-500 border-b border-r border-gray-200 bg-white ${getSortableHeaderClass('sj_fehlzeiten')}`}
        >
          ∑SJ F {renderSortIndicator('sj_fehlzeiten')}
        </th>
        <th 
          onClick={() => onSort('weekly_verspaetungen')}
          className={`px-4 py-2 text-center text-xs font-medium text-gray-500 border-b border-r border-gray-200 bg-white ${getSortableHeaderClass('weekly_verspaetungen')}`}
        >
          Øx() V {renderSortIndicator('weekly_verspaetungen')}
        </th>
        <th 
          onClick={() => onSort('weekly_fehlzeiten')}
          className={`px-4 py-2 text-center text-xs font-medium text-gray-500 border-b border-r border-gray-200 bg-white ${getSortableHeaderClass('weekly_fehlzeiten')}`}
        >
          Øx() F {renderSortIndicator('weekly_fehlzeiten')}
        </th>
        <th 
          onClick={() => onSort('sum_verspaetungen')}
          className={`px-4 py-2 text-center text-xs font-medium text-gray-500 border-b border-r border-gray-200 bg-white ${getSortableHeaderClass('sum_verspaetungen')}`}
        >
          ∑x() V {renderSortIndicator('sum_verspaetungen')}
        </th>
        <th 
          onClick={() => onSort('sum_fehlzeiten')}
          className={`px-4 py-2 text-center text-xs font-medium text-gray-500 border-b border-r border-gray-200 bg-white ${getSortableHeaderClass('sum_fehlzeiten')}`}
        >
          ∑x() F {renderSortIndicator('sum_fehlzeiten')}
        </th>
        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 border-b border-gray-200 bg-white"></th>
      </tr>
    </thead>
  );
};

export default StudentTableHeader;
