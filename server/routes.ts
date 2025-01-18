import type { Express } from "express";
import { createServer, type Server } from "http";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Papa from 'papaparse';
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

export function registerRoutes(app: Express): Server {
  // API Routes
  app.get('/api/attendance/data', async (req, res) => {
    try {
      const csvFilePath = path.resolve(__dirname, '../attached_assets/AbsenceList_20250113_1737.csv');
      const fileContent = await fs.promises.readFile(csvFilePath, 'utf-8');

      Papa.parse<CSVRow>(fileContent, {
        header: true,
        delimiter: '\t', // Explizit Tabulator als Trennzeichen setzen
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

  // Create HTTP server
  const httpServer = createServer(app);
  return httpServer;
}
