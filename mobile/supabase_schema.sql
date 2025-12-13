-- Drop table if exists (CAUTION: THIS DELETES DATA)
DROP TABLE IF EXISTS public.reports;

-- Create the reports table with new fields
CREATE TABLE public.reports (
    id text PRIMARY KEY,
    title text,
    description text,
    reporter_name text,
    incident_type integer,
    severity integer,
    incident_time timestamptz,
    latitude double precision,
    longitude double precision,
    images text[], -- Array of image URIs/paths
    synced boolean DEFAULT true,
    sync_attempts integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    user_id uuid REFERENCES auth.users(id)
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own reports
CREATE POLICY "Users can view their own reports" 
ON public.reports FOR SELECT 
USING (auth.uid() = user_id);

-- Policy: Users can insert their own reports
CREATE POLICY "Users can insert their own reports" 
ON public.reports FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own reports
CREATE POLICY "Users can update their own reports" 
ON public.reports FOR UPDATE 
USING (auth.uid() = user_id);

-- Policy: Users can delete their own reports
CREATE POLICY "Users can delete their own reports" 
ON public.reports FOR DELETE 
USING (auth.uid() = user_id);

-- Function to automatically update 'updated_at' on change
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to call the function
CREATE TRIGGER reports_handle_updated_at
    BEFORE UPDATE ON public.reports
    FOR EACH ROW
    EXECUTE PROCEDURE handle_updated_at();
