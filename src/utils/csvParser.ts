import { InventoryMasterRecord } from '../services/supabase';

export interface CSVRow {
  [key: string]: string;
}

export function parseCSV(csvText: string): CSVRow[] {
  const lines = csvText.split('\n');
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  
  const rows: CSVRow[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = parseCSVLine(line);
    if (values.length === 0) continue;
    
    const row: CSVRow = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    
    rows.push(row);
  }
  
  return rows;
}

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  values.push(current.trim());
  return values;
}

export function mapCSVToInventoryRecord(csvRow: CSVRow): Omit<InventoryMasterRecord, 'id' | 'created_at' | 'updated_at'> {
  return {
    record_id: csvRow['ID'] || '',
    department: csvRow['Department'] || '',
    division: csvRow['Division'] || '',
    license_permit_title: csvRow['License Permit Title'] || '',
    type: csvRow['Type'] || '',
    approving_entities: csvRow['Approving Entities'] || '',
    access_mode: csvRow['Access Mode'] || '',
    key_word: csvRow['Key Word'] || '',
    description: csvRow['Description'] || '',
    regulations: csvRow['Regulations'] || '',
    regulation_description: csvRow['Regulation Description'] || '',
    user_type: csvRow['User Type'] || '',
    cost: csvRow['Cost'] || '',
    renewal_frequency: csvRow['Renewal Frequency'] || '',
    source: csvRow['Source'] || '',
    revenue_2022: csvRow['2022 Revenue'] || '',
    revenue_2023: csvRow['2023 Revenue'] || '',
    revenue_2024: csvRow['2024 Revenue'] || '',
    volume_2022: csvRow['2022 Volume'] || '',
    volume_2023: csvRow['2023 Volume'] || '',
    volume_2024: csvRow['2024 Volume'] || '',
    processing_time_2022: csvRow['2022 Processing Time'] || '',
    processing_time_2023: csvRow['2023 Processing Time'] || '',
    processing_time_2024: csvRow['2024 Processing Time'] || '',
    digitized: csvRow['Digitized'] || '',
    workflow_automated_percent: csvRow['% workflow automated'] || '',
    notes: csvRow['Notes'] || '',
    status: (csvRow['Status'] as 'Active' | 'Inactive' | 'Under Review') || 'Active'
  };
}

export function validateInventoryRecord(record: Omit<InventoryMasterRecord, 'id' | 'created_at' | 'updated_at'>): string[] {
  const errors: string[] = [];
  
  if (!record.department.trim()) {
    errors.push('Department is required');
  }
  
  if (!record.division.trim()) {
    errors.push('Division is required');
  }
  
  if (!record.license_permit_title.trim()) {
    errors.push('License/Permit Title is required');
  }
  
  if (record.status && !['Active', 'Inactive', 'Under Review'].includes(record.status)) {
    errors.push('Status must be Active, Inactive, or Under Review');
  }
  
  return errors;
}