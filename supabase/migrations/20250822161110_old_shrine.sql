/*
  # Alaska State Departments Analysis Dashboard Database Schema

  1. New Tables
    - `departments` - Master list of Alaska state departments
    - `inventory_data` - License and permit inventory with 3-year historical data
    - `documents` - Uploaded documents organized by department
    - `interview_notes` - Interview notes with insights, challenges, and opportunities
    - `ai_analysis_results` - Cached AI analysis results

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage data
    - Add policies for public read access where appropriate

  3. Indexes
    - Add search indexes for efficient filtering
    - Add department and date-based indexes for performance
*/

-- Create departments table
CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  short_name text NOT NULL,
  description text DEFAULT '',
  status text DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create inventory_data table for license and permit data
CREATE TABLE IF NOT EXISTS inventory_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid REFERENCES departments(id) ON DELETE CASCADE,
  department_name text NOT NULL,
  division text NOT NULL,
  license_permit_type text NOT NULL,
  description text DEFAULT '',
  
  -- Revenue data for 3 years
  revenue_2022 decimal(12,2) DEFAULT 0,
  revenue_2023 decimal(12,2) DEFAULT 0,
  revenue_2024 decimal(12,2) DEFAULT 0,
  
  -- Processing time data (in days)
  processing_time_2022 decimal(8,2) DEFAULT 0,
  processing_time_2023 decimal(8,2) DEFAULT 0,
  processing_time_2024 decimal(8,2) DEFAULT 0,
  
  -- Volume data (number processed)
  volume_2022 integer DEFAULT 0,
  volume_2023 integer DEFAULT 0,
  volume_2024 integer DEFAULT 0,
  
  status text DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Under Review')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid REFERENCES departments(id) ON DELETE CASCADE,
  department_name text NOT NULL,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size bigint NOT NULL,
  file_url text,
  document_type text DEFAULT 'General',
  description text DEFAULT '',
  upload_date timestamptz DEFAULT now(),
  uploaded_by text DEFAULT 'System',
  status text DEFAULT 'Active' CHECK (status IN ('Active', 'Archived', 'Deleted')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create interview_notes table
CREATE TABLE IF NOT EXISTS interview_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid REFERENCES departments(id) ON DELETE CASCADE,
  department_name text NOT NULL,
  division text NOT NULL,
  interviewee_name text NOT NULL,
  interviewer_name text NOT NULL,
  interview_date date NOT NULL,
  duration_minutes integer DEFAULT 0,
  notes text NOT NULL,
  key_insights text[] DEFAULT '{}',
  challenges text[] DEFAULT '{}',
  opportunities text[] DEFAULT '{}',
  status text DEFAULT 'Active' CHECK (status IN ('Active', 'Archived', 'Under Review')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create ai_analysis_results table for caching AI analysis
CREATE TABLE IF NOT EXISTS ai_analysis_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_type text NOT NULL CHECK (analysis_type IN ('interview_analysis', 'document_analysis', 'data_insights', 'cross_department')),
  department_name text,
  source_data_hash text NOT NULL, -- Hash of source data to detect changes
  summary text NOT NULL,
  key_insights text[] DEFAULT '{}',
  challenges text[] DEFAULT '{}',
  opportunities text[] DEFAULT '{}',
  recommendations text[] DEFAULT '{}',
  confidence_score decimal(3,2) DEFAULT 0.0,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '7 days') -- Cache for 7 days
);

-- Insert default departments
INSERT INTO departments (name, short_name, description) VALUES
('Department of Commerce, Community, and Economic Development', 'Commerce & Economic Dev', 'Responsible for economic development, community affairs, and business regulation'),
('Department of Fish and Game', 'Fish & Game', 'Manages fish and wildlife resources and outdoor recreation'),
('Department of Natural Resources', 'Natural Resources', 'Manages state lands, minerals, and natural resources'),
('Department of Environmental Conservation', 'Environmental Conservation', 'Protects environmental and public health'),
('Department of Administration, Division of Motor Vehicles', 'Motor Vehicles', 'Handles vehicle registration, licensing, and related services')
ON CONFLICT (name) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analysis_results ENABLE ROW LEVEL SECURITY;

-- Create policies for departments table
CREATE POLICY "Public can read departments"
  ON departments
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage departments"
  ON departments
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create policies for inventory_data table
CREATE POLICY "Public can read inventory data"
  ON inventory_data
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage inventory data"
  ON inventory_data
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create policies for documents table
CREATE POLICY "Public can read documents metadata"
  ON documents
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage documents"
  ON documents
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create policies for interview_notes table
CREATE POLICY "Authenticated users can read interview notes"
  ON interview_notes
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage interview notes"
  ON interview_notes
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create policies for ai_analysis_results table
CREATE POLICY "Authenticated users can read AI analysis"
  ON ai_analysis_results
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage AI analysis"
  ON ai_analysis_results
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_inventory_department ON inventory_data(department_name);
CREATE INDEX IF NOT EXISTS idx_inventory_division ON inventory_data(division);
CREATE INDEX IF NOT EXISTS idx_inventory_license_type ON inventory_data(license_permit_type);
CREATE INDEX IF NOT EXISTS idx_inventory_status ON inventory_data(status);

CREATE INDEX IF NOT EXISTS idx_documents_department ON documents(department_name);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_upload_date ON documents(upload_date);

CREATE INDEX IF NOT EXISTS idx_interview_department ON interview_notes(department_name);
CREATE INDEX IF NOT EXISTS idx_interview_division ON interview_notes(division);
CREATE INDEX IF NOT EXISTS idx_interview_date ON interview_notes(interview_date);

CREATE INDEX IF NOT EXISTS idx_ai_analysis_type ON ai_analysis_results(analysis_type);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_department ON ai_analysis_results(department_name);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_expires ON ai_analysis_results(expires_at);

-- Create full-text search indexes
CREATE INDEX IF NOT EXISTS idx_inventory_search 
  ON inventory_data 
  USING gin(to_tsvector('english', 
    COALESCE(license_permit_type, '') || ' ' || 
    COALESCE(description, '') || ' ' || 
    COALESCE(department_name, '') || ' ' || 
    COALESCE(division, '')
  ));

CREATE INDEX IF NOT EXISTS idx_interview_search 
  ON interview_notes 
  USING gin(to_tsvector('english', 
    COALESCE(notes, '') || ' ' || 
    COALESCE(interviewee_name, '') || ' ' || 
    COALESCE(division, '')
  ));

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_departments_updated_at 
  BEFORE UPDATE ON departments 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_data_updated_at 
  BEFORE UPDATE ON inventory_data 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at 
  BEFORE UPDATE ON documents 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_interview_notes_updated_at 
  BEFORE UPDATE ON interview_notes 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();