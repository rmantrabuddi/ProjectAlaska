import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { InventoryMasterRecord } from '../services/supabase';

export type CSVRow = Record<string, any>;

export async function parseFile(file: File): Promise<CSVRow[]> {
  const ext = file.name.split('.').pop()?.toLowerCase();
  
  // Accept any file type - try Excel first, then CSV
  if (ext === 'xlsx' || ext === 'xls') {
    return parseExcel(file);
  } else {
    return parseCSV(file);
  }
}

async function parseCSV(file: File): Promise<CSVRow[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<CSVRow>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: h => (h || '').trim(),
      complete: (results) => {
        if (results.errors?.length) {
          const msg = results.errors.slice(0, 3).map(e => `${e.type}: ${e.message}`).join('; ');
          reject(new Error(`Parse error: ${msg}`));
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

  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];

  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<CSVRow>(sheet, { defval: '' });

  return rows.map(row => normalizeRow(row));
}

function normalizeRow(row: CSVRow): CSVRow {
  const out: CSVRow = {};
  for (const key in row) {
    const cleanKey = (key || '').toString().trim();
    const val = row[key];
    out[cleanKey] = typeof val === 'string' ? val.trim() : val;
  }
  return out;
}

export function mapCSVToInventoryRecord(row: CSVRow): Omit<InventoryMasterRecord, 'id' | 'created_at' | 'updated_at'> {
  return {
    record_id: row['ID'] || row['Record ID'] || row['id'] || '',
    department: row['Department'] || row['department'] || '',
    division: row['Division'] || row['division'] || '',
    license_permit_title: row['License Permit Title'] || row['License/Permit Title'] || row['license_permit_title'] || '',
    type: row['Type'] || row['type'] || '',
    approving_entities: row['Approving Entities'] || row['approving_entities'] || '',
    access_mode: row['Access Mode'] || row['access_mode'] || '',
    key_word: row['Key Word'] || row['key_word'] || '',
    description: row['Description'] || row['description'] || '',
    regulations: row['Regulations'] || row['regulations'] || '',
    regulation_description: row['Regulation Description'] || row['regulation_description'] || '',
    user_type: row['User Type'] || row['user_type'] || '',
    cost: row['Cost'] || row['cost'] || '',
    renewal_frequency: row['Renewal Frequency'] || row['renewal_frequency'] || '',
    source: row['Source'] || row['source'] || '',
    revenue_2022: row['2022 Revenue'] || row['revenue_2022'] || '',
    revenue_2023: row['2023 Revenue'] || row['revenue_2023'] || '',
    revenue_2024: row['2024 Revenue'] || row['revenue_2024'] || '',
    volume_2022: row['2022 Volume'] || row['volume_2022'] || '',
    volume_2023: row['2023 Volume'] || row['volume_2023'] || '',
    volume_2024: row['2024 Volume'] || row['volume_2024'] || '',
    processing_time_2022: row['2022 Processing Time'] || row['processing_time_2022'] || '',
    processing_time_2023: row['2023 Processing Time'] || row['processing_time_2023'] || '',
    processing_time_2024: row['2024 Processing Time'] || row['processing_time_2024'] || '',
    digitized: row['Digitized'] || row['digitized'] || '',
    workflow_automated_percent: row['% workflow automated'] || row['workflow_automated_percent'] || '',
    notes: row['Notes'] || row['notes'] || '',
    status: (row['Status'] || row['status'] || 'Active') as 'Active' | 'Inactive' | 'Under Review'
  };
}

export function validateInventoryRecord(record: any): string[] {
  const errors: string[] = [];
  
  if (!record.department && !record.license_permit_title) {
    errors.push('Missing both Department and License Permit Title');
  }
  
  if (record.status && !['Active', 'Inactive', 'Under Review'].includes(record.status)) {
    errors.push('Invalid status value');
  }
  
  return errors;
}