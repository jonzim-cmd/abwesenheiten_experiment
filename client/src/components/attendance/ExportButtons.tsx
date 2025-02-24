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
  getFilteredStudents: () => [string, StudentStats][];
  startDate: string;
  endDate: string;
  schoolYearStats: {
    [key: string]: {
      verspaetungen_unentsch: number;
      fehlzeiten_unentsch: number;
      fehlzeiten_gesamt: number;
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
  schoolYearDetailedData: Record<string, any>;
  weeklyDetailedData: Record<string, DetailedStats>;
  expandedStudents: Set<string>;
  activeFilters: Map<string, string>;
}

const parseDate = (dateStr: string | Date): Date => {
  if (dateStr instanceof Date) return dateStr;
  const [day, month, year] = dateStr.split('.');
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
};

const ExportButtons: React.FC<ExportButtonsProps> = ({ 
  getFilteredStudents, 
  startDate, 
  endDate, 
  schoolYearStats,
  weeklyStats,
  selectedWeeks,
  isReportView = false,
  detailedData,
  schoolYearDetailedData,
  weeklyDetailedData,
  expandedStudents,
  activeFilters
}) => {
  const getDetailHeader = (filterType: string): string => {
    switch(filterType) {
      case 'verspaetungen_entsch':
        return 'Entschuldigte Verspätungen';
      case 'verspaetungen_unentsch':
        return 'Unentschuldigte Verspätungen';
      case 'verspaetungen_offen':
        return 'Noch zu entschuldigende Verspätungen (Frist läuft noch)';
      case 'fehlzeiten_entsch':
        return 'Entschuldigte Fehlzeiten';
      case 'fehlzeiten_unentsch':
        return 'Unentschuldigte Fehlzeiten';
      case 'fehlzeiten_offen':
        return 'Noch zu entschuldigende Fehlzeiten (Frist läuft noch)';
      case 'sj_verspaetungen':
        return 'Unent. Verspätungen im Schuljahr';
      case 'sj_fehlzeiten':
        return 'Unent. Fehlzeiten im Schuljahr';
      case 'sj_fehlzeiten_ges':
        return 'Ges. Fehlzeiten im Schuljahr (E + U)';
      case 'weekly_verspaetungen':
      case 'sum_verspaetungen':
        return 'Unent. Verspätungen in den letzten ' + selectedWeeks + ' Wochen';
      case 'weekly_fehlzeiten':
      case 'sum_fehlzeiten':
        return 'Unent. Fehlzeiten in den letzten ' + selectedWeeks + ' Wochen';
      case 'details':
        return 'Unent. Verspätungen und Fehlzeiten';
      default:
        return '';
    }
  };
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
    const data = getFilteredStudents();
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

        const verspaetungenSum = `${weeklyData.verspaetungen.total}(${weeklyData.verspaetungen.weekly.join(',')})`;
        const fehlzeitenSum = `${weeklyData.fehlzeiten.total}(${weeklyData.fehlzeiten.weekly.join(',')})`;

        const schoolYearData = schoolYearStats[student] || { 
          verspaetungen_unentsch: 0, 
          fehlzeiten_unentsch: 0,
          fehlzeiten_gesamt: 0
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
          '∑SJ F₍ges₎': schoolYearData.fehlzeiten_gesamt,
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
      [25, 25, 15, 15, 15, 15, 15, 15, 15, 15, 15, 20, 20];
      // Anz. Spalten: Nachname, Vorname, Klasse, 3x Verspätungen, 3x Fehlzeiten, ∑SJ V, ∑SJ F, ∑SJ F₍ges₎, ∑x() V, ∑x() F

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
      let studentData;
      if (filterType.startsWith('sj_')) {
        studentData = schoolYearDetailedData[studentName];
      } else if (filterType.startsWith('weekly_') || filterType.startsWith('sum_')) {
        studentData = weeklyDetailedData[studentName];
      } else {
        studentData = detailedData[studentName];
      }
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
            details = studentData.verspaetungen_unentsch;
            break;
          case 'sj_fehlzeiten':
            details = studentData.fehlzeiten_unentsch;
            break;
          case 'sj_fehlzeiten_ges':
            details = studentData.fehlzeiten_gesamt;
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
          const time = entry.beginnZeit ? `(${entry.beginnZeit}${entry.endZeit ? ` - ${entry.endZeit}` : ''} Uhr)` : '';
          const reason = entry.grund ? ` - ${entry.grund}` : '';
          const status = entry.status ? ` [${entry.status}]` : '';
          return `${date}${time}: ${type}${reason}${status}`;
        });
      if (formattedDetails.length > 0) {
        const header = getDetailHeader(filterType);
        return {
          ...row,
          'Details': `${header}\n${formattedDetails.join('\n')}`
        };
      }
      return row;
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
      9: { cellWidth: 15 },
      10: { cellWidth: 15 },
      11: { cellWidth: 20 },
      12: { cellWidth: 20 },
    };

    const columnStyles = hasDetails ? {
      ...baseColumnStyles,
      'Details': { cellWidth: 60 }
    } : baseColumnStyles;

    autoTable(doc, {
      head: [Object.keys(enrichedData[0])],
      body: enrichedData.flatMap(row => {
        if (row['Details']) {
          const mainRow = Object.values(row).slice(0, -1);
          return [
            mainRow,
            [{ 
              content: row['Details'], 
              colSpan: mainRow.length, 
              styles: { 
                fillColor: [245, 245, 245],
                textColor: [100, 100, 100],
                fontSize: 7,
                cellPadding: 3
              }
            }]
          ];
        }
        return [Object.values(row)];
      }),
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
      rowStyles: (row) => {
        if (row.raw[row.raw.length - 1] && typeof row.raw[0] === 'string' && row.raw[0] === '') {
          return {
            fillColor: [245, 245, 245],
            textColor: [100, 100, 100],
            fontSize: 7
          };
        }
        return {};
      }
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
};

export default ExportButtons;
