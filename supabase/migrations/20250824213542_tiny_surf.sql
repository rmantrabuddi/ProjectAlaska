/*
  # Add additional columns to inventory_data table

  1. New Columns
    - `access_mode` (text) - How users access this license/permit
    - `regulations` (text) - Relevant regulations or legal requirements
    - `user_type` (text) - Type of user who typically applies
    - `cost` (text) - Cost information for the license/permit

  2. Changes
    - Add 4 new columns to inventory_data table
    - Set default values to empty strings for consistency
    - Update existing records to have empty string defaults
*/

DO $$
BEGIN
  -- Add access_mode column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_data' AND column_name = 'access_mode'
  ) THEN
    ALTER TABLE inventory_data ADD COLUMN access_mode text DEFAULT ''::text;
  END IF;

  -- Add regulations column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_data' AND column_name = 'regulations'
  ) THEN
    ALTER TABLE inventory_data ADD COLUMN regulations text DEFAULT ''::text;
  END IF;

  -- Add user_type column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_data' AND column_name = 'user_type'
  ) THEN
    ALTER TABLE inventory_data ADD COLUMN user_type text DEFAULT ''::text;
  END IF;

  -- Add cost column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_data' AND column_name = 'cost'
  ) THEN
    ALTER TABLE inventory_data ADD COLUMN cost text DEFAULT ''::text;
  END IF;
END $$;