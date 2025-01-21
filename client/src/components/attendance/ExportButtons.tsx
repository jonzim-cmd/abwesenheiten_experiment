import React from 'react';
import { Button } from "@/components/ui/button";
import * as XLSX from 'xlsx';
import { unparse } from 'papaparse';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getLastNWeeks } from '@/lib/attendance';

interface AbsenceEntry {
  datum: Date | string;
  art: string;
  beginnZeit?: string;
  endZeit?: string;
  grund?: string;
  status: string;
}

interface DetailedStats {
  verspaetungen_entsch: AbsenceEntry[];
  verspaetungen_unentsch: AbsenceEntry[];
  verspaetungen_offen: AbsenceEntry[];
  fehlzeiten_entsch: AbsenceEntry[];
  fehlzeiten_unentsch: AbsenceEntry[];
  fehlzeiten_offen: AbsenceEntry[];
}

interface StudentStats {
  verspaetungen_entsch: number;
  verspaetungen_unentsch: number;
  verspaetungen_offen: number;
  fehlzeiten_entsch: number;
  fehlzeiten_unentsch: number;
  fehlzeiten_offen: number;
  klasse: string;
}

interface ExportButtonsProps {
  data: [string, StudentStats][];
  startDate: string;
  endDate: string;
  schoolYearStats: {
    [key: string]: {
      verspaetungen_unentsch: number;
      fehlzeiten_unentsch: number;
    };
  };
  weeklyStats: {
    [key: string]: {
      verspaetungen: { total: number; weekly: number[] };
      fehlzeiten: { total: number; weekly: number[] };
    };
  };
  selectedWeeks: string;
  isReportView?: boolean;
  detailedData: Record<string, DetailedStats>;
  expandedStudents: Set<string>;
  activeFilters: Map<string, string>;
}

const parseDate = (dateStr: string | Date): Date => {
  if (dateStr instanceof Date) return dateStr;
  const [day, month, year] = dateStr.split('.');
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
};

const ExportButtons: React.FC<ExportButtonsProps> = ({ 
  data, 
  startDate, 
  endDate, 
  schoolYearStats,
  weeklyStats,
  selectedWeeks,
  isReportView = false,
  detailedData,
  expandedStudents,
  activeFilters
}) => {
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

  const formatData = () => {
    if (isReportView) {
      return data.map(([student, stats], index) => {
        const studentData = detailedData[student];
        const lateEntries = studentData?.verspaetungen_unentsch || [];
        const absenceEntries = studentData?.fehlzeiten_unentsch || [];

        const formattedLates = lateEntries.map((entry: AbsenceEntry) => 
          `${formatDate(entry.datum)} (${entry.beginnZeit} - ${entry.endZeit} Uhr)`
        ).join('\n');

        const formattedAbsences = absenceEntries.map((entry: AbsenceEntry) => 
          `${formatDate(entry.datum)} - ${entry.art}${entry.grund ? ` (${entry.grund})` : ''}`
        ).join('\n');

        const [nachname = "", vorname = ""] = student.split(",").map(s => s.trim());

        return {
          'Nr.': index + 1,
          'Nachname': nachname,
          'Vorname': vorname,
          'Klasse': stats.klasse,
          'Unentschuldigte Verspätungen': formattedLates || '-',
          'Unentschuldigte Fehlzeiten': formattedAbsences || '-'
        };
      });
    } else {
      return data.map(([student, stats]) => {
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

        const schoolYearData = schoolYearStats[student] || { 
          verspaetungen_unentsch: 0, 
          fehlzeiten_unentsch: 0 
        };

        const [nachname = "", vorname = ""] = student.split(",").map(s => s.trim());

        return {
          'Nachname': nachname,
          'Vorname': vorname,
          'Klasse': stats.klasse,
          'Verspätungen (E)': stats.verspaetungen_entsch,
          'Verspätungen (U)': stats.verspaetungen_unentsch,
          'Verspätungen (O)': stats.verspaetungen_offen,
          'Fehlzeiten (E)': stats.fehlzeiten_entsch,
          'Fehlzeiten (U)': stats.fehlzeiten_unentsch,
          'Fehlzeiten (O)': stats.fehlzeiten_offen,
          '∑SJ V': schoolYearData.verspaetungen_unentsch,
          '∑SJ F': schoolYearData.fehlzeiten_unentsch,
          'Øx() V': verspaetungenWeekly,
          'Øx() F': fehlzeitenWeekly,
          '∑x() V': verspaetungenSum,
          '∑x() F': fehlzeitenSum
        };
      });
    }
  };

  const exportToExcel = () => {
    const formattedData = formatData();
    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Anwesenheitsstatistik");

    const colWidths = isReportView ? 
      [10, 30, 30, 15, 60, 60] : 
      [25, 25, 15, 15, 15, 15, 15, 15, 15, 15, 15, 20, 20, 20, 20];

    worksheet['!cols'] = colWidths.map(width => ({ width }));

    const filename = `Anwesenheitsstatistik_${startDate}_${endDate}.xlsx`;
    XLSX.writeFile(workbook, filename);
  };

  const exportToCSV = () => {
    const formattedData = formatData();
    const csv = unparse(formattedData, {
      quotes: true,
      newline: '\n',
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Anwesenheitsstatistik_${startDate}_${endDate}.csv`;
    link.click();
  };

  const exportToPDF = () => {
    const formattedData = formatData();
    const doc = new jsPDF({
      orientation: isReportView ? 'portrait' : 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const margin = {
      left: 15,
      right: 15,
      top: 20,
      bottom: 20
    };

    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const contentWidth = pageWidth - margin.left - margin.right;

    doc.setFontSize(16);
    doc.text('Anwesenheitsstatistik', margin.left, margin.top);
    doc.setFontSize(12);
    doc.text(`Zeitraum: ${new Date(startDate).toLocaleDateString('de-DE')} - ${new Date(endDate).toLocaleDateString('de-DE')}`, margin.left, margin.top + 10);

    const enrichedData = formattedData.map(row => {
      const studentName = `${row['Nachname']}, ${row['Vorname']}`;

      if (!expandedStudents.has(studentName)) {
        return row;
      }

      const filterType = activeFilters.get(studentName);
      if (!filterType) return row;

      let details: AbsenceEntry[] = [];
      const studentData = detailedData[studentName];
      
      if (studentData) {
        switch(filterType) {
          case 'verspaetungen_entsch':
          case 'verspaetungen_unentsch':
          case 'verspaetungen_offen':
          case 'fehlzeiten_entsch':
          case 'fehlzeiten_unentsch':
          case 'fehlzeiten_offen':
            details = studentData[filterType as keyof DetailedStats] || [];
            break;
          case 'sj_verspaetungen':
          case 'sj_fehlzeiten':
            details = filterType === 'sj_verspaetungen' 
              ? studentData.verspaetungen_unentsch 
              : studentData.fehlzeiten_unentsch;
            break;
          case 'weekly_verspaetungen':
          case 'sum_verspaetungen':
          case 'weekly_fehlzeiten':
          case 'sum_fehlzeiten': {
            const isVerspaetung = filterType.includes('verspaetungen');
            const entries = isVerspaetung 
              ? studentData.verspaetungen_unentsch 
              : studentData.fehlzeiten_unentsch;
            const weeks = getLastNWeeks(parseInt(selectedWeeks));
            details = entries.filter(entry => {
              const date = typeof entry.datum === 'string' ? parseDate(entry.datum) : entry.datum;
              return weeks.some(week => date >= week.startDate && date <= week.endDate);
            });
            break;
          }
          case 'details':
            details = [
              ...studentData.verspaetungen_unentsch,
              ...studentData.fehlzeiten_unentsch
            ];
            break;
        }
      }

      const formattedDetails = details
        .sort((a, b) => {
          const dateA = typeof a.datum === 'string' ? parseDate(a.datum) : a.datum;
          const dateB = typeof b.datum === 'string' ? parseDate(b.datum) : b.datum;
          return dateB.getTime() - dateA.getTime();
        })
        .map(entry => {
          const date = formatDate(entry.datum);
          const type = entry.art;
          const time = entry.beginnZeit ? ` (${entry.beginnZeit}${entry.endZeit ? ` - ${entry.endZeit}` : ''} Uhr)` : '';
          const reason = entry.grund ? ` - ${entry.grund}` : '';
          const status = entry.status ? ` [${entry.status}]` : '';
          return `${date}${time}: ${type}${reason}${status}`;
        });

      return {
        ...row,
        'Details': formattedDetails.length > 0 ? formattedDetails.join('\n') : '-'
      };
    });

    const hasDetails = enrichedData.some(row => row['Details']);
    const baseColumnStyles = isReportView ? {
      0: { cellWidth: 8 },
      1: { cellWidth: 25 },
      2: { cellWidth: 25 },
      3: { cellWidth: 12 },
      4: { cellWidth: 55 },
      5: { cellWidth: 55 },
    } : {
      0: { cellWidth: 20 },
      1: { cellWidth: 20 },
      2: { cellWidth: 12 },
      3: { cellWidth: 15 },
      4: { cellWidth: 15 },
      5: { cellWidth: 15 },
      6: { cellWidth: 15 },
      7: { cellWidth: 15 },
      8: { cellWidth: 15 },
      9: { cellWidth: 12 },
      10: { cellWidth: 12 },
      11: { cellWidth: 18 },
      12: { cellWidth: 18 },
      13: { cellWidth: 18 },
      14: { cellWidth: 18 },
    };

    const columnStyles = hasDetails ? {
      ...baseColumnStyles,
      'Details': { cellWidth: 60 }
    } : baseColumnStyles;

    autoTable(doc, {
      head: [Object.keys(enrichedData[0])],
      body: enrichedData.map(Object.values),
      startY: margin.top + 20,
      margin: margin,
      styles: {
        fontSize: 8,
        cellPadding: 1.5,
        overflow: 'linebreak',
        cellWidth: 'wrap',
        minCellHeight: 3
      },
      headStyles: {
        fillColor: [66, 66, 66],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      columnStyles: columnStyles,
    });

    doc.save(`Anwesenheitsstatistik_${startDate}_${endDate}.pdf`);
  };
  
  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={exportToExcel}
      >
        Als Excel exportieren
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={exportToCSV}
      >
        Als CSV exportieren
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={exportToPDF}
      >
        Als PDF exportieren
      </Button>
    </div>
  );
}; // Ende der ExportButtons-Komponente

export default ExportButtons;
