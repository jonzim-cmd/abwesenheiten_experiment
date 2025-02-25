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
  // Get the friendly name for each filter type
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

  // Get the color for a filter type to use in PDF exports
  const getFilterTypeColor = (filterType: string): number[] => {
    switch(filterType) {
      case 'verspaetungen_entsch':
        return [220, 237, 200]; // Light green
      case 'verspaetungen_unentsch':
        return [255, 213, 213]; // Light red
      case 'verspaetungen_offen':
        return [255, 243, 205]; // Light yellow
      case 'fehlzeiten_entsch':
        return [200, 230, 201]; // Green
      case 'fehlzeiten_unentsch':
        return [255, 205, 210]; // Red
      case 'fehlzeiten_offen':
        return [255, 236, 179]; // Yellow
      case 'sj_verspaetungen':
      case 'weekly_verspaetungen':
      case 'sum_verspaetungen':
        return [225, 225, 255]; // Light blue
      case 'sj_fehlzeiten':
      case 'weekly_fehlzeiten':
      case 'sum_fehlzeiten':
      case 'sj_fehlzeiten_ges':
        return [230, 230, 250]; // Lavender
      case 'details':
        return [240, 240, 240]; // Light gray
      default:
        return [245, 245, 245]; // Default light gray
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

  // Get details for a student based on the filter type
  const getStudentDetails = (studentName: string, filterType: string | undefined): AbsenceEntry[] => {
    if (!filterType) return [];
    
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
    
    return details.sort((a, b) => {
      const dateA = typeof a.datum === 'string' ? parseDate(a.datum) : a.datum;
      const dateB = typeof b.datum === 'string' ? parseDate(b.datum) : b.datum;
      return dateB.getTime() - dateA.getTime();
    });
  };

  // Format details for display with numbering
  const formatDetails = (details: AbsenceEntry[]): string[] => {
    return details.map((entry, index) => {
      const numbering = `${index + 1}. `;
      const date = formatDate(entry.datum);
      const type = entry.art;
      const time = entry.beginnZeit ? `(${entry.beginnZeit}${entry.endZeit ? ` - ${entry.endZeit}` : ''} Uhr)` : '';
      const reason = entry.grund ? ` - ${entry.grund}` : '';
      const status = entry.status ? ` [${entry.status}]` : '';
      return `${numbering}${date}${time}: ${type}${reason}${status}`;
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
          'SJ-Verspätungen': schoolYearData.verspaetungen_unentsch,
          'SJ-Fehlzeiten': schoolYearData.fehlzeiten_unentsch,
          'SJ-Fehlzeiten (Ges.)': schoolYearData.fehlzeiten_gesamt,
          'Letzte Wochen (V)': verspaetungenSum,
          'Letzte Wochen (F)': fehlzeitenSum
        };
      });
    }
  };

  const exportToExcel = () => {
    const formattedData = formatData();
    
    // Enhance data with details if expanded
    const enrichedData = formattedData.map(row => {
      // For report view, we don't modify the data
      if (isReportView) return row;
      
      // For regular view, check if student is expanded
      const studentName = `${row['Nachname']}, ${row['Vorname']}`;
      if (!expandedStudents.has(studentName)) return row;
      
      const filterType = activeFilters.get(studentName);
      if (!filterType) return row;
      
      const details = getStudentDetails(studentName, filterType);
      if (details.length === 0) return row;
      
      const formattedDetailLines = formatDetails(details);
      if (formattedDetailLines.length === 0) return row;
      
      const header = getDetailHeader(filterType);
      
      // Add details as a new property
      return {
        ...row,
        'Details': `${header}\n${formattedDetailLines.join('\n')}`
      };
    });
    
    const worksheet = XLSX.utils.json_to_sheet(enrichedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Anwesenheitsstatistik");

    // Set column widths - include Details column if there are details
    const hasDetails = enrichedData.some(row => row['Details']);
    const colWidths = isReportView ? 
      [10, 30, 30, 15, 60, 60] : 
      [...[25, 25, 15, 15, 15, 15, 15, 15, 15, 20, 20, 20, 20], ...(hasDetails ? [80] : [])];

    worksheet['!cols'] = colWidths.map(width => ({ width }));

    // Apply formatting - set row heights for detail rows
    if (hasDetails) {
      worksheet['!rows'] = [];
      let rowIndex = 1; // Start after header
      
      enrichedData.forEach(row => {
        worksheet['!rows'][rowIndex] = { hpt: 20 }; // Regular row height
        
        if (row['Details']) {
          // Count lines in the details to determine row height
          const lines = (row['Details'] as string).split('\n').length;
          // Roughly 15 points per line of text
          const detailsRowHeight = Math.max(60, lines * 15);
          worksheet['!rows'][rowIndex + 1] = { hpt: detailsRowHeight };
          rowIndex += 2; // Skip the details row
        } else {
          rowIndex += 1;
        }
      });
    }

    const filename = `Anwesenheitsstatistik_${startDate}_${endDate}.xlsx`;
    XLSX.writeFile(workbook, filename);
  };

  const exportToCSV = () => {
    const formattedData = formatData();
    
    // Enhance data with details if expanded, similar to Excel export
    const enrichedData = formattedData.map(row => {
      if (isReportView) return row;
      
      const studentName = `${row['Nachname']}, ${row['Vorname']}`;
      if (!expandedStudents.has(studentName)) return row;
      
      const filterType = activeFilters.get(studentName);
      if (!filterType) return row;
      
      const details = getStudentDetails(studentName, filterType);
      if (details.length === 0) return row;
      
      const formattedDetailLines = formatDetails(details);
      if (formattedDetailLines.length === 0) return row;
      
      const header = getDetailHeader(filterType);
      
      return {
        ...row,
        'Details': `${header}\n${formattedDetailLines.join('\n')}`
      };
    });
    
    const csv = unparse(enrichedData, {
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
  
    const maxPageWidth = doc.internal.pageSize.width - margin.left - margin.right;
  
    // PDF Header
    const addHeader = (isFirstPage = false) => {
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Anwesenheitsstatistik', margin.left, margin.top);
  
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      const startDateFormatted = new Date(startDate).toLocaleDateString('de-DE');
      const endDateFormatted = new Date(endDate).toLocaleDateString('de-DE');
      doc.text(`Zeitraum: ${startDateFormatted} - ${endDateFormatted}`, margin.left, margin.top + 10);
  
      if (!isReportView) {
        doc.setFontSize(10);
        doc.text(`Wochen für Berechnung: ${selectedWeeks}`, margin.left, margin.top + 16);
  
        // Legende für Abkürzungen
        doc.setFont('helvetica', 'italic');
        doc.text(
          'Legende: (E) = Entschuldigt, (U) = Unentschuldigt, (O) = Offen, SJ = Schuljahr, (V) = Verspätungen, (F) = Fehlzeiten',
          margin.left,
          margin.top + 22
        );
  
        // Farblegende
        doc.setFontSize(8);
        doc.setFillColor(0, 150, 0); // Grün
        doc.rect(margin.left, margin.top + 26, 3, 3, 'F');
        doc.setTextColor(0, 150, 0);
        doc.text('Entschuldigt', margin.left + 5, margin.top + 28);
  
        doc.setFillColor(200, 0, 0); // Rot
        doc.rect(margin.left + 30, margin.top + 26, 3, 3, 'F');
        doc.setTextColor(200, 0, 0);
        doc.text('Unentschuldigt', margin.left + 35, margin.top + 28);
  
        doc.setFillColor(204, 163, 0); // Gelb
        doc.rect(margin.left + 70, margin.top + 26, 3, 3, 'F');
        doc.setTextColor(204, 163, 0);
        doc.text('Noch offen', margin.left + 75, margin.top + 28);
  
        doc.setTextColor(0, 0, 0); // Zurücksetzen
      }
    };
  
    // Spaltenüberschriften
    const columnHeaders = isReportView
      ? {
          'Nr.': 'Nr.',
          'Nachname': 'Nachname',
          'Vorname': 'Vorname',
          'Klasse': 'Klasse',
          'Unentschuldigte Verspätungen': 'Unentsch. Verspätungen',
          'Unentschuldigte Fehlzeiten': 'Unentsch. Fehlzeiten'
        }
      : {
          'Nachname': 'Nachname',
          'Vorname': 'Vorname',
          'Klasse': 'Klasse',
          'Verspätungen (E)': 'Versp. (E)',
          'Verspätungen (U)': 'Versp. (U)',
          'Verspätungen (O)': 'Versp. (O)',
          'Fehlzeiten (E)': 'Fehlz. (E)',
          'Fehlzeiten (U)': 'Fehlz. (U)',
          'Fehlzeiten (O)': 'Fehlz. (O)',
          'SJ-Verspätungen': 'SJ-Versp.',
          'SJ-Fehlzeiten': 'SJ-Fehlz.',
          'SJ-Fehlzeiten (Ges.)': 'SJ-Fehlz. (Ges.)',
          'Letzte Wochen (V)': `${selectedWeeks}W (V)`,
          'Letzte Wochen (F)': `${selectedWeeks}W (F)`
        };
  
    // Daten mit Details vorbereiten
    const detailsData = formattedData.map((row, index) => {
      const studentName = `${row['Nachname']}, ${row['Vorname']}`;
      if (!expandedStudents.has(studentName)) return { ...row, 'Nr.': index + 1, _hasDetails: false };
  
      const filterType = activeFilters.get(studentName);
      if (!filterType) return { ...row, 'Nr.': index + 1, _hasDetails: false };
  
      const details = getStudentDetails(studentName, filterType);
      if (details.length === 0) return { ...row, 'Nr.': index + 1, _hasDetails: false };
  
      const categorizedDetails = groupDetailsByCategory(details, filterType);
  
      return {
        ...row,
        'Nr.': index + 1,
        _hasDetails: true,
        _filterType: filterType,
        _detailsCategories: categorizedDetails
      };
    });
  
    // Spaltenbreiten berechnen
    const calculateColumnWidths = () => {
      const baseWidths = isReportView
        ? [8, 25, 25, 12, 55, 55] // Report-Ansicht
        : [20, 20, 12, 12, 12, 12, 12, 12, 12, 15, 15, 20, 20]; // Normalansicht
  
      if (isReportView) return baseWidths;
  
      const totalFixedWidth = baseWidths.reduce((sum, w) => sum + w, 0);
      const availableWidth = maxPageWidth - totalFixedWidth;
      const adjustedWidths = [...baseWidths];
      adjustedWidths[11] = availableWidth / 2; // Letzte Wochen (V)
      adjustedWidths[12] = availableWidth / 2; // Letzte Wochen (F)
      return adjustedWidths;
    };
  
    const calculatedWidths = calculateColumnWidths();
  
    // Spaltenstile für autoTable
    const baseColumnStyles: { [key: string]: any } = {};
    Object.keys(columnHeaders).forEach((key, index) => {
      if (calculatedWidths[index]) {
        baseColumnStyles[key] = {
          cellWidth: calculatedWidths[index],
          halign: ['Nachname', 'Vorname', 'Klasse'].includes(key) ? 'left' : 'center'
        };
      }
    });
  
    // Header auf erster Seite rendern
    addHeader(true);
    let currentY = margin.top + (isReportView ? 25 : 35);
  
    // Haupttabelle rendern (ohne Details)
    autoTable(doc, {
      head: [Object.values(columnHeaders)],
      body: detailsData.map(row => Object.keys(columnHeaders).map(key => row[key] || '')),
      startY: currentY,
      margin: margin,
      styles: {
        fontSize: 8,
        cellPadding: 2,
        overflow: 'linebreak',
        cellWidth: 'wrap',
        minCellHeight: 8,
        valign: 'middle'
      },
      headStyles: {
        fillColor: [50, 50, 120],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle',
        fontSize: 9
      },
      columnStyles: baseColumnStyles,
      alternateRowStyles: {
        fillColor: [248, 248, 248]
      },
      didDrawPage: (data) => {
        currentY = data.cursor.y;
      }
    });
  
    // Details für expandierte Schüler rendern
    detailsData.forEach((row, rowIndex) => {
      if (!row._hasDetails) return;
  
      const filterType = row._filterType;
      const categories = row._detailsCategories;
      const bgColor = getFilterTypeColor(filterType);
  
      // Prüfe verfügbaren Platz auf der Seite
      const pageHeight = doc.internal.pageSize.height;
      const remainingSpace = pageHeight - currentY - margin.bottom;
      const estimatedDetailHeight =
        categories.reduce((sum, cat) => sum + cat.entries.length * 8 + 10, 0) + 10; // 8mm pro Detailzeile + 10mm pro Kategorie
  
      if (remainingSpace < estimatedDetailHeight + 20) {
        doc.addPage();
        addHeader(); // Header auf neuer Seite wiederholen
        currentY = margin.top + (isReportView ? 25 : 35);
      }
  
      // Kategorien durchlaufen (z. B. Verspätungen und Fehlzeiten bei 'details')
      categories.forEach((category, catIndex) => {
        const formattedDetails = formatDetailEntriesForPDF(category.entries);
  
        // Titel der Kategorie
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(60, 60, 60);
        doc.text(category.title, margin.left, currentY + 5);
        currentY += 8;
  
        // Detailzeilen
        formattedDetails.forEach((detail, detailIndex) => {
          const detailY = currentY + detailIndex * 6; // Mehr Abstand zwischen Zeilen (6mm)
  
          if (detailY + 6 > pageHeight - margin.bottom) {
            doc.addPage();
            addHeader();
            currentY = margin.top + (isReportView ? 25 : 35);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(60, 60, 60);
            doc.text(category.title, margin.left, currentY + 5); // Titel wiederholen
            currentY += 8;
          }
  
          doc.setFontSize(detail.styles.fontSize);
          doc.setTextColor(...detail.styles.textColor);
          doc.setFont('helvetica', detail.styles.fontStyle);
          doc.text(detail.content, margin.left + 5, currentY + detailIndex * 6 + 4);
        });
  
        currentY += formattedDetails.length * 6 + 4; // Abstand nach Kategorie
      });
  
      // Trennlinie nach den Details
      doc.setDrawColor(200, 200, 200);
      doc.line(margin.left, currentY, maxPageWidth + margin.left, currentY);
      currentY += 5;
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
