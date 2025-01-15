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
}

const ExportButtons = ({ 
  data, 
  startDate, 
  endDate, 
  schoolYearStats,
  weeklyStats,
  selectedWeeks,
  isReportView = false
}: ExportButtonsProps) => {
  const formatData = () => {
    if (isReportView) {
      // Format data for report view
      return data.map(([student, stats], index) => {
        // Split student name into Nachname and Vorname
        const [nachname = "", vorname = ""] = student.split(",").map(s => s.trim());

        return {
          'Nr.': index + 1,
          'Nachname': nachname,
          'Vorname': vorname,
          'Klasse': stats.klasse,
          'Unentschuldigte Verspätungen': stats.verspaetungen_unentsch > 0 ? 
            `${stats.verspaetungen_unentsch} Verspätung(en)` : '-',
          'Unentschuldigte Fehlzeiten': stats.fehlzeiten_unentsch > 0 ? 
            `${stats.fehlzeiten_unentsch} Fehlzeit(en)` : '-'
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

    const filename = `Anwesenheitsstatistik_${startDate}_${endDate}.xlsx`;
    XLSX.writeFile(workbook, filename);
  };

  const exportToCSV = () => {
    const formattedData = formatData();
    const csv = unparse(formattedData);

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

    // Add title
    doc.setFontSize(16);
    doc.text('Anwesenheitsstatistik', 14, 15);
    doc.setFontSize(12);
    doc.text(`Zeitraum: ${new Date(startDate).toLocaleDateString('de-DE')} - ${new Date(endDate).toLocaleDateString('de-DE')}`, 14, 25);

    // Add table
    autoTable(doc, {
      head: [Object.keys(formattedData[0])],
      body: formattedData.map(Object.values),
      startY: 35,
      styles: {
        fontSize: 8,
        cellPadding: 1.5,
      },
      headStyles: {
        fillColor: [66, 66, 66],
      },
      columnStyles: isReportView ? {
        0: { cellWidth: 15 }, // Nr
        1: { cellWidth: 30 }, // Nachname
        2: { cellWidth: 30 }, // Vorname
        3: { cellWidth: 20 }, // Klasse
        4: { cellWidth: 40 }, // Unentschuldigte Verspätungen
        5: { cellWidth: 40 }, // Unentschuldigte Fehlzeiten
      } : {
        0: { cellWidth: 25 }, // Nachname
        1: { cellWidth: 25 }, // Vorname
        2: { cellWidth: 15 }, // Klasse
        3: { cellWidth: 18 }, // Verspätungen (E)
        4: { cellWidth: 18 }, // Verspätungen (U)
        5: { cellWidth: 18 }, // Verspätungen (O)
        6: { cellWidth: 18 }, // Fehlzeiten (E)
        7: { cellWidth: 18 }, // Fehlzeiten (U)
        8: { cellWidth: 18 }, // Fehlzeiten (O)
        9: { cellWidth: 15 }, // ∑SJ V
        10: { cellWidth: 15 }, // ∑SJ F
        11: { cellWidth: 20 }, // Øx() V
        12: { cellWidth: 20 }, // Øx() F
        13: { cellWidth: 20 }, // ∑x() V
        14: { cellWidth: 20 }, // ∑x() F
      },
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