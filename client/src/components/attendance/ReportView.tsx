import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DetailedStats } from '@/lib/attendance-utils';

interface ReportViewProps {
  filteredStudents: [string, any][];
  detailedData: Record<string, DetailedStats>;
  startDate: string;
  endDate: string;
  searchQuery: string;
  onSearchChange: (value: string) => void;
}

const ReportView = ({ 
  filteredStudents, 
  detailedData, 
  startDate, 
  endDate,
  searchQuery,
  onSearchChange 
}: ReportViewProps) => {
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
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full table-fixed">
          <thead>
            <tr>
              <th className="w-16 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-r border-gray-200">
                Nr.
              </th>
              <th className="w-48 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-r border-gray-200">
                Name
              </th>
              <th className="w-24 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-r border-gray-200">
                Klasse
              </th>
              <th className="w-1/3 px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-r border-gray-200">
                <div>Unentschuldigte Verspätungen</div>
                <div className="text-[10px] font-normal normal-case mt-1 text-gray-400">
                  bezieht sich auf ausgewählten Zeitraum
                </div>
              </th>
              <th className="w-1/3 px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                <div>Unentschuldigte Fehlzeiten</div>
                <div className="text-[10px] font-normal normal-case mt-1 text-gray-400">
                  bezieht sich auf ausgewählten Zeitraum
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map(([student, stats], index) => {
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
