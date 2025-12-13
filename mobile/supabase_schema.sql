-- Create the reports table
-- Note: 'id' is text to support WatermelonDB's client-side generated IDs
CREATE TABLE public.reports (
    id text PRIMARY KEY,
    title text,
    description text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    user_id uuid REFERENCES auth.users(id) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Poli-cy: Users can see their own reports
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
