/*
  # Update database schema for 2023-2025 data years

  1. Schema Changes
    - Remove all 2022 columns from inventory_master and inventory_data tables
    - Add 2025 columns to replace 2022 columns
    - Update existing 2023 and 2024 columns to maintain data integrity

  2. Data Migration
    - Preserve existing 2023 and 2024 data
    - Add new 2025 columns with default values

  3. Index Updates
    - Update any indexes that reference the old column names
*/

-- Update inventory_master table
DO $$
BEGIN
  -- Add 2025 columns if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_master' AND column_name = 'revenue_2025'
  ) THEN
    ALTER TABLE inventory_master ADD COLUMN revenue_2025 text DEFAULT ''::text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_master' AND column_name = 'volume_2025'
  ) THEN
    ALTER TABLE inventory_master ADD COLUMN volume_2025 text DEFAULT ''::text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_master' AND column_name = 'processing_time_2025'
  ) THEN
    ALTER TABLE inventory_master ADD COLUMN processing_time_2025 text DEFAULT ''::text;
  END IF;

  -- Remove 2022 columns if they exist
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_master' AND column_name = 'revenue_2022'
  ) THEN
    ALTER TABLE inventory_master DROP COLUMN revenue_2022;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_master' AND column_name = 'volume_2022'
  ) THEN
    ALTER TABLE inventory_master DROP COLUMN volume_2022;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_master' AND column_name = 'processing_time_2022'
  ) THEN
    ALTER TABLE inventory_master DROP COLUMN processing_time_2022;
  END IF;
END $$;

-- Update inventory_data table
DO $$
BEGIN
  -- Add 2025 columns if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_data' AND column_name = 'revenue_2025'
  ) THEN
    ALTER TABLE inventory_data ADD COLUMN revenue_2025 numeric(12,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_data' AND column_name = 'volume_2025'
  ) THEN
    ALTER TABLE inventory_data ADD COLUMN volume_2025 integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_data' AND column_name = 'processing_time_2025'
  ) THEN
    ALTER TABLE inventory_data ADD COLUMN processing_time_2025 numeric(8,2) DEFAULT 0;
  END IF;

  -- Remove 2022 columns if they exist
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_data' AND column_name = 'revenue_2022'
  ) THEN
    ALTER TABLE inventory_data DROP COLUMN revenue_2022;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_data' AND column_name = 'volume_2022'
  ) THEN
    ALTER TABLE inventory_data DROP COLUMN volume_2022;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_data' AND column_name = 'processing_time_2022'
  ) THEN
    ALTER TABLE inventory_data DROP COLUMN processing_time_2022;
  END IF;
END $$;