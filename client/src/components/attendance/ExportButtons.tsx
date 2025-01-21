import React from 'react';
import { Button } from "@/components/ui/button";
import * as XLSX from 'xlsx';
import { unparse } from 'papaparse';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { StudentStats } from '@/lib/attendance-utils';

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
  detailedData = {}
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

  const formatData = () => {
    if (isReportView) {
      // Format data for report view
      return data.map(([student, stats], index) => {
        const studentData = detailedData[student];
        const lateEntries = studentData?.verspaetungen_unentsch || [];
        const absenceEntries = studentData?.fehlzeiten_unentsch || [];

        // Format late entries
        const formattedLates = lateEntries.map((entry: any) => 
          `${formatDate(entry.datum)} (${entry.beginnZeit} - ${entry.endZeit} Uhr)`
        ).join('\n');

        // Format absence entries
        const formattedAbsences = absenceEntries.map((entry: any) => 
          `${formatDate(entry.datum)} - ${entry.art}${entry.grund ? ` (${entry.grund})` : ''}`
        ).join('\n');

        // Split student name into Nachname and Vorname
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
      // Format data for normal view
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

        // Split student name into Nachname and Vorname
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

    // Adjust column widths for better readability
    const colWidths = isReportView ? 
      [10, 30, 30, 15, 60, 60] : // Report view column widths
      [25, 25, 15, 15, 15, 15, 15, 15, 15, 15, 15, 20, 20, 20, 20]; // Normal view column widths

    worksheet['!cols'] = colWidths.map(width => ({ width }));

    const filename = `Anwesenheitsstatistik_${startDate}_${endDate}.xlsx`;
    XLSX.writeFile(workbook, filename);
  };

  const exportToCSV = () => {
    const formattedData = formatData();
    const csv = unparse(formattedData, {
      quotes: true, // Force quotes around all fields
      newline: '\n', // Use Unix-style line endings
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

    // Set minimum margins (in mm)
    const margin = {
      left: 15,
      right: 15,
      top: 20,
      bottom: 20
    };

    // Calculate available width for content
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const contentWidth = pageWidth - margin.left - margin.right;

    // Add title
    doc.setFontSize(16);
    doc.text('Anwesenheitsstatistik', margin.left, margin.top);
    doc.setFontSize(12);
    doc.text(`Zeitraum: ${new Date(startDate).toLocaleDateString('de-DE')} - ${new Date(endDate).toLocaleDateString('de-DE')}`, margin.left, margin.top + 10);

 // Create table data with expanded details
    let tableData = [];
    formattedData.forEach((row) => {
        tableData.push(Object.values(row));
        
        const studentName = `${row['Nachname']}, ${row['Vorname']}`;
        if (expandedStudents?.has(studentName)) {
            const filterType = activeFilters?.get(studentName);
            let details = [];
            
            switch(filterType) {
                case 'verspaetungen_unentsch':
                    details = detailedData[studentName]?.verspaetungen_unentsch || [];
                    break;
                case 'fehlzeiten_unentsch':
                    details = detailedData[studentName]?.fehlzeiten_unentsch || [];
                    break;
                // ... weitere cases für andere Filter
            }
            
            if (details.length > 0) {
                details.forEach(detail => {
                    tableData.push([
                        '',  // Einrückung
                        formatDate(detail.datum),
                        detail.art,
                        detail.beginnZeit || '',
                        detail.endZeit || '',
                        detail.grund || ''
                    ]);
                });
            }
        }
    });
    
    // Add table
    autoTable(doc, {
      head: [Object.keys(formattedData[0])],
      body: formattedData.map(Object.values),
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
        0: { cellWidth: 8 }, // Nr
        1: { cellWidth: 25 }, // Nachname
        2: { cellWidth: 25 }, // Vorname
        3: { cellWidth: 12 }, // Klasse
        4: { cellWidth: 55 }, // Unentschuldigte Verspätungen
        5: { cellWidth: 55 }, // Unentschuldigte Fehlzeiten
      } : {
        0: { cellWidth: 20 }, // Nachname
        1: { cellWidth: 20 }, // Vorname
        2: { cellWidth: 12 }, // Klasse
        3: { cellWidth: 15 }, // Verspätungen (E)
        4: { cellWidth: 15 }, // Verspätungen (U)
        5: { cellWidth: 15 }, // Verspätungen (O)
        6: { cellWidth: 15 }, // Fehlzeiten (E)
        7: { cellWidth: 15 }, // Fehlzeiten (U)
        8: { cellWidth: 15 }, // Fehlzeiten (O)
        9: { cellWidth: 12 }, // ∑SJ V
        10: { cellWidth: 12 }, // ∑SJ F
        11: { cellWidth: 18 }, // Øx() V
        12: { cellWidth: 18 }, // Øx() F
        13: { cellWidth: 18 }, // ∑x() V
        14: { cellWidth: 18 }, // ∑x() F
      },
        alternateRowStyles: {
            fillColor: [245, 245, 245]
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
