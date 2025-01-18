import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type SortField = 'name' | 'klasse' | 
  'verspaetungen_entsch' | 'verspaetungen_unentsch' | 'verspaetungen_offen' |
  'fehlzeiten_entsch' | 'fehlzeiten_unentsch' | 'fehlzeiten_offen' |
  'sj_verspaetungen' | 'sj_fehlzeiten' |
  'weekly_verspaetungen' | 'weekly_fehlzeiten' |
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
}

const StudentTableHeader = ({ onSort, sortStates }: StudentTableHeaderProps) => {
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
          <th colSpan={6} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b bg-white">
            <Tooltip>
              <TooltipTrigger>Statistik</TooltipTrigger>
              <TooltipContent className="text-xs">
                <p className="text-xs">bezieht sich auf 1-4 vollständige Wochen zurück, je nach Auswahl</p>
              </TooltipContent>
            </Tooltip>
          </th>
          // Hier wird die Details Spalte entfernt
        </tr>
        <tr className="bg-white">
          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 border-b border-r border-gray-200"></th>
          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 border-b border-r border-gray-200"></th>
          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 border-b border-r border-gray-200"></th>
          // ... (die restlichen th-Elemente bleiben gleich)
        </tr>
      </thead>
    </TooltipProvider>
  );
};

export default StudentTableHeader;
