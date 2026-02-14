
-- Update RLS policies for leads table to allow Sellers and Producers to delete leads

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Vendedores podem excluir seus próprios leads" ON public.leads;
DROP POLICY IF EXISTS "Produtores podem excluir qualquer lead" ON public.leads;
DROP POLICY IF EXISTS "Leads delete policy" ON public.leads;

-- Policy for Sellers: Can delete only their own leads
CREATE POLICY "Vendedores podem excluir seus próprios leads" 
ON public.leads 
FOR DELETE 
USING (auth.uid() = seller_id);

-- Policy for Producers: Can delete ANY lead
CREATE POLICY "Produtores podem excluir qualquer lead" 
ON public.leads 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND cargo = 'Produtor'
  )
);

-- Ensure Select policies are also correct (re-applying just in case)
DROP POLICY IF EXISTS "Vendedores podem ver seus próprios leads" ON public.leads;
CREATE POLICY "Vendedores podem ver seus próprios leads" 
ON public.leads 
FOR SELECT 
USING (
  auth.uid() = seller_id OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND cargo = 'Produtor')
);
