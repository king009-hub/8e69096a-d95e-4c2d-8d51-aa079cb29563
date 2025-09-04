-- Fix RLS policies for settings and company_profile tables

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view settings" ON public.settings;
DROP POLICY IF EXISTS "Users can insert settings" ON public.settings;
DROP POLICY IF EXISTS "Users can update settings" ON public.settings;
DROP POLICY IF EXISTS "Users can delete settings" ON public.settings;

DROP POLICY IF EXISTS "Users can view company profile" ON public.company_profile;
DROP POLICY IF EXISTS "Users can insert company profile" ON public.company_profile;
DROP POLICY IF EXISTS "Users can update company profile" ON public.company_profile;
DROP POLICY IF EXISTS "Users can delete company profile" ON public.company_profile;

-- Create proper RLS policies for settings table
CREATE POLICY "Authenticated users can view settings" 
ON public.settings 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert settings" 
ON public.settings 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update settings" 
ON public.settings 
FOR UPDATE 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete settings" 
ON public.settings 
FOR DELETE 
USING (auth.role() = 'authenticated');

-- Create proper RLS policies for company_profile table
CREATE POLICY "Authenticated users can view company profile" 
ON public.company_profile 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert company profile" 
ON public.company_profile 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update company profile" 
ON public.company_profile 
FOR UPDATE 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete company profile" 
ON public.company_profile 
FOR DELETE 
USING (auth.role() = 'authenticated');