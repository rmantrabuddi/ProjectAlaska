// utils/csvParser.ts
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

// Keep this name so existing imports don't break
export type CSVRow = Record<string, any>;

// Reads CSV or Excel and always returns an array of objects keyed by column header.
export async function parseFile(file: File): Promise<CSVRow[]> {
  const ext = file.name.split('.').pop()?.toLowerCase();

  if (ext === 'csv') {
    return parseCSV(file);
  }

  if (ext === 'xlsx' || ext === 'xls') {
    return parseExcel(file);
  }

  // Fallback: try MIME type when extension isn't reliable
  const mime = file.type?.toLowerCase() || '';
  if (mime.includes('csv')) return parseCSV(file);
  if (mime.includes('spreadsheet') || mime.includes('excel')) return parseExcel(file);

  throw new Error('Unsupported file type. Please upload a CSV or Excel file.');
}

async function parseCSV(file: File): Promise<CSVRow[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<CSVRow>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: h => (h || '').trim(),
      complete: (results) => {
        if (results.errors?.length) {
          // Surface the first few parse errors for clarity
          const msg = results.errors.slice(0, 3).map(e => `${e.type}: ${e.message}`).join('; ');
          reject(new Error(`CSV parse error: ${msg}`));
          return;
        }
        resolve((results.data || []).map(row => normalizeRow(row)));
      },
      error: (err) => reject(err),
    });
  });
}

async function parseExcel(file: File): Promise<CSVRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });

  // Default to the first worksheet
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];

  const sheet = workbook.Sheets[firstSheetName];

  // Convert to JSON with headers; defval keeps empty cells as empty strings (not undefined)
  const rows = XLSX.utils.sheet_to_json<CSVRow>(sheet, { defval: '' });

  return rows.map(row => normalizeRow(row));
}

/** Trim header names and coerce values to strings where helpful, preserving numbers as-is. */
function normalizeRow(row: CSVRow): CSVRow {
  const out: CSVRow = {};
  for (const key in row) {
    const cleanKey = (key || '').toString().trim();
    // Preserve numbers/booleans, trim strings
    const val = row[key];
    out[cleanKey] = typeof val === 'string' ? val.trim() : val;
  }
  return out;
}

// Keep your existing mappers/validators exactly as-is
export function mapCSVToInventoryRecord(row: CSVRow) {
  // your existing implementation…
  return {
    // example mapping (leave yours intact)
    record_id: row['ID'] || row['Record ID'] || '',
    department: row['Department'] || '',
    division: row['Division'] || '',
    license_permit_title: row['License Permit Title'] || row['License/Permit Title'] || '',
    type: row['Type'] || '',
    approving_entities: row['Approving Entities'] || '',
    access_mode: row['Access Mode'] || '',
    key_word: row['Key Word'] || '',
    description: row['Description'] || '',
    regulations: row['Regulations'] || '',
    regulation_description: row['Regulation Description'] || '',
    user_type: row['User Type'] || '',
    cost: row['Cost'] || '',
    renewal_frequency: row['Renewal Frequency'] || '',
    source: row['Source'] || '',
    revenue_2022: row['2022 Revenue'] || '',
    revenue_2023: row['2023 Revenue'] || '',
    revenue_2024: row['2024 Revenue'] || '',
    volume_2022: row['2022 Volume'] || '',
    volume_2023: row['2023 Volume'] || '',
    volume_2024: row['2024 Volume'] || '',
    processing_time_2022: row['2022 Processing Time'] || '',
    processing_time_2023: row['2023 Processing Time'] || '',
    processing_time_2024: row['2024 Processing Time'] || '',
    digitized: row['Digitized'] || '',
    workflow_automated_percent: row['% workflow automated'] || '',
    notes: row['Notes'] || '',
    status: row['Status'] || 'Active',
    created_at: row['Created At'] || '',
    updated_at: row['Updated At'] || '',
  };
}

export function validateInventoryRecord(record: any): string[] {
  // your existing implementation…
  const errors: string[] = [];
  if (!record.department && !record.license_permit_title) {
    errors.push('Missing Department and License Permit Title');
  }
  return errors;
}