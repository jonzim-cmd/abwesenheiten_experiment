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
        return 'Detaillierte Übersicht aller Abwesenheiten';
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
    switch(filterType) {
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
        return details.verspaetungen_unentsch || [];
      case 'sj_fehlzeiten':
        return details.fehlzeiten_unentsch || [];
      default:
        return [];
    }
  };

  const formatData = () => {
    if (isReportView) {
      return data.map(([student, stats], index) => {
        const studentData = detailedData[student];
        const filterType = activeFilters.get(student);
        let detailsToShow: string[] = [];

        if (expandedStudents.has(student) && filterType && studentData) {
          const entries = getDetailEntries(studentData, filterType);
          detailsToShow = formatDetails(entries);
        }

        const [nachname = "", vorname = ""] = student.split(",").map(s => s.trim());

        return {
          'Nr.': index + 1,
          'Nachname': nachname,
          'Vorname': vorname,
          'Klasse': stats.klasse,
          'Details': detailsToShow.join('\n') || '-'
        };
      });
    } else {
      return data.map(([student, stats]) => {
        const weeklyData = weeklyStats[student] || {
          verspaetungen: { total: 0, weekly: Array(parseInt(selectedWeeks)).fill(0) },
          fehlzeiten: { total: 0, weekly: Array(parseInt(selectedWeeks)).fill(0) }
        };

        const filterType = activeFilters.get(student);
        let detailsToShow: string[] = [];

        if (expandedStudents.has(student) && filterType && detailedData[student]) {
          const entries = getDetailEntries(detailedData[student], filterType);
          detailsToShow = formatDetails(entries);
        }

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
          'Details': detailsToShow.length > 0 ? `\n${detailsToShow.join('\n')}` : '-'
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
      [10, 30, 30, 15, 60] :
      [25, 25, 15, 12, 12, 12, 12, 12, 12, 60];

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
      orientation: 'landscape',
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

    // Prepare table data
    const tableData = formattedData.map(row => Object.values(row));

    // Define columns based on view type
    const columns = isReportView ?
      ['Nr.', 'Nachname', 'Vorname', 'Klasse', 'Details'] :
      ['Nachname', 'Vorname', 'Klasse', 'V (E)', 'V (U)', 'V (O)', 'F (E)', 'F (U)', 'F (O)', 'Details'];

    // Create the table
    autoTable(doc, {
      head: [columns],
      body: tableData,
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
      columnStyles: isReportView ? {
        0: { cellWidth: 10 },
        1: { cellWidth: 30 },
        2: { cellWidth: 30 },
        3: { cellWidth: 15 },
        4: { cellWidth: 80 }
      } : {
        0: { cellWidth: 25 },
        1: { cellWidth: 25 },
        2: { cellWidth: 15 },
        3: { cellWidth: 12 },
        4: { cellWidth: 12 },
        5: { cellWidth: 12 },
        6: { cellWidth: 12 },
        7: { cellWidth: 12 },
        8: { cellWidth: 12 },
        9: { cellWidth: 80 }
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
