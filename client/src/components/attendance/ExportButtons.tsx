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
  // Ermittelt den Header-Text für Details
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

  // Bestimmt die Hintergrundfarbe (RGB) für einen Filtertyp (PDF)
  const getFilterTypeColor = (filterType: string): number[] => {
    switch(filterType) {
      case 'verspaetungen_entsch':
        return [220, 237, 200]; // Hellgrün
      case 'verspaetungen_unentsch':
        return [255, 213, 213]; // Hellrot
      case 'verspaetungen_offen':
        return [255, 243, 205]; // Hellgelb
      case 'fehlzeiten_entsch':
        return [200, 230, 201]; // Grün
      case 'fehlzeiten_unentsch':
        return [255, 205, 210]; // Rot
      case 'fehlzeiten_offen':
        return [255, 236, 179]; // Gelb
      case 'sj_verspaetungen':
      case 'weekly_verspaetungen':
      case 'sum_verspaetungen':
        return [225, 225, 255]; // Hellblau
      case 'sj_fehlzeiten':
      case 'weekly_fehlzeiten':
      case 'sum_fehlzeiten':
      case 'sj_fehlzeiten_ges':
        return [230, 230, 250]; // Lavendel
      case 'details':
        return [240, 240, 240]; // Hellgrau
      default:
        return [245, 245, 245]; // Standardhellgrau
    }
  };

  // Gibt für einen Eintrag den passenden Statusfarbcode (RGB) zurück
  const getStatusColor = (status: string, datum: Date | string): number[] => {
    if (status === 'entsch.' || status === 'Attest' || status === 'Attest Amtsarzt') {
      return [0, 150, 0]; // Grün
    }
    if (status === 'nicht entsch.' || status === 'nicht akzep.') {
      return [200, 0, 0]; // Rot
    }
    if (!status || status.trim() === '') {
      const today = new Date();
      let abwesenheitsDatum: Date;
      if (typeof datum === 'string') {
        const [day, month, year] = datum.split('.');
        abwesenheitsDatum = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      } else {
        abwesenheitsDatum = new Date(datum);
      }
      const deadlineDate = new Date(abwesenheitsDatum.getTime() + 7 * 24 * 60 * 60 * 1000);
      if (today > deadlineDate) {
        return [200, 0, 0]; // Rot – Frist abgelaufen
      }
    }
    return [204, 163, 0]; // Gelb – offen/Frist nicht überschritten
  };

  // Formatierung eines Datums in das gewünschte Format
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

  // Liest Details für einen Schüler anhand des aktuellen Filtertyps
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

  // Formatiert Detailzeilen für den PDF-Export und fügt eine Nummerierung hinzu
  const formatDetailEntriesForPDF = (details: AbsenceEntry[]): { content: string, styles: any }[] => {
    return details.map((entry, index) => {
      const indexNumber = details.length - index; // Neueste Einträge oben
      const date = formatDate(entry.datum);
      let content = '';
      if (entry.art === 'Verspätung') {
        content = `${indexNumber}. ${date}: ${entry.beginnZeit} - ${entry.endZeit} Uhr`;
      } else {
        content = `${indexNumber}. ${date}: ${entry.art}`;
      }
      if (entry.grund) {
        content += ` - ${entry.grund}`;
      }
      if (entry.status) {
        content += ` [${entry.status}]`;
      }
      return {
        content,
        styles: {
          textColor: getStatusColor(entry.status || '', entry.datum),
          fontSize: 8,
          fontStyle: 'normal'
        }
      };
    });
  };

  // Formatiert die Haupttabelle (Schülerdaten) für den Export
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

  // Export als Excel
  const exportToExcel = () => {
    const formattedData = formatData();
    const enrichedData = formattedData.map(row => {
      if (isReportView) return row;
      const studentName = `${row['Nachname']}, ${row['Vorname']}`;
      if (!expandedStudents.has(studentName)) return row;
      const filterType = activeFilters.get(studentName);
      if (!filterType) return row;
      const details = getStudentDetails(studentName, filterType);
      if (details.length === 0) return row;
      const formattedDetailLines = details.map(entry => {
        const date = formatDate(entry.datum);
        const time = entry.beginnZeit ? `(${entry.beginnZeit}${entry.endZeit ? ` - ${entry.endZeit}` : ''} Uhr)` : '';
        const reason = entry.grund ? ` - ${entry.grund}` : '';
        const status = entry.status ? ` [${entry.status}]` : '';
        return `${date}${time}: ${entry.art}${reason}${status}`;
      });
      const header = getDetailHeader(filterType);
      return {
        ...row,
        'Details': `${header}\n${formattedDetailLines.join('\n')}`
      };
    });
    const worksheet = XLSX.utils.json_to_sheet(enrichedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Anwesenheitsstatistik");
    const hasDetails = enrichedData.some(row => row['Details']);
    const colWidths = isReportView ? 
      [10, 30, 30, 15, 60, 60] : 
      [...[25, 25, 15, 15, 15, 15, 15, 15, 15, 20, 20, 20, 20], ...(hasDetails ? [80] : [])];
    worksheet['!cols'] = colWidths.map(width => ({ width }));
    if (hasDetails) {
      worksheet['!rows'] = [];
      let rowIndex = 1;
      enrichedData.forEach(row => {
        worksheet['!rows'][rowIndex] = { hpt: 20 };
        if (row['Details']) {
          const lines = (row['Details'] as string).split('\n').length;
          const detailsRowHeight = Math.max(60, lines * 15);
          worksheet['!rows'][rowIndex + 1] = { hpt: detailsRowHeight };
          rowIndex += 2;
        } else {
          rowIndex += 1;
        }
      });
    }
    const filename = `Anwesenheitsstatistik_${startDate}_${endDate}.xlsx`;
    XLSX.writeFile(workbook, filename);
  };

  // Export als CSV
  const exportToCSV = () => {
    const formattedData = formatData();
    const enrichedData = formattedData.map(row => {
      if (isReportView) return row;
      const studentName = `${row['Nachname']}, ${row['Vorname']}`;
      if (!expandedStudents.has(studentName)) return row;
      const filterType = activeFilters.get(studentName);
      if (!filterType) return row;
      const details = getStudentDetails(studentName, filterType);
      if (details.length === 0) return row;
      const formattedDetailLines = details.map(entry => {
        const date = formatDate(entry.datum);
        const time = entry.beginnZeit ? `(${entry.beginnZeit}${entry.endZeit ? ` - ${entry.endZeit}` : ''} Uhr)` : '';
        const reason = entry.grund ? ` - ${entry.grund}` : '';
        const status = entry.status ? ` [${entry.status}]` : '';
        return `${date}${time}: ${entry.art}${reason}${status}`;
      });
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

  // Export als PDF – erweiterter Export, sodass der Tabellenheader immer vollständig auf einer Seite bleibt
  const exportToPDF = () => {
    const formattedData = formatData();
    const doc = new jsPDF({
      orientation: isReportView ? 'portrait' : 'landscape',
      unit: 'mm',
      format: 'a4'
    });
    const margin = { left: 15, right: 15, top: 20, bottom: 20 };
    const maxPageWidth = doc.internal.pageSize.width - margin.left - margin.right;

    // Header-Bereich
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
      doc.setFont('helvetica', 'italic');
      doc.text('Legende: (E) = Entschuldigt, (U) = Unentschuldigt, (O) = Offen, SJ = Schuljahr, (V) = Verspätungen, (F) = Fehlzeiten', 
               margin.left, margin.top + 22);
      // Status-Farben-Legende
      doc.setFontSize(8);
      doc.setFillColor(0, 150, 0);
      doc.rect(margin.left, margin.top + 26, 3, 3, 'F');
      doc.setTextColor(0, 150, 0);
      doc.text('Entschuldigt', margin.left + 5, margin.top + 28);
      doc.setFillColor(200, 0, 0);
      doc.rect(margin.left + 30, margin.top + 26, 3, 3, 'F');
      doc.setTextColor(200, 0, 0);
      doc.text('Unentschuldigt', margin.left + 35, margin.top + 28);
      doc.setFillColor(204, 163, 0);
      doc.rect(margin.left + 70, margin.top + 26, 3, 3, 'F');
      doc.setTextColor(204, 163, 0);
      doc.text('Noch zu entschuldigen (Frist läuft)', margin.left + 75, margin.top + 28);
      doc.setTextColor(0, 0, 0);
    }
    // Tabellenheader – dieser Bereich soll stets auf derselben Seite bleiben
    const headerHeight = isReportView ? 25 : 35;
    const columnHeaders = isReportView ? {
      'Nr.': 'Nr.',
      'Nachname': 'Nachname',
      'Vorname': 'Vorname',
      'Klasse': 'Klasse',
      'Unentschuldigte Verspätungen': 'Unentsch. Verspätungen',
      'Unentschuldigte Fehlzeiten': 'Unentsch. Fehlzeiten'
    } : {
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

    // Spaltenbreiten berechnen
    const calculateColumnWidths = () => {
      const baseWidths = isReportView ? 
        [8, 25, 25, 12, 55, 55] : 
        [20, 20, 12, 12, 12, 12, 12, 12, 12, 15, 15, 20, 20];
      if (isReportView) return baseWidths;
      let totalFixedWidth = baseWidths.reduce((sum, w) => sum + w, 0);
      const availableWidth = maxPageWidth - totalFixedWidth;
      const adjustedWidths = [...baseWidths];
      adjustedWidths[11] = availableWidth / 2;
      adjustedWidths[12] = availableWidth / 2;
      return adjustedWidths;
    };
    const calculatedWidths = calculateColumnWidths();
    const baseColumnStyles: { [key: string]: any } = {};
    Object.keys(columnHeaders).forEach((key, index) => {
      if (calculatedWidths[index]) {
        baseColumnStyles[key] = { 
          cellWidth: calculatedWidths[index],
          halign: ['Nachname', 'Vorname', 'Klasse'].includes(key) ? 'left' : 'center'
        };
      }
    });

    // Aufbau der kompletten Tabellenstruktur (Hauptzeilen plus Detailzeilen)
    const tableRows: any[] = [];
    const columnKeys = Object.keys(columnHeaders);
    const numberOfColumns = columnKeys.length;
    formattedData.forEach(row => {
      const mainRow = columnKeys.map(key => row[key] ?? '');
      tableRows.push(mainRow);
      const studentName = isReportView 
        ? `${row['Nachname']}, ${row['Vorname']}` 
        : `${row['Nachname']}, ${row['Vorname']}`;
      const filterType = activeFilters.get(studentName);
      if (!isReportView && expandedStudents.has(studentName) && filterType) {
        const details = getStudentDetails(studentName, filterType);
        if (details.length > 0) {
          if (filterType === 'details') {
            const verspätungen = details.filter(entry => entry.art === 'Verspätung');
            const fehlzeiten = details.filter(entry => entry.art !== 'Verspätung');
            if (verspätungen.length > 0) {
              tableRows.push([{
                content: 'Unentschuldigte Verspätungen',
                colSpan: numberOfColumns,
                styles: { fillColor: getFilterTypeColor(filterType), fontStyle: 'bold', fontSize: 8, halign: 'left' }
              }]);
              formatDetailEntriesForPDF(verspätungen).forEach(de => {
                tableRows.push([{
                  content: de.content,
                  colSpan: numberOfColumns,
                  styles: { textColor: de.styles.textColor, fontSize: de.styles.fontSize, fontStyle: de.styles.fontStyle, cellPadding: 3 }
                }]);
              });
            }
            if (fehlzeiten.length > 0) {
              tableRows.push([{
                content: 'Unentschuldigte Fehlzeiten',
                colSpan: numberOfColumns,
                styles: { fillColor: getFilterTypeColor(filterType), fontStyle: 'bold', fontSize: 8, halign: 'left' }
              }]);
              formatDetailEntriesForPDF(fehlzeiten).forEach(de => {
                tableRows.push([{
                  content: de.content,
                  colSpan: numberOfColumns,
                  styles: { textColor: de.styles.textColor, fontSize: de.styles.fontSize, fontStyle: de.styles.fontStyle, cellPadding: 3 }
                }]);
              });
            }
          } else {
            const headerTitle = getDetailHeader(filterType);
            tableRows.push([{
              content: headerTitle,
              colSpan: numberOfColumns,
              styles: { fillColor: getFilterTypeColor(filterType), fontStyle: 'bold', fontSize: 8, halign: 'left' }
            }]);
            formatDetailEntriesForPDF(details).forEach(de => {
              tableRows.push([{
                content: de.content,
                colSpan: numberOfColumns,
                styles: { textColor: de.styles.textColor, fontSize: de.styles.fontSize, fontStyle: de.styles.fontStyle, cellPadding: 3 }
              }]);
            });
          }
        }
      }
    });

    // AutoTable-Aufruf: Rendert den kompletten Tabelleninhalt ab dem fest definierten StartY
    autoTable(doc, {
      head: [Object.values(columnHeaders)],
      body: tableRows,
      startY: margin.top + headerHeight,
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
      didParseCell: (data) => {
        if (data.cell.colSpan && data.cell.colSpan > 1) {
          // Detailzeilen kursiv darstellen
          data.cell.styles.fontStyle = 'italic';
        }
      }
    });
    doc.save(`Anwesenheitsstatistik_${startDate}_${endDate}.pdf`);
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={exportToExcel}>
        Als Excel exportieren
      </Button>
      <Button variant="outline" size="sm" onClick={exportToCSV}>
        Als CSV exportieren
      </Button>
      <Button variant="outline" size="sm" onClick={exportToPDF}>
        Als PDF exportieren
      </Button>
    </div>
  );
};

export default ExportButtons;
