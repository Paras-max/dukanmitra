
CREATE TABLE public.shops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL UNIQUE,
  name text NOT NULL,
  owner_name text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  language text NOT NULL DEFAULT 'en',
  voice_replies boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  aliases text[] NOT NULL DEFAULT '{}',
  category text NOT NULL DEFAULT 'General',
  unit text NOT NULL DEFAULT 'pcs',
  price numeric(10,2) NOT NULL DEFAULT 0,
  cost_price numeric(10,2) NOT NULL DEFAULT 0,
  quantity numeric(10,2) NOT NULL DEFAULT 0,
  min_stock numeric(10,2) NOT NULL DEFAULT 5,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  phone text NOT NULL DEFAULT '',
  balance numeric(10,2) NOT NULL DEFAULT 0,
  last_reminder_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  quantity numeric(10,2) NOT NULL,
  unit_price numeric(10,2) NOT NULL,
  cost_price numeric(10,2) NOT NULL DEFAULT 0,
  total numeric(10,2) NOT NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  on_credit boolean NOT NULL DEFAULT false,
  source text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  category text NOT NULL DEFAULT 'Other',
  description text NOT NULL DEFAULT '',
  amount numeric(10,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.credit_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('credit','payment')),
  amount numeric(10,2) NOT NULL,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.agent_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  command text NOT NULL,
  language text NOT NULL DEFAULT 'en',
  mode text NOT NULL DEFAULT 'ai',
  status text NOT NULL DEFAULT 'done',
  reply text NOT NULL DEFAULT '',
  steps jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['shops','products','customers','sales','expenses','credit_entries','agent_runs'] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "own rows select" ON public.%I FOR SELECT TO authenticated USING (owner_id = auth.uid())', t);
    EXECUTE format('CREATE POLICY "own rows insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid())', t);
    EXECUTE format('CREATE POLICY "own rows update" ON public.%I FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid())', t);
    EXECUTE format('CREATE POLICY "own rows delete" ON public.%I FOR DELETE TO authenticated USING (owner_id = auth.uid())', t);
  END LOOP;
END $$;

-- Atomic sale: checks stock, decrements, records sale, optional credit
CREATE OR REPLACE FUNCTION public.record_sale(p_product_id uuid, p_quantity numeric, p_unit_price numeric, p_customer_id uuid DEFAULT NULL, p_on_credit boolean DEFAULT false, p_source text DEFAULT 'manual')
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE prod public.products; s public.sales; price numeric;
BEGIN
  IF p_quantity <= 0 THEN RAISE EXCEPTION 'Quantity must be positive'; END IF;
  SELECT * INTO prod FROM public.products WHERE id = p_product_id AND owner_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Product not found'; END IF;
  IF prod.quantity < p_quantity THEN RAISE EXCEPTION 'Only % % of % in stock', prod.quantity, prod.unit, prod.name; END IF;
  price := COALESCE(p_unit_price, prod.price);
  UPDATE public.products SET quantity = quantity - p_quantity WHERE id = prod.id;
  INSERT INTO public.sales(owner_id, product_id, product_name, quantity, unit_price, cost_price, total, customer_id, on_credit, source)
  VALUES (auth.uid(), prod.id, prod.name, p_quantity, price, prod.cost_price, round(price * p_quantity, 2), p_customer_id, p_on_credit, p_source)
  RETURNING * INTO s;
  IF p_on_credit AND p_customer_id IS NOT NULL THEN
    INSERT INTO public.credit_entries(owner_id, customer_id, kind, amount, note) VALUES (auth.uid(), p_customer_id, 'credit', s.total, 'Sale: ' || prod.name);
    UPDATE public.customers SET balance = balance + s.total WHERE id = p_customer_id AND owner_id = auth.uid();
  END IF;
  RETURN jsonb_build_object('sale_id', s.id, 'total', s.total, 'remaining', prod.quantity - p_quantity, 'unit', prod.unit, 'product', prod.name);
END $$;

CREATE OR REPLACE FUNCTION public.record_credit(p_customer_id uuid, p_kind text, p_amount numeric, p_note text DEFAULT '')
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE c public.customers;
BEGIN
  IF p_amount <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;
  SELECT * INTO c FROM public.customers WHERE id = p_customer_id AND owner_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Customer not found'; END IF;
  INSERT INTO public.credit_entries(owner_id, customer_id, kind, amount, note) VALUES (auth.uid(), c.id, p_kind, p_amount, p_note);
  UPDATE public.customers SET balance = balance + CASE WHEN p_kind = 'credit' THEN p_amount ELSE -p_amount END WHERE id = c.id
  RETURNING * INTO c;
  RETURN jsonb_build_object('customer', c.name, 'balance', c.balance);
END $$;

-- Demo data for the signed-in shop (called once when the shopkeeper chooses sample data)
CREATE OR REPLACE FUNCTION public.seed_demo_data()
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); d int; p record; c1 uuid; c2 uuid; c3 uuid; q numeric;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF EXISTS (SELECT 1 FROM public.products WHERE owner_id = uid) THEN RETURN; END IF;
  INSERT INTO public.products(owner_id,name,aliases,category,unit,price,cost_price,quantity,min_stock) VALUES
   (uid,'Milk Packet','{milk,doodh,दूध}','Dairy','packets',30,26,30,15),
   (uid,'Bread','{pav,bread,ब्रेड}','Bakery','loaves',40,32,18,8),
   (uid,'Eggs','{egg,anda,अंडा,अंडी}','Dairy','pcs',7,5.5,120,30),
   (uid,'Basmati Rice 1kg','{rice,chawal,चावल,तांदूळ}','Grains','kg',120,98,40,10),
   (uid,'Toor Dal 1kg','{dal,daal,दाल,डाळ}','Grains','kg',160,135,22,8),
   (uid,'Sugar 1kg','{sugar,cheeni,shakkar,चीनी,साखर}','Grains','kg',48,42,35,10),
   (uid,'Sunflower Oil 1L','{oil,tel,तेल}','Oil','bottles',150,128,14,6),
   (uid,'Parle-G Biscuit','{biscuit,parle,बिस्किट}','Snacks','packs',10,8,90,24),
   (uid,'Maggi Noodles','{maggi,noodles,मैगी}','Snacks','packs',14,11.5,60,20),
   (uid,'Tata Salt 1kg','{salt,namak,नमक,मीठ}','Grains','kg',28,22,25,8),
   (uid,'Tea Powder 250g','{tea,chai,चाय,चहा}','Beverages','packs',95,80,12,6),
   (uid,'Detergent 1kg','{surf,detergent,soap powder}','Household','packs',110,92,4,5),
   (uid,'Bath Soap','{soap,sabun,साबुन}','Household','pcs',35,28,48,12),
   (uid,'Atta 5kg','{atta,flour,आटा,पीठ}','Grains','bags',260,225,9,5);
  INSERT INTO public.customers(owner_id,name,phone) VALUES (uid,'Ramesh Patil','9876543210') RETURNING id INTO c1;
  INSERT INTO public.customers(owner_id,name,phone) VALUES (uid,'Sunita Sharma','9822012345') RETURNING id INTO c2;
  INSERT INTO public.customers(owner_id,name,phone) VALUES (uid,'Abdul Khan','9930011122') RETURNING id INTO c3;
  -- 21 days of sales history (does not decrement current stock)
  FOR d IN 1..21 LOOP
    FOR p IN SELECT * FROM public.products WHERE owner_id = uid LOOP
      q := CASE
        WHEN p.name = 'Milk Packet' THEN 8 + floor(random()*8) + CASE WHEN extract(dow FROM now() - d * interval '1 day') IN (0,6) THEN 4 ELSE 0 END
        WHEN p.name IN ('Eggs') THEN 15 + floor(random()*15)
        WHEN p.name IN ('Bread','Parle-G Biscuit','Maggi Noodles') THEN 3 + floor(random()*7)
        WHEN p.name IN ('Detergent 1kg','Tea Powder 250g','Atta 5kg') THEN CASE WHEN random() < 0.35 THEN 1 ELSE 0 END
        ELSE floor(random()*4) END;
      IF q > 0 THEN
        INSERT INTO public.sales(owner_id,product_id,product_name,quantity,unit_price,cost_price,total,source,created_at)
        VALUES (uid,p.id,p.name,q,p.price,p.cost_price,q*p.price,'demo', now() - d * interval '1 day' + (random()*10) * interval '1 hour');
      END IF;
    END LOOP;
    IF d % 7 = 0 THEN
      INSERT INTO public.expenses(owner_id,category,description,amount,created_at) VALUES (uid,'Electricity','Weekly electricity share',450, now() - d * interval '1 day');
    END IF;
    IF d % 3 = 0 THEN
      INSERT INTO public.expenses(owner_id,category,description,amount,created_at) VALUES (uid,'Transport','Stock pickup auto fare',120, now() - d * interval '1 day');
    END IF;
  END LOOP;
  INSERT INTO public.expenses(owner_id,category,description,amount,created_at) VALUES (uid,'Rent','Monthly shop rent',6000, now() - interval '15 days');
  PERFORM public.record_credit(c1,'credit',850,'Monthly groceries');
  PERFORM public.record_credit(c2,'credit',1240,'Festival items');
  PERFORM public.record_credit(c2,'payment',400,'Part payment');
  PERFORM public.record_credit(c3,'credit',320,'Rice and dal');
END $$;

GRANT EXECUTE ON FUNCTION public.record_sale(uuid,numeric,numeric,uuid,boolean,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_credit(uuid,text,numeric,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.seed_demo_data() TO authenticated;
