import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface InventoryMasterRecord {
  id: string;
  record_id?: string;
  department: string;
  division: string;
  license_permit_title: string;
  type?: string;
  approving_entities?: string;
  access_mode?: string;
  key_word?: string;
  description?: string;
  regulations?: string;
  regulation_description?: string;
  user_type?: string;
  cost?: string;
  renewal_frequency?: string;
  source?: string;
  revenue_2022?: string;
  revenue_2023?: string;
  revenue_2024?: string;
  volume_2022?: string;
  volume_2023?: string;
  volume_2024?: string;
  processing_time_2022?: string;
  processing_time_2023?: string;
  processing_time_2024?: string;
  digitized?: string;
  workflow_automated_percent?: string;
  notes?: string;
  status: 'Active' | 'Inactive' | 'Under Review';
  applications_processed_2022?: number;
  applications_processed_2023?: number;
  applications_processed_2024?: number;
  access_channel?: 'Online' | 'Manual' | 'Both' | 'Unknown';
  processing_days_min?: number;
  processing_days_max?: number;
  processing_days_median?: number;
  license_type_category?: 'License' | 'Permit' | 'Stamp' | 'Registration' | 'Certificate' | 'Approval' | 'Other';
  created_at: string;
  updated_at: string;
}

// Inventory Master CRUD operations
export const inventoryService = {
  // Get all inventory records with optional filtering
  async getAll(filters?: {
    department?: string;
    division?: string;
    status?: string;
    search?: string;
  }) {
    let query = supabase
      .from('inventory_master')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.department) {
      query = query.eq('department', filters.department);
    }
    if (filters?.division) {
      query = query.eq('division', filters.division);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.search) {
      query = query.or(`license_permit_title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,department.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as InventoryMasterRecord[];
  },

  // Get single record by ID
  async getById(id: string) {
    const { data, error } = await supabase
      .from('inventory_master')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data as InventoryMasterRecord;
  },

  // Create new record
  async create(record: Omit<InventoryMasterRecord, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('inventory_master')
      .insert([record])
      .select()
      .single();
    
    if (error) throw error;
    return data as InventoryMasterRecord;
  },

  // Update existing record
  async update(id: string, updates: Partial<InventoryMasterRecord>) {
    const { data, error } = await supabase
      .from('inventory_master')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as InventoryMasterRecord;
  },

  // Delete record
  async delete(id: string) {
    const { error } = await supabase
      .from('inventory_master')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  // Bulk insert records (for CSV upload)
  async bulkInsert(records: Omit<InventoryMasterRecord, 'id' | 'created_at' | 'updated_at'>[]) {
    const { data, error } = await supabase
      .from('inventory_master')
      .insert(records)
      .select();
    
    if (error) throw error;
    return data as InventoryMasterRecord[];
  },

  // Get unique values for filters
  async getUniqueValues(column: 'department' | 'division' | 'approving_entities') {
    const { data, error } = await supabase
      .from('inventory_master')
      .select(column)
      .not(column, 'is', null)
      .not(column, 'eq', '');
    
    if (error) throw error;
    
    const uniqueValues = [...new Set(data.map(item => item[column]).filter(Boolean))];
    return uniqueValues.sort();
  },

  // Get statistics
  async getStats() {
    const { data, error } = await supabase
      .from('inventory_master')
      .select('department, status');
    
    if (error) throw error;
    
    const stats = {
      total: data.length,
      byDepartment: data.reduce((acc, item) => {
        const dept = item.department || 'Unknown';
        acc[dept] = (acc[dept] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byStatus: data.reduce((acc, item) => {
        const status = item.status || 'Unknown';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };
    
    return stats;
  },

  // Get analytics data for dashboard
  async getAnalytics(fiscalYear: number = 2024) {
    const { data, error } = await supabase
      .from('inventory_master')
      .select(`
        department,
        division,
        type,
        access_mode,
        processing_time_${fiscalYear},
        volume_${fiscalYear},
        revenue_${fiscalYear},
        status
      `)
      .eq('status', 'Active');
    
    if (error) throw error;
    return data;
  },

  // Get types count by department
  async getTypesCountByDepartment(fiscalYear: number = 2024) {
    const { data, error } = await supabase
      .from('inventory_master')
      .select('department, type')
      .eq('status', 'Active');
    
    if (error) throw error;
    
    const result = data.reduce((acc, item) => {
      const dept = item.department || 'Unknown';
      const category = this.categorizeType(item.type || '');
      
      if (!acc[dept]) {
        acc[dept] = { License: 0, Permit: 0, Stamp: 0, Registration: 0, Certificate: 0, Approval: 0, Other: 0 };
      }
      acc[dept][category] = (acc[dept][category] || 0) + 1;
      
      return acc;
    }, {} as Record<string, Record<string, number>>);
    
    return result;
  },

  // Helper method to categorize types
  categorizeType(type: string): string {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('license')) return 'License';
    if (lowerType.includes('permit')) return 'Permit';
    if (lowerType.includes('stamp')) return 'Stamp';
    if (lowerType.includes('registration')) return 'Registration';
    if (lowerType.includes('certificate')) return 'Certificate';
    if (lowerType.includes('approval')) return 'Approval';
    return 'Other';
  },
  // Get processing time statistics by department
  async getProcessingTimeByDepartment() {
    const { data, error } = await supabase
      .from('inventory_master')
      .select(`
        department,
        processing_time_2024,
        volume_2024
      `)
      .eq('status', 'Active')
      .not('processing_time_2024', 'is', null);
    
    if (error) throw error;
    
    const result = data.reduce((acc, item) => {
      const dept = item.department || 'Unknown';
      
      if (!acc[dept]) {
        acc[dept] = {
          department: dept,
          processingTimes: [],
          totalApplications: 0
        };
      }
      
      if (item.processing_time_2024) {
        acc[dept].processingTimes.push(item.processing_time_2024);
      }
      acc[dept].totalApplications += parseInt(item.volume_2024 || '0') || 0;
      
      return acc;
    }, {} as Record<string, any>);
    
    // Process the data to extract meaningful information
    return Object.values(result).map(dept => ({
      department: dept.department,
      processingRange: dept.processingTimes.length > 0 ? dept.processingTimes[0] : 'N/A',
      medianProcessingDays: 'N/A',
      totalApplications: dept.totalApplications
    }));
  }
};