/*
  # Create Inventory Master Table

  1. New Tables
    - `inventory_master`
      - Complete schema based on Alaska inventory template
      - All columns from the CSV template with appropriate data types
      - Proper indexing for search and filtering
      - Row Level Security enabled

  2. Security
    - Enable RLS on `inventory_master` table
    - Add policy for authenticated users to read and modify data
    - Public read access for viewing inventory data

  3. Features
    - Full text search capabilities
    - Proper data validation
    - Audit trail with created_at and updated_at timestamps
*/

-- Create the inventory master table with all columns from the template
CREATE TABLE IF NOT EXISTS inventory_master (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id text UNIQUE,
  department text NOT NULL DEFAULT '',
  division text NOT NULL DEFAULT '',
  license_permit_title text NOT NULL DEFAULT '',
  type text DEFAULT '',
  approving_entities text DEFAULT '',
  access_mode text DEFAULT '',
  key_word text DEFAULT '',
  description text DEFAULT '',
  regulations text DEFAULT '',
  regulation_description text DEFAULT '',
  user_type text DEFAULT '',
  cost text DEFAULT '',
  renewal_frequency text DEFAULT '',
  source text DEFAULT '',
  revenue_2022 text DEFAULT '',
  revenue_2023 text DEFAULT '',
  revenue_2024 text DEFAULT '',
  volume_2022 text DEFAULT '',
  volume_2023 text DEFAULT '',
  volume_2024 text DEFAULT '',
  processing_time_2022 text DEFAULT '',
  processing_time_2023 text DEFAULT '',
  processing_time_2024 text DEFAULT '',
  digitized text DEFAULT '',
  workflow_automated_percent text DEFAULT '',
  notes text DEFAULT '',
  status text DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Under Review')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE inventory_master ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to have full access
CREATE POLICY "Authenticated users can manage inventory"
  ON inventory_master
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create policy for public read access
CREATE POLICY "Public can read inventory"
  ON inventory_master
  FOR SELECT
  TO anon
  USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_inventory_department ON inventory_master(department);
CREATE INDEX IF NOT EXISTS idx_inventory_division ON inventory_master(division);
CREATE INDEX IF NOT EXISTS idx_inventory_title ON inventory_master(license_permit_title);
CREATE INDEX IF NOT EXISTS idx_inventory_status ON inventory_master(status);
CREATE INDEX IF NOT EXISTS idx_inventory_record_id ON inventory_master(record_id);

-- Create full-text search index
CREATE INDEX IF NOT EXISTS idx_inventory_search ON inventory_master 
USING gin(to_tsvector('english', 
  coalesce(license_permit_title, '') || ' ' || 
  coalesce(description, '') || ' ' || 
  coalesce(department, '') || ' ' || 
  coalesce(division, '')
));

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_inventory_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_inventory_master_updated_at
  BEFORE UPDATE ON inventory_master
  FOR EACH ROW
  EXECUTE FUNCTION update_inventory_updated_at();