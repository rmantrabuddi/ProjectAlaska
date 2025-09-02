import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = (): boolean =>
  !!(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith("https://") &&
    supabaseAnonKey.length > 20
  );

// Reuse the client across Vite HMR reloads
const globalForSupabase = globalThis as unknown as { __supabase?: SupabaseClient };

if (isSupabaseConfigured() && !globalForSupabase.__supabase) {
  globalForSupabase.__supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
    auth: {
      // ✅ persist the anon session across reloads
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

// Export as possibly undefined; callers should guard or call ensureAuth() first
export const supabase: SupabaseClient | undefined = globalForSupabase.__supabase;

export async function ensureAuth() {
  if (!isSupabaseConfigured() || !supabase) return;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    const { error } = await supabase.auth.signInAnonymously();
    if (error) console.error("Anonymous sign-in failed:", error);
  }
}// Database types
export interface Department {
  id: string;
  name: string;
  short_name: string;
  description: string;
  status: 'Active' | 'Inactive';
  created_at: string;
  updated_at: string;
}

export interface InventoryData {
  id: string;
  department_id: string;
  department_name: string;
  division: string;
  license_permit_type: string;
  description: string;
  access_mode: string;
  regulations: string;
  user_type: string;
  cost: string;
  revenue_2023: number;
  revenue_2024: number;
  revenue_2025: number;
  processing_time_2023: number;
  processing_time_2024: number;
  processing_time_2025: number;
  volume_2023: number;
  volume_2024: number;
  volume_2025: number;
  status: 'Active' | 'Inactive' | 'Under Review';
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  department_id: string;
  department_name: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_url?: string;
  document_type: string;
  description: string;
  upload_date: string;
  uploaded_by: string;
  status: 'Active' | 'Archived' | 'Deleted';
  created_at: string;
  updated_at: string;
}

export interface InterviewNote {
  id: string;
  department_id: string;
  department_name: string;
  division: string;
  interviewee_name: string;
  interviewer_name: string;
  interview_date: string;
  duration_minutes: number;
  notes: string;
  key_insights: string[];
  challenges: string[];
  opportunities: string[];
  status: 'Active' | 'Archived' | 'Under Review';
  created_at: string;
  updated_at: string;
}

export interface AIAnalysisResult {
  id: string;
  analysis_type: 'interview_analysis' | 'document_analysis' | 'data_insights' | 'cross_department';
  department_name?: string;
  source_data_hash: string;
  summary: string;
  key_insights: string[];
  challenges: string[];
  opportunities: string[];
  recommendations: string[];
  confidence_score: number;
  created_at: string;
  expires_at: string;
}

// Database service functions
export class DatabaseService {
  // Department operations
  static async getDepartments(): Promise<Department[]> {
    if (!isSupabaseConfigured()) {
      return [
        { id: '1', name: 'Department of Commerce, Community, and Economic Development', short_name: 'Commerce', description: '', status: 'Active', created_at: '', updated_at: '' },
        { id: '2', name: 'Department of Fish and Game', short_name: 'Fish & Game', description: '', status: 'Active', created_at: '', updated_at: '' },
        { id: '3', name: 'Department of Natural Resources', short_name: 'Natural Resources', description: '', status: 'Active', created_at: '', updated_at: '' },
        { id: '4', name: 'Department of Environmental Conservation', short_name: 'Environmental', description: '', status: 'Active', created_at: '', updated_at: '' },
        { id: '5', name: 'Department of Administration, Division of Motor Vehicles', short_name: 'Motor Vehicles', description: '', status: 'Active', created_at: '', updated_at: '' }
      ];
    }

    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('status', 'Active')
        .order('name');
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching departments:', error);
      // Return mock data as fallback
      return [
        { id: '1', name: 'Department of Commerce, Community, and Economic Development', short_name: 'Commerce', description: '', status: 'Active', created_at: '', updated_at: '' },
        { id: '2', name: 'Department of Fish and Game', short_name: 'Fish & Game', description: '', status: 'Active', created_at: '', updated_at: '' },
        { id: '3', name: 'Department of Natural Resources', short_name: 'Natural Resources', description: '', status: 'Active', created_at: '', updated_at: '' },
        { id: '4', name: 'Department of Environmental Conservation', short_name: 'Environmental', description: '', status: 'Active', created_at: '', updated_at: '' },
        { id: '5', name: 'Department of Administration, Division of Motor Vehicles', short_name: 'Motor Vehicles', description: '', status: 'Active', created_at: '', updated_at: '' }
      ];
    }
  }

  // Inventory data operations
  static async getInventoryData(filters?: {
    department?: string;
    division?: string;
    licenseType?: string;
    searchTerm?: string;
  }): Promise<InventoryData[]> {
    if (!isSupabaseConfigured()) {
      // Return empty array when Supabase is not configured
      return [];
    }

    if (!supabase) {
      // Return empty array when Supabase client is not initialized
      return [];
    }

    try {
    let query = supabase
      .from('inventory_data')
      .select('*')
      .eq('status', 'Active');

    if (filters?.department) {
      query = query.eq('department_name', filters.department);
    }
    if (filters?.division) {
      query = query.ilike('division', `%${filters.division}%`);
    }
    if (filters?.licenseType) {
      query = query.ilike('license_permit_type', `%${filters.licenseType}%`);
    }
    if (filters?.searchTerm) {
      query = query.textSearch('fts', filters.searchTerm);
    }

      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) {
        console.warn('Supabase query error:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.warn('Failed to fetch inventory data from Supabase:', error);
      return [];
    }
  }

  static async createInventoryData(data: Omit<InventoryData, 'id' | 'created_at' | 'updated_at'>): Promise<InventoryData> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Please set up your Supabase environment variables.');
    }

    const { data: result, error } = await supabase
      .from('inventory_data')
      .insert(data)
      .select()
      .single();
    
    if (error) throw error;
    return result;
  }

  static async updateInventoryData(id: string, data: Partial<InventoryData>): Promise<InventoryData> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Please set up your Supabase environment variables.');
    }

    const { data: result, error } = await supabase
      .from('inventory_data')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return result;
  }

  static async bulkInsertInventoryData(data: Omit<InventoryData, 'id' | 'created_at' | 'updated_at'>[]): Promise<InventoryData[]> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Please set up your Supabase environment variables.');
    }

    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Please set up your Supabase environment variables.');
    }

    const { data: result, error } = await supabase
      .from('inventory_data')
      .insert(data)
      .select();
    
    if (error) throw error;
    return result || [];
  }

  // Document operations
  static async getDocuments(departmentFilter?: string): Promise<Document[]> {
    if (!isSupabaseConfigured()) {
      // Return empty array when Supabase is not configured
      return [];
    }

    let query = supabase
      .from('documents')
      .select('*')
      .eq('status', 'Active');

    if (departmentFilter) {
      query = query.eq('department_name', departmentFilter);
    }

    const { data, error } = await query.order('upload_date', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  static async createDocument(data: Omit<Document, 'id' | 'created_at' | 'updated_at'>): Promise<Document> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Please set up your Supabase environment variables.');
    }

    const { data: result, error } = await supabase
      .from('documents')
      .insert(data)
      .select()
      .single();
    
    if (error) throw error;
    return result;
  }

  static async deleteDocument(id: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Please set up your Supabase environment variables.');
    }

    const { error } = await supabase
      .from('documents')
      .update({ status: 'Deleted' })
      .eq('id', id);
    
    if (error) throw error;
  }

  // Interview notes operations
  static async getInterviewNotes(filters?: {
    department?: string;
    division?: string;
    searchTerm?: string;
  }): Promise<InterviewNote[]> {
    if (!isSupabaseConfigured()) {
      // Return empty array when Supabase is not configured
      return [];
    }

    let query = supabase
      .from('interview_notes')
      .select('*')
      .eq('status', 'Active');

    if (filters?.department) {
      query = query.eq('department_name', filters.department);
    }
    if (filters?.division) {
      query = query.ilike('division', `%${filters.division}%`);
    }
    if (filters?.searchTerm) {
      query = query.textSearch('fts', filters.searchTerm);
    }

    const { data, error } = await query.order('interview_date', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  static async createInterviewNote(data: Omit<InterviewNote, 'id' | 'created_at' | 'updated_at'>): Promise<InterviewNote> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Please set up your Supabase environment variables.');
    }

    const { data: result, error } = await supabase
      .from('interview_notes')
      .insert(data)
      .select()
      .single();
    
    if (error) throw error;
    return result;
  }

  // AI Analysis operations
  static async getAIAnalysis(analysisType: string, departmentName?: string): Promise<AIAnalysisResult | null> {
    if (!isSupabaseConfigured()) {
      // Return null when Supabase is not configured
      return null;
    }

    if (!supabase) {
      return null;
    }

    try {
      let query = supabase
        .from('ai_analysis_results')
        .select('*')
        .eq('analysis_type', analysisType)
        .gt('expires_at', new Date().toISOString());

      if (departmentName) {
        query = query.eq('department_name', departmentName);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.warn('Supabase query error:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.warn('Failed to fetch AI analysis from Supabase:', error);
      return null;
    }
  }

  static async saveAIAnalysis(data: Omit<AIAnalysisResult, 'id' | 'created_at'>): Promise<AIAnalysisResult> {
    if (!isSupabaseConfigured()) {
      throw new Error('Database not configured. Please set up your Supabase environment variables (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY).');
    }

    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    const { data: result, error } = await supabase
      .from('ai_analysis_results')
      .insert(data)
      .select()
      .single();
    
    if (error) throw error;
    return result;
  }
}