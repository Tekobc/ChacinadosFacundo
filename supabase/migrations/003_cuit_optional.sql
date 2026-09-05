-- Permitir que CUIT sea opcional (NULL) en proveedores
ALTER TABLE public.proveedores ALTER COLUMN cuit DROP NOT NULL;
