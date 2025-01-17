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

export interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

interface StudentTableHeaderProps {
  onSort: (field: SortField, event: React.MouseEvent) => void;
  sortConfigs: SortConfig[];
}

const StudentTableHeader = ({ onSort, sortConfigs }: StudentTableHeaderProps) => {
  const getSortIndex = (field: SortField): number => {
    const index = sortConfigs.findIndex(config => config.field === field);
    return index === -1 ? -1 : index + 1;
  };

  const getDirection = (field: SortField): SortDirection | null => {
    const config = sortConfigs.find(config => config.field === field);
    return config ? config.direction : null;
  };

  const renderSortIndicator = (field: SortField) => {
    const direction = getDirection(field);
    if (!direction) return null;

    const index = getSortIndex(field);
    
    return (
      <span className="inline-flex items-center">
        {direction === 'asc' ? 
          <ChevronUp className="w-4 h-4 inline-block ml-1" /> :
          <ChevronDown className="w-4 h-4 inline-block ml-1" />}
        {sortConfigs.length > 1 && (
          <span className="text-xs ml-1">{index}</span>
        )}
      </span>
    );
  };

  const getSortableHeaderClass = (field: SortField) => {
    return `cursor-pointer hover:bg-gray-50 ${getDirection(field) ? 'bg-gray-50' : ''}`;
  };

  return (
    <TooltipProvider delayDuration={1000}>
      <thead className="sticky top-0 z-10 bg-white shadow-sm">
        <tr>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-r border-gray-200 bg-white w-12">
            Nr.
          </th>
          <th 
            onClick={(e) => onSort('name', e)}
            className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-r border-gray-200 bg-white w-48 ${getSortableHeaderClass('name')}`}
          >
            Name {renderSortIndicator('name')}
          </th>
          <th 
            onClick={(e) => onSort('klasse', e)}
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
          <th colSpan={6} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-r border-gray-200 bg-white">
            <Tooltip>
              <TooltipTrigger>Statistik</TooltipTrigger>
              <TooltipContent className="text-xs">
                <p className="text-xs">bezieht sich auf 1-4 vollständige Wochen zurück, je nach Auswahl</p>
              </TooltipContent>
            </Tooltip>
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200 bg-white w-16">
            <Tooltip>
              <TooltipTrigger>Details</TooltipTrigger>
              <TooltipContent className="text-xs">
                <p className="text-xs">unent. Versp. & Fehlz. im ausgewählten Zeitraum</p>
              </TooltipContent>
            </Tooltip>
          </th>
        </tr>
        <tr className="bg-white">
          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 border-b border-r border-gray-200"></th>
          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 border-b border-r border-gray-200"></th>
          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 border-b border-r border-gray-200"></th>
          <th 
            onClick={(e) => onSort('verspaetungen_entsch', e)}
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
            onClick={(e) => onSort('verspaetungen_unentsch', e)}
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
            onClick={(e) => onSort('verspaetungen_offen', e)}
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
            onClick={(e) => onSort('fehlzeiten_entsch', e)}
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
            onClick={(e) => onSort('fehlzeiten_unentsch', e)}
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
            onClick={(e) => onSort('fehlzeiten_offen', e)}
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
            onClick={(e) => onSort('sj_verspaetungen', e)}
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
            onClick={(e) => onSort('sj_fehlzeiten', e)}
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
            onClick={(e) => onSort('weekly_verspaetungen', e)}
            className={`px-4 py-2 text-center text-xs font-medium text-gray-500 border-b border-r border-gray-200 bg-white ${getSortableHeaderClass('weekly_verspaetungen')}`}
          >
            <Tooltip>
              <TooltipTrigger>Øx() V</TooltipTrigger>
              <TooltipContent className="text-xs">
                <p className="text-xs">Vor (): Ø Versp. pro vollständige Woche (je nach Auswahl 1–4 W). In (): ∑Versp. in W4, W3, W2, W1.</p>
              </TooltipContent>
            </Tooltip> {renderSortIndicator('weekly_verspaetungen')}
          </th>
          <th 
            onClick={(e) => onSort('weekly_fehlzeiten', e)}
            className={`px-4 py-2 text-center text-xs font-medium text-gray-500 border-b border-r border-gray-200 bg-white ${getSortableHeaderClass('weekly_fehlzeiten')}`}
          >
            <Tooltip>
              <TooltipTrigger>Øx() F</TooltipTrigger>
              <TooltipContent className="text-xs">
                <p className="text-xs">Vor (): Ø Fehlz. pro vollständige Woche (je nach Auswahl 1–4 W). In (): ∑Fehlz. W4, W3, W2, W1.</p>
              </TooltipContent>
            </Tooltip> {renderSortIndicator('weekly_fehlzeiten')}
          </th>
          <th 
            onClick={(e) => onSort('sum_verspaetungen', e)}
            className={`px-4 py-2 text-center text-xs font-medium text-gray-500 border-b border-r border-gray-200 bg-white ${getSortableHeaderClass('sum_verspaetungen')}`}
          >
            <Tooltip>
              <TooltipTrigger>∑x() V</TooltipTrigger>
              <TooltipContent className="text-xs">
                <p className="text-xs">Vor (): ∑ Versp. pro vollständige Woche (je nach Auswahl 1–4 W). In (): ∑Versp. in W4, W3, W2, W1.</p>
              </TooltipContent>
            </Tooltip> {renderSortIndicator('sum_verspaetungen')}
          </th>
          <th 
            onClick={(e) => onSort('sum_fehlzeiten', e)}
            className={`px-4 py-2 text-center text-xs font-medium text-gray-500 border-b border-r border-gray-200 bg-white ${getSortableHeaderClass('sum_fehlzeiten')}`}
          ><Tooltip>
              <TooltipTrigger>∑x() F</TooltipTrigger>
              <TooltipContent className="text-xs">
                <p className="text-xs">Vor (): ∑ Fehlz. pro vollständige Woche (je nach Auswahl 1–4 W). In (): ∑Fehlz. in W4, W3, W2, W1.</p>
              </TooltipContent>
            </Tooltip> {renderSortIndicator('sum_fehlzeiten')}
          </th>
          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 border-b border-gray-200 bg-white"></th>
        </tr>
      </thead>
    </TooltipProvider>
  );
};

export default StudentTableHeader;
