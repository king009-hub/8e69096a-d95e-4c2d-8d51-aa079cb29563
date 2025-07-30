-- Create profiles table linked to auth.users
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create profiles policies
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, first_name, last_name)
  VALUES (
    NEW.id, 
    NEW.email,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for automatic profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Security definer function to get current user role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Security definer function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Allow all operations on products" ON public.products;
DROP POLICY IF EXISTS "Allow all operations on sales" ON public.sales;
DROP POLICY IF EXISTS "Allow all operations on sale_items" ON public.sale_items;
DROP POLICY IF EXISTS "Allow all operations on customers" ON public.customers;
DROP POLICY IF EXISTS "Allow all operations on product_batches" ON public.product_batches;
DROP POLICY IF EXISTS "Allow all operations on stock_movements" ON public.stock_movements;
DROP POLICY IF EXISTS "Allow all operations on settings" ON public.settings;
DROP POLICY IF EXISTS "Allow all operations on company_profile" ON public.company_profile;
DROP POLICY IF EXISTS "Allow all operations on user_roles" ON public.user_roles;

-- Create secure RLS policies for products
CREATE POLICY "Authenticated users can view products" 
ON public.products FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert products" 
ON public.products FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update products" 
ON public.products FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete products" 
ON public.products FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Create secure RLS policies for sales
CREATE POLICY "Authenticated users can view sales" 
ON public.sales FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert sales" 
ON public.sales FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update sales" 
ON public.sales FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete sales" 
ON public.sales FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Create secure RLS policies for sale_items
CREATE POLICY "Authenticated users can view sale_items" 
ON public.sale_items FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert sale_items" 
ON public.sale_items FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update sale_items" 
ON public.sale_items FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete sale_items" 
ON public.sale_items FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Create secure RLS policies for customers
CREATE POLICY "Authenticated users can view customers" 
ON public.customers FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert customers" 
ON public.customers FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update customers" 
ON public.customers FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete customers" 
ON public.customers FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Create secure RLS policies for product_batches
CREATE POLICY "Authenticated users can view product_batches" 
ON public.product_batches FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert product_batches" 
ON public.product_batches FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update product_batches" 
ON public.product_batches FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete product_batches" 
ON public.product_batches FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Create secure RLS policies for stock_movements
CREATE POLICY "Authenticated users can view stock_movements" 
ON public.stock_movements FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert stock_movements" 
ON public.stock_movements FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update stock_movements" 
ON public.stock_movements FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete stock_movements" 
ON public.stock_movements FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Create admin-only policies for settings
CREATE POLICY "Admins can view settings" 
ON public.settings FOR SELECT 
USING (public.is_admin());

CREATE POLICY "Admins can insert settings" 
ON public.settings FOR INSERT 
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update settings" 
ON public.settings FOR UPDATE 
USING (public.is_admin());

CREATE POLICY "Admins can delete settings" 
ON public.settings FOR DELETE 
USING (public.is_admin());

-- Create admin-only policies for company_profile
CREATE POLICY "Admins can view company_profile" 
ON public.company_profile FOR SELECT 
USING (public.is_admin());

CREATE POLICY "Admins can insert company_profile" 
ON public.company_profile FOR INSERT 
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update company_profile" 
ON public.company_profile FOR UPDATE 
USING (public.is_admin());

CREATE POLICY "Admins can delete company_profile" 
ON public.company_profile FOR DELETE 
USING (public.is_admin());

-- Create policies for user_roles (users can view own roles, admins can manage all)
CREATE POLICY "Users can view their own roles" 
ON public.user_roles FOR SELECT 
USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Admins can insert user_roles" 
ON public.user_roles FOR INSERT 
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update user_roles" 
ON public.user_roles FOR UPDATE 
USING (public.is_admin());

CREATE POLICY "Admins can delete user_roles" 
ON public.user_roles FOR DELETE 
USING (public.is_admin());

-- Update user_roles table to use auth.uid format
ALTER TABLE public.user_roles 
ALTER COLUMN user_id SET NOT NULL;