-- Create table for quick order templates
CREATE TABLE public.hotel_order_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  icon TEXT DEFAULT 'package',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create table for template items
CREATE TABLE public.hotel_order_template_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.hotel_order_templates(id) ON DELETE CASCADE,
  service_item_id UUID NOT NULL REFERENCES public.hotel_service_menu(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.hotel_order_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_order_template_items ENABLE ROW LEVEL SECURITY;

-- Create policies for templates
CREATE POLICY "Authenticated users can manage order templates"
  ON public.hotel_order_templates
  FOR ALL
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage template items"
  ON public.hotel_order_template_items
  FOR ALL
  USING (auth.uid() IS NOT NULL);

-- Create indexes
CREATE INDEX idx_template_items_template_id ON public.hotel_order_template_items(template_id);
CREATE INDEX idx_template_items_service_id ON public.hotel_order_template_items(service_item_id);