import type { Express } from "express";
import { createServer, type Server } from "http";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Papa from 'papaparse';
import axios from 'axios';
const { dirname } = path;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface CSVRow {
  Langname: string;
  Vorname: string;
  ID: string;
  Klasse: string;
  Beginndatum: string;
  Beginnzeit: string;
  Enddatum: string;
  Endzeit: string;
  Unterbrechungen: string;
  Abwesenheitsgrund: string;
  'Text/Grund': string;
  Entschuldigungsnummer: string;
  Status: string;
  Entschuldigungstext: string;
  'gemeldet von Schüler*in': string;
}

interface WebUntisConfig {
  baseUrl: string;
  auth: string;
}

interface WebUntisAbsence {
  studentId: number;
  studentExternKey: string;
  absenceTimes: Array<{
    start: string;
    end: string;
    minutes: number;
    subjectName: string;
    status: string;
    type: 'DELAY' | 'ABSENCE';
  }>;
}

function mapWebUntisStatus(apiStatus: string): string {
  const statusMap: Record<string, string> = {
    'EXCUSED': 'entsch.',
    'UNEXCUSED': 'nicht entsch.',
    'PENDING': '',
  };
  return statusMap[apiStatus] || '';
}

function transformWebUntisToCSVFormat(apiData: any) {
  const transformedData = [];
  
  for (const student of apiData.students) {
    for (const absence of student.absenceTimes) {
      const startDate = new Date(absence.start);
      const endDate = new Date(absence.end);
      
      transformedData.push({
        Langname: student.studentExternKey,
        Vorname: '',
        ID: student.studentId.toString(),
        Klasse: '',
        Beginndatum: startDate.toLocaleDateString('de-DE'),
        Beginnzeit: startDate.toLocaleTimeString('de-DE'),
        Enddatum: endDate.toLocaleDateString('de-DE'),
        Endzeit: endDate.toLocaleTimeString('de-DE'),
        Unterbrechungen: '',
        Abwesenheitsgrund: absence.type === 'DELAY' ? 'Verspätung' : 'Fehltag',
        'Text/Grund': '',
        Entschuldigungsnummer: '',
        Status: mapWebUntisStatus(absence.status),
        Entschuldigungstext: absence.subjectName || '',
        'gemeldet von Schüler*in': ''
      });
    }
  }
  
  return transformedData;
}

export function registerRoutes(app: Express): Server {
  // Bestehende CSV Route
  app.get('/api/attendance/data', async (req, res) => {
    try {
      const csvFilePath = path.resolve(__dirname, '../attached_assets/AbsenceList_20250113_1737.csv');
      const fileContent = await fs.promises.readFile(csvFilePath, 'utf-8');

      Papa.parse<CSVRow>(fileContent, {
        header: true,
        delimiter: '\t',
        skipEmptyLines: true,
        complete: (results) => {
          res.json(results.data);
        },
        error: (error) => {
          console.error('CSV parsing error:', error);
          res.status(500).json({ error: 'Failed to parse CSV data' });
        }
      });
    } catch (error) {
      console.error('File reading error:', error);
      res.status(500).json({ error: 'Failed to read attendance data' });
    }
  });

  // Neue WebUntis API Route
  app.get('/api/attendance/webuntis', async (req, res) => {
    try {
      const { start, end, className } = req.query;
      
      const config: WebUntisConfig = {
        baseUrl: process.env.VITE_WEBUNTIS_EAP_URL || '',
        auth: process.env.VITE_WEBUNTIS_AUTH_TOKEN || ''
      };

      if (!config.baseUrl || !config.auth) {
        throw new Error('WebUntis API configuration missing');
      }

      console.log('Requesting WebUntis API:', `${config.baseUrl}/WebUntis/api/rest/extern/v1/classreg/students/absencetimes`);
      const response = await axios.get(`${config.baseUrl}/WebUntis/api/rest/extern/v1/classreg/students/absencetimes`, {
        headers: {
          'Authorization': `Basic ${config.auth}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        params: {
          start,
          end,
          className,
          countingOnly: false
        }
      });

      if (!response.data || !response.data.students) {
        console.error('Unexpected API response:', response.data);
        throw new Error('Unexpected API response format');
      }

      const transformedData = transformWebUntisToCSVFormat(response.data);
      res.json(transformedData);

    } catch (error: any) {
      console.error('WebUntis API error:', error);
      res.status(500).json({ 
        error: 'Failed to fetch attendance data from WebUntis',
        details: error.message,
        url: error.config?.url,
        response: error.response?.data
      });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);
  return httpServer;
}
