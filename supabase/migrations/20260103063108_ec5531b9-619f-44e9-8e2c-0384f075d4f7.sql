-- Enable RLS on leave_types table
ALTER TABLE public.leave_types ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read leave types
CREATE POLICY "Anyone can view leave types" ON public.leave_types
    FOR SELECT USING (true);

-- Fix function search path for update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;