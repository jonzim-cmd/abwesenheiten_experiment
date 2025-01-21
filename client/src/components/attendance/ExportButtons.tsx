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
  expandedStudents: Set<string>;
  activeFilters: Map<string, string>;
  normalViewDetailedData: Record<string, any>;
  schoolYearDetailedData: Record<string, any>;
  weeklyDetailedData: Record<string, any>;
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
  expandedStudents,
  activeFilters,
  normalViewDetailedData,
  schoolYearDetailedData,
  weeklyDetailedData
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

  const getFilteredDetailsForStudent = (student: string) => {
    const filterType = activeFilters.get(student);
    const studentData = normalViewDetailedData[student];
    const schoolYearData = schoolYearDetailedData[student];
    const weeklyData = weeklyDetailedData[student];

    if (!studentData || !filterType) return [];

    switch (filterType) {
      case 'details':
        return [
          ...studentData.verspaetungen_unentsch,
          ...studentData.fehlzeiten_unentsch,
          ...studentData.verspaetungen_offen,
          ...studentData.fehlzeiten_offen
        ];
      case 'sj_verspaetungen':
        return schoolYearData?.verspaetungen_unentsch || [];
      case 'sj_fehlzeiten':
        return schoolYearData?.fehlzeiten_unentsch || [];
      case 'weekly_verspaetungen':
      case 'sum_verspaetungen':
        return weeklyData?.verspaetungen_unentsch || [];
      case 'weekly_fehlzeiten':
      case 'sum_fehlzeiten':
        return weeklyData?.fehlzeiten_unentsch || [];
      default:
        return studentData[filterType as keyof typeof studentData] || [];
    }
  };

  const formatData = () => {
    if (isReportView) {
      return data.map(([student, stats], index) => {
        const studentData = detailedData[student];
        const lateEntries = studentData?.verspaetungen_unentsch || [];
        const absenceEntries = studentData?.fehlzeiten_unentsch || [];

        const formattedLates = lateEntries.map((entry: any) => 
          `${formatDate(entry.datum)} (${entry.beginnZeit} - ${entry.endZeit} Uhr)`
        ).join('\n');

        const formattedAbsences = absenceEntries.map((entry: any) => 
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

  const exportToExcel = () => { /* Unchanged */ };
  const exportToCSV = () => { /* Unchanged */ };

  const exportToPDF = () => {
    const formattedData = formatData();
    const doc = new jsPDF({
      orientation: isReportView ? 'portrait' : 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const margin = { left: 15, right: 15, top: 20, bottom: 20 };
    const pageWidth = doc.internal.pageSize.width;

    doc.setFontSize(16);
    doc.text('Anwesenheitsstatistik', margin.left, margin.top);
    doc.setFontSize(12);
    doc.text(`Zeitraum: ${new Date(startDate).toLocaleDateString('de-DE')} - ${new Date(endDate).toLocaleDateString('de-DE')}`, margin.left, margin.top + 10);

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
      columnStyles: isReportView ? { /* Unchanged */ } : { /* Unchanged */ },
    });

    // Add detailed pages for expanded students
    if (!isReportView) {
      data.forEach(([student]) => {
        if (expandedStudents.has(student)) {
          const details = getFilteredDetailsForStudent(student);
          const filterType = activeFilters.get(student) || 'Details';

          doc.addPage();
          doc.setFontSize(14);
          doc.text(`Details für ${student} (${filterType})`, margin.left, margin.top);

          autoTable(doc, {
            head: [['Datum', 'Art', 'Beginn', 'Ende', 'Grund', 'Status']],
            body: details.map((entry: any) => [
              formatDate(entry.datum),
              entry.art,
              entry.beginnZeit || '-',
              entry.endZeit || '-',
              entry.grund || '-',
              entry.status || 'offen'
            ]),
            startY: margin.top + 10,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [100, 100, 100] }
          });
        }
      });
    }

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
