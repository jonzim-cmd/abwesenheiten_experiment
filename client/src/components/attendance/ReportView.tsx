import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClassFilter } from './ClassFilter';
import { ChevronUp, ChevronDown } from 'lucide-react';

type SortField = 'number' | 'name' | 'klasse' | 'verspaetungen' | 'fehlzeiten';
type SortDirection = 'asc' | 'desc';

interface SortState {
  field: SortField;
  direction: SortDirection | null;
  order: number;
}

interface ReportViewProps {
  filteredStudents: [string, any][];
  detailedData: Record<string, any>;
  startDate: string;
  endDate: string;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  availableClasses: string[];
  selectedClasses: string[];
  onClassesChange: (classes: string[]) => void;
}

const ReportView = ({ 
  filteredStudents, 
  detailedData, 
  startDate, 
  endDate,
  searchQuery,
  onSearchChange,
  availableClasses,
  selectedClasses,
  onClassesChange
}: ReportViewProps) => {
  const [sortStates, setSortStates] = React.useState<Map<SortField, SortState>>(new Map());

  const handleSort = (field: SortField) => {
    setSortStates(prevStates => {
      const newStates = new Map(prevStates);
      const currentState = newStates.get(field);
      
      if (!currentState) {
        // First click: Add ascending sort
        newStates.set(field, {
          field,
          direction: 'asc',
          order: newStates.size
        });
      } else if (currentState.direction === 'asc') {
        // Second click: Change to descending
        newStates.set(field, {
          ...currentState,
          direction: 'desc'
        });
      } else {
        // Third click: Remove sort
        newStates.delete(field);
        
        // Reorder remaining sorts
        let order = 0;
        newStates.forEach(state => {
          state.order = order++;
        });
      }
      
      return newStates;
    });
  };

  const compareValues = (a: any, b: any, field: SortField, direction: SortDirection): number => {
    const [studentA, statsA] = a;
    const [studentB, statsB] = b;
    const multiplier = direction === 'asc' ? 1 : -1;

    const studentDataA = detailedData[studentA];
    const studentDataB = detailedData[studentB];

    switch (field) {
      case 'number':
        return multiplier;
      case 'name':
        return multiplier * studentA.localeCompare(studentB);
      case 'klasse':
        return multiplier * statsA.klasse.localeCompare(statsB.klasse);
      case 'verspaetungen':
        return multiplier * ((studentDataA?.verspaetungen_unentsch?.length || 0) - 
                           (studentDataB?.verspaetungen_unentsch?.length || 0));
      case 'fehlzeiten':
        return multiplier * ((studentDataA?.fehlzeiten_unentsch?.length || 0) - 
                           (studentDataB?.fehlzeiten_unentsch?.length || 0));
      default:
        return 0;
    }
  };

  const getSortedStudents = () => {
    return [...filteredStudents].sort((a, b) => {
      const sortEntries = Array.from(sortStates.values())
        .sort((x, y) => x.order - y.order);

      for (const sortState of sortEntries) {
        if (sortState.direction) {
          const comparison = compareValues(a, b, sortState.field, sortState.direction);
          if (comparison !== 0) return comparison;
        }
      }
      
      return 0;
    });
  };

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
    <div className="mt-6 space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4 flex-1">
          <h3 className="text-lg font-semibold">
            Unentschuldigte Verspätungen und Fehlzeiten für den Zeitraum {new Date(startDate).toLocaleDateString('de-DE')} - {new Date(endDate).toLocaleDateString('de-DE')}
          </h3>
          <div className="w-72">
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Namen eingeben..."
              className="w-full"
            />
          </div>
          <ClassFilter
            availableClasses={availableClasses}
            selectedClasses={selectedClasses}
            onChange={onClassesChange}
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full table-fixed">
          <thead>
            <tr>
              <th 
                onClick={() => handleSort('number')}
                className={`w-16 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-r border-gray-200 ${getSortableHeaderClass('number')}`}
              >
                Nr. {renderSortIndicator('number')}
              </th>
              <th 
                onClick={() => handleSort('name')}
                className={`w-48 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-r border-gray-200 ${getSortableHeaderClass('name')}`}
              >
                Name {renderSortIndicator('name')}
              </th>
              <th 
                onClick={() => handleSort('klasse')}
                className={`w-24 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-r border-gray-200 ${getSortableHeaderClass('klasse')}`}
              >
                Klasse {renderSortIndicator('klasse')}
              </th>
              <th 
                onClick={() => handleSort('verspaetungen')}
                className={`w-1/3 px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-r border-gray-200 ${getSortableHeaderClass('verspaetungen')}`}
              >
                <div>Unentschuldigte Verspätungen {renderSortIndicator('verspaetungen')}</div>
                <div className="text-[10px] font-normal normal-case mt-1 text-gray-400">
                  bezieht sich auf ausgewählten Zeitraum
                </div>
              </th>
              <th 
                onClick={() => handleSort('fehlzeiten')}
                className={`w-1/3 px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200 ${getSortableHeaderClass('fehlzeiten')}`}
              >
                <div>Unentschuldigte Fehlzeiten {renderSortIndicator('fehlzeiten')}</div>
                <div className="text-[10px] font-normal normal-case mt-1 text-gray-400">
                  bezieht sich auf ausgewählten Zeitraum
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {getSortedStudents().map(([student, stats], index) => {
              const studentData = detailedData[student];
              const lateEntries = studentData?.verspaetungen_unentsch || [];
              const absenceEntries = studentData?.fehlzeiten_unentsch || [];
              const formattedLates = lateEntries.map(entry => 
                `${new Date(entry.datum).toLocaleDateString('de-DE', {
                  weekday: 'long',
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit'
                })} (${entry.beginnZeit} - ${entry.endZeit} Uhr)`
              );
              const formattedAbsences = absenceEntries.map(entry => 
                `${new Date(entry.datum).toLocaleDateString('de-DE', {
                  weekday: 'long',
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit'
                })} - ${entry.art}${entry.grund ? ` (${entry.grund})` : ''}`
              );
              return (
                <tr 
                  key={student} 
                  className={index % 2 === 0 ? 'bg-white' : 'bg-gray-100'}
                >
                  <td className="px-6 py-4 whitespace-normal text-sm font-medium text-gray-500 border-b border-r border-gray-200 text-center">
                    {index + 1}
                  </td>
                  <td className="px-6 py-4 whitespace-normal text-sm font-medium text-gray-900 border-b border-r border-gray-200">
                    {student}
                  </td>
                  <td className="px-6 py-4 whitespace-normal text-sm font-medium text-gray-900 border-b border-r border-gray-200">
                    {stats.klasse}
                  </td>
                  <td className="px-6 py-4 whitespace-pre-line text-sm text-gray-500 border-b border-r border-gray-200">
                    {formattedLates.length > 0 ? formattedLates.join('\n') : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-pre-line text-sm text-gray-500 border-b border-gray-200">
                    {formattedAbsences.length > 0 ? formattedAbsences.join('\n') : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ReportView;
