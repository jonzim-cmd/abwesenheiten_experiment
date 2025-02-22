import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import ResetCheckboxButton from './ResetCheckboxButton';

type SortField = 'name' | 'klasse' | 
  'verspaetungen_entsch' | 'verspaetungen_unentsch' | 'verspaetungen_offen' |
  'fehlzeiten_entsch' | 'fehlzeiten_unentsch' | 'fehlzeiten_offen' |
  'sj_verspaetungen' | 'sj_fehlzeiten' | 'sj_fehlzeiten_ges' |
  'sum_verspaetungen' | 'sum_fehlzeiten';

type SortDirection = 'asc' | 'desc';

interface SortState {
  field: SortField;
  direction: SortDirection | null;
  order: number;
}

interface StudentTableHeaderProps {
  onSort: (field: SortField) => void;
  sortStates: Map<SortField, SortState>;
  onResetSelection: () => void;
}

const StudentTableHeader = ({ onSort, sortStates, onResetSelection }: StudentTableHeaderProps) => {
  const renderSortIndicator = (field: SortField) => {
    const state = sortStates.get(field);
    if (!state) return null;

    return (
      <span className="inline-flex items-center">
        {state.direction === 'asc' ? (
          <ChevronUp className="w-4 h-4 ml-1" />
        ) : (
          <ChevronDown className="w-4 h-4 ml-1" />
        )}
        {sortStates.size > 1 && (
          <span className="ml-1 text-xs">
            {state.order + 1}
          </span>
        )}
      </span>
    );
  };

  const getSortableHeaderClass = (field: SortField) => {
    const state = sortStates.get(field);
    return `cursor-pointer hover:bg-gray-50 ${state ? 'bg-gray-50' : ''}`;
  };

  return (
    <TooltipProvider delayDuration={1000}>
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
            <Tooltip>
              <TooltipTrigger>Verspätungen</TooltipTrigger>
              <TooltipContent className="text-xs">
                <p className="text-xs">bezieht sich auf ausgewählten Zeitraum</p>
              </TooltipContent>
            </Tooltip>
          </th>
          <th colSpan={3} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-r border-gray-200 bg-white">
            <Tooltip>
              <TooltipTrigger>Fehlzeiten</TooltipTrigger>
              <TooltipContent className="text-xs">
                <p className="text-xs">bezieht sich auf ausgewählten Zeitraum</p>
              </TooltipContent>
            </Tooltip>
          </th>
          <th colSpan={5} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200 bg-white">
            <Tooltip>
              <TooltipTrigger>Statistik</TooltipTrigger>
              <TooltipContent className="text-xs">
                <p className="text-xs">...</p>
              </TooltipContent>
            </Tooltip>
          </th>
        </tr>
        <tr className="bg-white">
          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 border-b border-r border-gray-200"></th>
          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 border-b border-r border-gray-200">
            <ResetCheckboxButton 
              onReset={onResetSelection}
              className="text-xs h-6 px-2"
              variant="ghost"
              size="xs"
            />
          </th>
          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 border-b border-r border-gray-200"></th>
          <th 
            onClick={() => onSort('verspaetungen_entsch')}
            className={`px-4 py-2 text-center text-xs font-medium text-green-600 border-b border-r border-gray-200 bg-white ${getSortableHeaderClass('verspaetungen_entsch')}`}
          >
            <Tooltip>
              <TooltipTrigger>E</TooltipTrigger>
              <TooltipContent className="text-xs">
                <p className="text-xs">entschuldigt</p>
              </TooltipContent>
            </Tooltip> {renderSortIndicator('verspaetungen_entsch')}
          </th>
          <th 
            onClick={() => onSort('verspaetungen_unentsch')}
            className={`px-4 py-2 text-center text-xs font-medium text-red-600 border-b border-r border-gray-200 bg-white ${getSortableHeaderClass('verspaetungen_unentsch')}`}
          >
            <Tooltip>
              <TooltipTrigger>U</TooltipTrigger>
              <TooltipContent className="text-xs">
                <p className="text-xs">unentschuldigt</p>
              </TooltipContent>
            </Tooltip> {renderSortIndicator('verspaetungen_unentsch')}
          </th>
          <th 
            onClick={() => onSort('verspaetungen_offen')}
            className={`px-4 py-2 text-center text-xs font-medium text-yellow-600 border-b border-r border-gray-200 bg-white ${getSortableHeaderClass('verspaetungen_offen')}`}
          >
            <Tooltip>
              <TooltipTrigger>O</TooltipTrigger>
              <TooltipContent className="text-xs">
                <p className="text-xs">offen</p>
              </TooltipContent>
            </Tooltip> {renderSortIndicator('verspaetungen_offen')}
          </th>
          <th 
            onClick={() => onSort('fehlzeiten_entsch')}
            className={`px-4 py-2 text-center text-xs font-medium text-green-600 border-b border-r border-gray-200 bg-white ${getSortableHeaderClass('fehlzeiten_entsch')}`}
          >
            <Tooltip>
              <TooltipTrigger>E</TooltipTrigger>
              <TooltipContent className="text-xs">
                <p className="text-xs">entschuldigt</p>
              </TooltipContent>
            </Tooltip> {renderSortIndicator('fehlzeiten_entsch')}
          </th>
          <th 
            onClick={() => onSort('fehlzeiten_unentsch')}
            className={`px-4 py-2 text-center text-xs font-medium text-red-600 border-b border-r border-gray-200 bg-white ${getSortableHeaderClass('fehlzeiten_unentsch')}`}
          >
            <Tooltip>
              <TooltipTrigger>U</TooltipTrigger>
              <TooltipContent className="text-xs">
                <p className="text-xs">unentschuldigt</p>
              </TooltipContent>
            </Tooltip> {renderSortIndicator('fehlzeiten_unentsch')}
          </th>
          <th 
            onClick={() => onSort('fehlzeiten_offen')}
            className={`px-4 py-2 text-center text-xs font-medium text-yellow-600 border-b border-r border-gray-200 bg-white ${getSortableHeaderClass('fehlzeiten_offen')}`}
          >
            <Tooltip>
              <TooltipTrigger>O</TooltipTrigger>
              <TooltipContent className="text-xs">
                <p className="text-xs">offen</p>
              </TooltipContent>
            </Tooltip> {renderSortIndicator('fehlzeiten_offen')}
          </th>
          <th 
            onClick={() => onSort('sj_verspaetungen')}
            className={`px-4 py-2 text-center text-xs font-medium text-gray-500 border-b border-r border-gray-200 bg-white ${getSortableHeaderClass('sj_verspaetungen')}`}
          >
            <Tooltip>
              <TooltipTrigger>∑SJ V</TooltipTrigger>
              <TooltipContent className="text-xs">
                <p className="text-xs">unent. Versp. im gesamten Schuljahr</p>
              </TooltipContent>
            </Tooltip> {renderSortIndicator('sj_verspaetungen')}
          </th>
          <th 
            onClick={() => onSort('sj_fehlzeiten')}
            className={`px-4 py-2 text-center text-xs font-medium text-gray-500 border-b border-r border-gray-200 bg-white ${getSortableHeaderClass('sj_fehlzeiten')}`}
          >
            <Tooltip>
              <TooltipTrigger>∑SJ F</TooltipTrigger>
              <TooltipContent className="text-xs">
                <p className="text-xs">unent. Fehlzeiten im gesamten Schuljahr</p>
              </TooltipContent>
            </Tooltip> {renderSortIndicator('sj_fehlzeiten')}
          </th>
          <th 
            onClick={() => onSort('sj_fehlzeiten_ges')}
            className={`px-4 py-2 text-center text-xs font-medium text-gray-500 border-b border-r border-gray-200 bg-white ${getSortableHeaderClass('sj_fehlzeiten_ges')}`}
          >
            <Tooltip>
              <TooltipTrigger>∑SJ F₍ges₎</TooltipTrigger>
              <TooltipContent className="text-xs">
                <p className="text-xs">Gesamt (E + U) Fehlzeiten im Schuljahr</p>
              </TooltipContent>
            </Tooltip> {renderSortIndicator('sj_fehlzeiten_ges')}
          </th>
          <th 
            onClick={() => onSort('sum_verspaetungen')}
            className={`px-4 py-2 text-center text-xs font-medium text-gray-500 border-b border-r border-gray-200 bg-white ${getSortableHeaderClass('sum_verspaetungen')}`}
          >
            <Tooltip>
              <TooltipTrigger>∑x() V</TooltipTrigger>
              <TooltipContent className="text-xs">
                <p className="text-xs">∑ Versp. pro vollständige Woche</p>
              </TooltipContent>
            </Tooltip> {renderSortIndicator('sum_verspaetungen')}
          </th>
          <th 
            onClick={() => onSort('sum_fehlzeiten')}
            className={`px-4 py-2 text-center text-xs font-medium text-gray-500 border-b border-r border-gray-200 bg-white ${getSortableHeaderClass('sum_fehlzeiten')}`}
          >
            <Tooltip>
              <TooltipTrigger>∑x() F</TooltipTrigger>
              <TooltipContent className="text-xs">
                <p className="text-xs">∑ Fehlzeiten pro vollständige Woche</p>
              </TooltipContent>
            </Tooltip> {renderSortIndicator('sum_fehlzeiten')}
          </th>
        </tr>
      </thead>
    </TooltipProvider>
  );
};

export default StudentTableHeader;
