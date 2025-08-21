import { InventoryMasterRecord } from '../services/supabase';
import * as XLSX from 'xlsx';

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

export function parseExcel(file: File): Promise<CSVRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get the first worksheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON with header row as keys
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1,
          defval: ''
        }) as string[][];
        
        if (jsonData.length === 0) {
          reject(new Error('Excel file is empty'));
          return;
        }
        
        // First row contains headers
        const headers = jsonData[0].map(h => h?.toString().trim() || '');
        const rows: CSVRow[] = [];
        
        // Process data rows
        for (let i = 1; i < jsonData.length; i++) {
          const rowData = jsonData[i];
          if (!rowData || rowData.length === 0) continue;
          
          const row: CSVRow = {};
          headers.forEach((header, index) => {
            row[header] = (rowData[index]?.toString() || '').trim();
          });
          
          // Skip empty rows
          if (Object.values(row).some(value => value)) {
            rows.push(row);
          }
        }
        
        resolve(rows);
      } catch (error) {
        reject(new Error(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read Excel file'));
    };
    
    reader.readAsArrayBuffer(file);
  });
}

export async function parseFile(file: File): Promise<CSVRow[]> {
  const fileName = file.name.toLowerCase();
  
  if (fileName.endsWith('.csv')) {
    const text = await file.text();
    return parseCSV(text);
  } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
    return parseExcel(file);
  } else {
    throw new Error('Unsupported file format. Please upload a CSV or Excel file.');
  }
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
    status: (csvRow['Status'] as 'Active' | 'Inactive' | 'Under Review') || 'Active',
    // Parse additional fields for analytics
    applications_processed_2022: parseInt(csvRow['2022 Volume'] || '0') || undefined,
    applications_processed_2023: parseInt(csvRow['2023 Volume'] || '0') || undefined,
    applications_processed_2024: parseInt(csvRow['2024 Volume'] || '0') || undefined,
    access_channel: mapAccessChannel(csvRow['Access Mode'] || ''),
    processing_days_min: parseProcessingDays(csvRow['2024 Processing Time'] || '').min,
    processing_days_max: parseProcessingDays(csvRow['2024 Processing Time'] || '').max,
    processing_days_median: parseProcessingDays(csvRow['2024 Processing Time'] || '').median,
    license_type_category: categorizeType(csvRow['Type'] || '')
  };
}

function mapAccessChannel(accessMode: string): 'Online' | 'Manual' | 'Both' | 'Unknown' {
  const lower = accessMode.toLowerCase();
  if (lower.includes('online') && lower.includes('manual')) return 'Both';
  if (lower.includes('online')) return 'Online';
  if (lower.includes('manual')) return 'Manual';
  return 'Unknown';
}

function parseProcessingDays(processingTime: string): { min?: number; max?: number; median?: number } {
  const result: { min?: number; max?: number; median?: number } = {};
  
  // Extract numbers from processing time text
  const numbers = processingTime.match(/\d+/g);
  if (!numbers) return result;
  
  if (processingTime.toLowerCase().includes('immediate') || processingTime.toLowerCase().includes('same day')) {
    result.min = 0;
    result.max = 0;
    result.median = 0;
  } else if (numbers.length === 1) {
    const days = parseInt(numbers[0]);
    result.min = days;
    result.max = days;
    result.median = days;
  } else if (numbers.length >= 2) {
    result.min = parseInt(numbers[0]);
    result.max = parseInt(numbers[1]);
    result.median = Math.round((result.min + result.max) / 2);
  }
  
  return result;
}

function categorizeType(type: string): 'License' | 'Permit' | 'Stamp' | 'Registration' | 'Certificate' | 'Approval' | 'Other' {
  const lowerType = type.toLowerCase();
  if (lowerType.includes('license')) return 'License';
  if (lowerType.includes('permit')) return 'Permit';
  if (lowerType.includes('stamp')) return 'Stamp';
  if (lowerType.includes('registration')) return 'Registration';
  if (lowerType.includes('certificate')) return 'Certificate';
  if (lowerType.includes('approval')) return 'Approval';
  return 'Other';
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