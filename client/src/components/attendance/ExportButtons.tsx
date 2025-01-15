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
}

const ExportButtons = ({ data, startDate, endDate }: ExportButtonsProps) => {
  const formatData = () => {
    return data.map(([student, stats]) => ({
      'Name (Klasse)': `${student} (${stats.klasse})`,
      'Verspätungen (E)': stats.verspaetungen_entsch,
      'Verspätungen (U)': stats.verspaetungen_unentsch,
      'Verspätungen (O)': stats.verspaetungen_offen,
      'Fehlzeiten (E)': stats.fehlzeiten_entsch,
      'Fehlzeiten (U)': stats.fehlzeiten_unentsch,
      'Fehlzeiten (O)': stats.fehlzeiten_offen,
    }));
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
    const doc = new jsPDF();

    // Add title
    doc.setFontSize(16);
    doc.text('Anwesenheitsstatistik', 14, 15);
    doc.setFontSize(12);
    doc.text(`Zeitraum: ${startDate} - ${endDate}`, 14, 25);

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
