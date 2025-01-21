import React from 'react';
import { Button } from "@/components/ui/button";
import * as XLSX from 'xlsx';
import { unparse } from 'papaparse';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { StudentStats, AbsenceEntry } from '@/lib/attendance-utils';

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
  detailedData?: Record<string, any>;
  expandedStudents?: Set<string>;
  activeFilters?: Map<string, string>;
}

const ExportButtons = ({ 
  data, 
  startDate, 
  endDate, 
  schoolYearStats,
  weeklyStats,
  selectedWeeks,
  isReportView = false,
  detailedData = {},
  expandedStudents = new Set(),
  activeFilters = new Map()
}: ExportButtonsProps) => {

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

  const getDetailTitle = (filterType: string): string => {
    switch (filterType) {
      case 'details':
        return 'Detaillierte Übersicht der unentschuldigten Abwesenheiten';
      case 'verspaetungen_entsch':
        return 'Entschuldigte Verspätungen im ausgewählten Zeitraum';
      case 'verspaetungen_unentsch':
        return 'Unentschuldigte Verspätungen im ausgewählten Zeitraum';
      case 'verspaetungen_offen':
        return 'Noch zu entschuldigende Verspätungen (Frist läuft noch)';
      case 'fehlzeiten_entsch':
        return 'Entschuldigte Fehlzeiten im ausgewählten Zeitraum';
      case 'fehlzeiten_unentsch':
        return 'Unentschuldigte Fehlzeiten im ausgewählten Zeitraum';
      case 'fehlzeiten_offen':
        return 'Noch zu entschuldigende Fehlzeiten (Frist läuft noch)';
      case 'sj_verspaetungen':
        return 'Unentschuldigte Verspätungen im gesamten Schuljahr';
      case 'sj_fehlzeiten':
        return 'Unentschuldigte Fehlzeiten im gesamten Schuljahr';
      default:
        if (filterType?.startsWith('weekly_')) {
          const isVerspaetung = filterType.includes('verspaetungen');
          return `Unentschuldigte ${isVerspaetung ? 'Verspätungen' : 'Fehlzeiten'} (Wochendurchschnitt)`;
        }
        if (filterType?.startsWith('sum_')) {
          const isVerspaetung = filterType.includes('verspaetungen');
          return `Unentschuldigte ${isVerspaetung ? 'Verspätungen' : 'Fehlzeiten'} (Gesamtsumme)`;
        }
        return 'Abwesenheitsdetails';
    }
  };

  const formatDetails = (entries: AbsenceEntry[]): string[] => {
    if (!entries || entries.length === 0) return [];

    return entries
      .sort((a, b) => new Date(b.datum).getTime() - new Date(a.datum).getTime())
      .map((entry, idx) => {
        const reverseIndex = entries.length - idx;
        if (entry.art === 'Verspätung') {
          return `${reverseIndex}. ${formatDate(entry.datum)} (${entry.beginnZeit} - ${entry.endZeit} Uhr)${entry.grund ? ` (${entry.grund})` : ''}${entry.status ? ` [${entry.status}]` : ''}`;
        } else {
          return `${reverseIndex}. ${formatDate(entry.datum)} - ${entry.art}${entry.grund ? ` (${entry.grund})` : ''}${entry.status ? ` [${entry.status}]` : ''}`;
        }
      });
  };

  const getDetailEntries = (details: any, filterType: string): AbsenceEntry[] => {
    const today = new Date();
    const addOverdueEntries = (entries: AbsenceEntry[]) => {
      return entries.filter(entry => {
        const entryDate = new Date(entry.datum);
        const deadlineDate = new Date(entryDate.getTime() + 7 * 24 * 60 * 60 * 1000);
        return today > deadlineDate;
      });
    };

    switch(filterType) {
      case 'details':
        return [
          ...(details.verspaetungen_unentsch || []),
          ...(details.fehlzeiten_unentsch || []),
          ...addOverdueEntries(details.verspaetungen_offen || []),
          ...addOverdueEntries(details.fehlzeiten_offen || [])
        ];
      case 'verspaetungen_entsch':
        return details.verspaetungen_entsch || [];
      case 'verspaetungen_unentsch':
        return details.verspaetungen_unentsch || [];
      case 'verspaetungen_offen':
        return details.verspaetungen_offen || [];
      case 'fehlzeiten_entsch':
        return details.fehlzeiten_entsch || [];
      case 'fehlzeiten_unentsch':
        return details.fehlzeiten_unentsch || [];
      case 'fehlzeiten_offen':
        return details.fehlzeiten_offen || [];
      case 'sj_verspaetungen':
      case 'weekly_verspaetungen':
      case 'sum_verspaetungen':
        return details.verspaetungen_unentsch || [];
      case 'sj_fehlzeiten':
      case 'weekly_fehlzeiten':
      case 'sum_fehlzeiten':
        return details.fehlzeiten_unentsch || [];
      default:
        return [];
    }
  };

  const formatData = () => {
    if (isReportView) {
      return data.map(([student, stats], index) => {
        const studentData = detailedData[student];
        const lateEntries = studentData?.verspaetungen_unentsch || [];
        const absenceEntries = studentData?.fehlzeiten_unentsch || [];

        const formattedLates = formatDetails(lateEntries);
        const formattedAbsences = formatDetails(absenceEntries);

        const [nachname = "", vorname = ""] = student.split(",").map(s => s.trim());

        return {
          'Nr.': index + 1,
          'Nachname': nachname,
          'Vorname': vorname,
          'Klasse': stats.klasse,
          'Unentschuldigte Verspätungen': formattedLates.join('\n') || '-',
          'Unentschuldigte Fehlzeiten': formattedAbsences.join('\n') || '-'
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
      [25, 25, 15, 12, 12, 12, 12, 12, 12, 10, 10, 25, 25, 25, 25];

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

    // Add title and date range
    doc.setFontSize(16);
    doc.text('Anwesenheitsstatistik', margin.left, margin.top);
    doc.setFontSize(12);
    doc.text(
      `Zeitraum: ${new Date(startDate).toLocaleDateString('de-DE')} - ${new Date(endDate).toLocaleDateString('de-DE')}`,
      margin.left,
      margin.top + 10
    );

    // Prepare table data with expanded details
    const tableData = formattedData.reduce((acc: any[], row: any) => {
      // Add main row
      acc.push(Object.values(row));
      
      // If student is expanded and has details
      const studentName = row['Nachname'] + ", " + row['Vorname'];
      if (expandedStudents.has(studentName)) {
        const filterType = activeFilters.get(studentName);
        const details = detailedData[studentName];
        
        if (details && filterType) {
          const columnCount = isReportView ? 6 : 15;
          
          // Add empty row for better readability
          acc.push(Array(columnCount).fill(''));
          
          // Add detail section title
          const detailTitle = getDetailTitle(filterType);
          acc.push([{ content: detailTitle, colSpan: columnCount, styles: { fontStyle: 'bold' } }]);
          
          // Format and add detail entries
          const entries = getDetailEntries(details, filterType);
          const formattedDetails = formatDetails(entries);
          formattedDetails.forEach(detail => {
            acc.push([{ content: detail, colSpan: columnCount, styles: { fontSize: 8 } }]);
          });
          
          // Add empty row after details
          acc.push(Array(columnCount).fill(''));
        }
      }
      
      return acc;
    }, []);

    // Create the table
    autoTable(doc, {
      head: [Object.keys(formattedData[0])],
      body: tableData,
      startY: margin.top + 20,
      margin: margin,
      styles: {
        fontSize: 8,
        cellPadding: 1.5,
        overflow: 'linebreak',
        cellWidth: 'wrap',
        minCellHeight: 3,
        halign: 'left'
      },
      headStyles: {
        fillColor: [66, 66, 66],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      columnStyles: isReportView ? {
        0: { cellWidth: 8 },
        1: { cellWidth: 25 },
        2: { cellWidth: 25 },
        3: { cellWidth: 12 },
        4: { cellWidth: 55 },
        5: { cellWidth: 55 }
      } : {
        0: { cellWidth: 25 }, // Nachname
        1: { cellWidth: 25 }, // Vorname
        2: { cellWidth: 12 }, // Klasse
        3: { cellWidth: 12 }, // V (E)
        4: { cellWidth: 12 }, // V (U)
        5: { cellWidth: 12 }, // V (O)
        6: { cellWidth: 12 }, // F (E)
        7: { cellWidth: 12 }, // F (U)
        8: { cellWidth: 12 }, // F (O)
        9: { cellWidth: 10 }, // ∑SJ V
        10: { cellWidth: 10 }, // ∑SJ F
        11: { cellWidth: 25 }, // Øx() V - breiter für Klammerwerte
        12: { cellWidth: 25 }, // Øx() F
        13: { cellWidth: 25 }, // ∑x() V
        14: { cellWidth: 25 }  // ∑x() F
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
