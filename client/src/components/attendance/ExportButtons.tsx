import React from 'react';
import { Button } from "@/components/ui/button";
import * as XLSX from 'xlsx';
import { unparse } from 'papaparse';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { StudentStats } from '@/lib/attendance-utils';

const parseDate = (dateStr: string | Date): Date => {
  if (dateStr instanceof Date) return dateStr;
  const [day, month, year] = dateStr.split('.');
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
};

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
  expandedStudents: Set<string>;
  activeFilters: Map<string, string>;
}

const ExportButtons: React.FC<ExportButtonsProps> = ({ 
  data, 
  startDate, 
  endDate, 
  schoolYearStats,
  weeklyStats,
  selectedWeeks,
  isReportView = false,
  detailedData = {},
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

  const formatDetails = (student: string, filterType: string | undefined): string => {
    if (!expandedStudents.has(student) || !filterType) return '';

    const studentData = detailedData[student];
    if (!studentData) return '';

    let details: any[] = [];
    switch(filterType) {
      case 'verspaetungen_entsch':
      case 'verspaetungen_unentsch':
      case 'verspaetungen_offen':
      case 'fehlzeiten_entsch':
      case 'fehlzeiten_unentsch':
      case 'fehlzeiten_offen':
        details = studentData[filterType] || [];
        break;
      case 'details':
        details = [
          ...(studentData.verspaetungen_unentsch || []),
          ...(studentData.fehlzeiten_unentsch || [])
        ];
        break;
      case 'sj_verspaetungen':
        details = studentData.verspaetungen_unentsch || [];
        break;
      case 'sj_fehlzeiten':
        details = studentData.fehlzeiten_unentsch || [];
        break;
      case 'weekly_verspaetungen':
      case 'sum_verspaetungen':
      case 'weekly_fehlzeiten':
      case 'sum_fehlzeiten':
        const weeks = Array(parseInt(selectedWeeks)).fill(0).map((_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (i * 7));
          return date;
        });
        details = (filterType.includes('verspaetungen') ? 
          studentData.verspaetungen_unentsch : 
          studentData.fehlzeiten_unentsch) || [];
        details = details.filter(entry => {
          const entryDate = parseDate(entry.datum);
          return weeks.some(week => {
            const weekStart = new Date(week);
            weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            return entryDate >= weekStart && entryDate <= weekEnd;
          });
        });
        break;
    }

    return details
      .sort((a, b) => parseDate(b.datum).getTime() - parseDate(a.datum).getTime())
      .map(entry => {
        const date = formatDate(entry.datum);
        const type = entry.art || '';
        const time = entry.beginnZeit ? 
          ` (${entry.beginnZeit}${entry.endZeit ? ` - ${entry.endZeit}` : ''} Uhr)` : '';
        const reason = entry.grund ? ` - ${entry.grund}` : '';
        return `${date}${time}${type ? `: ${type}` : ''}${reason}`;
      })
      .join('\n');
  };

  const formatData = () => {
    if (isReportView) {
      return data.map(([student, stats], index) => {
        const details = formatDetails(student, activeFilters.get(student));
        const [nachname = "", vorname = ""] = student.split(",").map(s => s.trim());
        
        const baseData = {
          'Nr.': index + 1,
          'Nachname': nachname,
          'Vorname': vorname,
          'Klasse': stats.klasse,
        };

        return details ? 
          { ...baseData, 'Details': details } : 
          baseData;
      });
    } else {
      return data.map(([student, stats]) => {
        const details = formatDetails(student, activeFilters.get(student));
        const weeklyData = weeklyStats[student] || {
          verspaetungen: { total: 0, weekly: Array(parseInt(selectedWeeks)).fill(0) },
          fehlzeiten: { total: 0, weekly: Array(parseInt(selectedWeeks)).fill(0) }
        };

        const [nachname = "", vorname = ""] = student.split(",").map(s => s.trim());
        
        const baseData = {
          'Nachname': nachname,
          'Vorname': vorname,
          'Klasse': stats.klasse,
          'Verspätungen (E)': stats.verspaetungen_entsch,
          'Verspätungen (U)': stats.verspaetungen_unentsch,
          'Verspätungen (O)': stats.verspaetungen_offen,
          'Fehlzeiten (E)': stats.fehlzeiten_entsch,
          'Fehlzeiten (U)': stats.fehlzeiten_unentsch,
          'Fehlzeiten (O)': stats.fehlzeiten_offen,
          '∑SJ V': schoolYearStats[student]?.verspaetungen_unentsch || 0,
          '∑SJ F': schoolYearStats[student]?.fehlzeiten_unentsch || 0,
          'Øx() V': `${(weeklyData.verspaetungen.total / parseInt(selectedWeeks)).toFixed(2)}`,
          'Øx() F': `${(weeklyData.fehlzeiten.total / parseInt(selectedWeeks)).toFixed(2)}`,
          '∑x() V': weeklyData.verspaetungen.total,
          '∑x() F': weeklyData.fehlzeiten.total
        };

        return details ? 
          { ...baseData, 'Details': details } : 
          baseData;
      });
    }
  };

  const exportToExcel = () => {
    const formattedData = formatData();
    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Anwesenheitsstatistik");

    const colWidths = Array(Object.keys(formattedData[0]).length).fill({ width: 15 });
    worksheet['!cols'] = colWidths;

    XLSX.writeFile(workbook, `Anwesenheitsstatistik_${startDate}_${endDate}.xlsx`);
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
      left: 10,
      right: 10,
      top: 20,
      bottom: 20
    };

    doc.setFontSize(16);
    doc.text('Anwesenheitsstatistik', margin.left, margin.top);
    doc.setFontSize(12);
    doc.text(`Zeitraum: ${startDate} - ${endDate}`, margin.left, margin.top + 10);

    const hasDetails = formattedData.some(row => 'Details' in row);
    const columnStyles = {};
    
    Object.keys(formattedData[0]).forEach((key, index) => {
      if (key === 'Details') {
        columnStyles[index] = { cellWidth: 80 };
      } else {
        columnStyles[index] = { cellWidth: 20 };
      }
    });

    autoTable(doc, {
      head: [Object.keys(formattedData[0])],
      body: formattedData.map(Object.values),
      startY: margin.top + 20,
      margin: margin,
      styles: {
        fontSize: 8,
        cellPadding: 1.5,
        overflow: 'linebreak',
        cellWidth: 'wrap'
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
};

export default ExportButtons;
