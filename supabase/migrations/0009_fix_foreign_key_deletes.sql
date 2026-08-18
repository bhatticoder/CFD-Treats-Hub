-- Drop the existing foreign key constraint which prevents item deletion
ALTER TABLE public.order_items
  DROP CONSTRAINT IF EXISTS order_items_item_id_fkey;

-- Re-add the constraint with ON DELETE SET NULL
ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_item_id_fkey
  FOREIGN KEY (item_id)
  REFERENCES public.items(id)
  ON DELETE SET NULL;
