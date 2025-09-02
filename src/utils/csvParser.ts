import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { InventoryMasterRecord } from '../services/supabase';

export type CSVRow = Record<string, any>;

export async function parseFile(file: File): Promise<CSVRow[]> {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  const mime = (file.type || '').toLowerCase();

  // Fast-path: obvious Excel MIME types
  if (
    mime.includes('spreadsheet') ||
    mime.includes('excel') ||
    mime.includes('officedocument.spreadsheetml.sheet') ||
    ext === 'xlsx' ||
    ext === 'xls'
  ) {
    return parseExcel(file);
  }

  // If MIME/ext are inconclusive, sniff the file header
  const header = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  if (looksLikeXLSX(header)) return parseExcel(file);
  if (looksLikeXLS(header)) return parseExcel(file);

  // Default to CSV only if we didn't detect Excel
  return parseCSV(file);
}

/** ----- CSV parsing ----- */
async function parseCSV(file: File): Promise<CSVRow[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<CSVRow>(file, {
      header: true,
      skipEmptyLines: true,
      worker: true,
      transformHeader: h => (h || '').trim(),
      complete: (results) => {
        if (results.errors?.length) {
          const msg = results.errors
            .slice(0, 3)
            .map(e => `${e.type}: ${e.message}`)
            .join('; ');
          reject(new Error(`Parse error: ${msg}`));
          return;
        }
        resolve((results.data || []).map(row => normalizeRow(row)));
      },
      error: (err) => reject(err),
    });
  });
}

/** ----- Excel parsing (XLSX/XLS) ----- */
async function parseExcel(file: File): Promise<CSVRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });

  // Use the first visible sheet
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];

  const sheet = workbook.Sheets[firstSheetName];

  // Convert to JSON using first row as headers; defval keeps empty cells as ''
  const rows = XLSX.utils.sheet_to_json<CSVRow>(sheet, {
    defval: '',
    raw: false,           // formats numbers/dates nicely; set true if you want raw values
    blankrows: false,
  });

  return rows.map(row => normalizeRow(row));
}

/** ----- Helpers ----- */
function normalizeRow(row: CSVRow): CSVRow {
  const out: CSVRow = {};
  for (const key in row) {
    const cleanKey = (key || '').toString().trim();
    const val = row[key];
    out[cleanKey] = typeof val === 'string' ? val.trim() : val;
  }
  return out;
}

// ZIP magic for XLSX: 50 4B 03 04 ("PK\u0003\u0004")
function looksLikeXLSX(head: Uint8Array): boolean {
  return head.length >= 4 && head[0] === 0x50 && head[1] === 0x4B && head[2] === 0x03 && head[3] === 0x04;
}

// OLE Compound File magic for legacy XLS: D0 CF 11 E0 A1 B1 1A E1
function looksLikeXLS(head: Uint8Array): boolean {
  const sig = [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1];
  if (head.length < sig.length) return false;
  for (let i = 0; i < sig.length; i++) if (head[i] !== sig[i]) return false;
  return true;
}

/** ----- Mapping & validation (unchanged; kept tolerant to header variants) ----- */
export function mapCSVToInventoryRecord(
  row: CSVRow
): Omit<InventoryMasterRecord, 'id' | 'created_at' | 'updated_at'> {
  return {
    record_id: row['ID'] || row['Record ID'] || row['id'] || '',
    department: row['Department'] || row['department'] || '',
    division: row['Division'] || row['division'] || '',
    license_permit_title:
      row['License Permit Title'] ||
      row['License/Permit Title'] ||
      row['license_permit_title'] ||
      '',
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
    revenue_2023: row['2023 Revenue'] || row['revenue_2023'] || '',
    revenue_2024: row['2024 Revenue'] || row['revenue_2024'] || '',
    revenue_2025: row['2025 Revenue'] || row['revenue_2025'] || '',
    volume_2023: row['2023 Volume'] || row['volume_2023'] || '',
    volume_2024: row['2024 Volume'] || row['volume_2024'] || '',
    volume_2025: row['2025 Volume'] || row['volume_2025'] || '',
    processing_time_2023: row['2023 Processing Time'] || row['processing_time_2023'] || '',
    processing_time_2024: row['2024 Processing Time'] || row['processing_time_2024'] || '',
    processing_time_2025: row['2025 Processing Time'] || row['processing_time_2025'] || '',
    digitized: row['Digitized'] || row['digitized'] || '',
    workflow_automated_percent:
      row['% workflow automated'] || row['workflow_automated_percent'] || '',
    notes: row['Notes'] || row['notes'] || '',
    status: (row['Status'] || row['status'] || 'Active') as 'Active' | 'Inactive' | 'Under Review',
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