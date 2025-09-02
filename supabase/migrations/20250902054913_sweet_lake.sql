/*
  # Initial POS System Schema

  1. New Tables
    - `stores` - Store management with location and settings
    - `users_profile` - Extended user profiles linked to auth.users
    - `customers` - Customer information and contact details
    - `suppliers` - Supplier management
    - `categories` - Product categories
    - `products` - Product catalog with inventory
    - `sales` - Sales transactions
    - `sale_items` - Items in each sale
    - `customer_credits` - Customer credit management
    - `credit_transactions` - Credit transaction history

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
    - Separate admin and employee access levels

  3. Features
    - UUID primary keys for all tables
    - Timestamps for audit trails
    - Proper foreign key relationships
    - Default values for better data consistency
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Stores table
CREATE TABLE IF NOT EXISTS stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  phone text,
  email text,
  tax_rate decimal(5,4) DEFAULT 0.1600,
  currency text DEFAULT 'USD',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- User profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS users_profile (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  role text DEFAULT 'employee' CHECK (role IN ('admin', 'employee')),
  store_id uuid REFERENCES stores(id),
  phone text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  address text,
  credit_limit decimal(10,2) DEFAULT 0,
  current_credit decimal(10,2) DEFAULT 0,
  store_id uuid REFERENCES stores(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_person text,
  email text,
  phone text,
  address text,
  store_id uuid REFERENCES stores(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  store_id uuid REFERENCES stores(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  barcode text,
  sku text,
  category_id uuid REFERENCES categories(id),
  supplier_id uuid REFERENCES suppliers(id),
  cost_price decimal(10,2) DEFAULT 0,
  selling_price decimal(10,2) NOT NULL,
  stock_quantity integer DEFAULT 0,
  min_stock_level integer DEFAULT 0,
  is_active boolean DEFAULT true,
  store_id uuid REFERENCES stores(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Sales table
CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id),
  user_id uuid REFERENCES users_profile(id),
  store_id uuid REFERENCES stores(id),
  total_amount decimal(10,2) NOT NULL,
  tax_amount decimal(10,2) DEFAULT 0,
  discount_amount decimal(10,2) DEFAULT 0,
  payment_method text DEFAULT 'cash' CHECK (payment_method IN ('cash', 'card', 'credit')),
  status text DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Sale items table
CREATE TABLE IF NOT EXISTS sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid REFERENCES sales(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id),
  quantity integer NOT NULL DEFAULT 1,
  unit_price decimal(10,2) NOT NULL,
  total_price decimal(10,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Customer credits table
CREATE TABLE IF NOT EXISTS customer_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  current_balance decimal(10,2) DEFAULT 0,
  credit_limit decimal(10,2) DEFAULT 0,
  store_id uuid REFERENCES stores(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Credit transactions table
CREATE TABLE IF NOT EXISTS credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id),
  sale_id uuid REFERENCES sales(id),
  transaction_type text CHECK (transaction_type IN ('credit', 'payment', 'adjustment')),
  amount decimal(10,2) NOT NULL,
  balance_after decimal(10,2) NOT NULL,
  description text,
  created_by uuid REFERENCES users_profile(id),
  store_id uuid REFERENCES stores(id),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE users_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Stores policies
CREATE POLICY "Users can view stores" ON stores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage stores" ON stores FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM users_profile WHERE id = auth.uid() AND role = 'admin')
);

-- Users profile policies
CREATE POLICY "Users can view their profile" ON users_profile FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Admin can manage all profiles" ON users_profile FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM users_profile WHERE id = auth.uid() AND role = 'admin')
);

-- Customers policies
CREATE POLICY "Users can view customers" ON customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage customers" ON customers FOR ALL TO authenticated USING (true);

-- Suppliers policies
CREATE POLICY "Users can view suppliers" ON suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage suppliers" ON suppliers FOR ALL TO authenticated USING (true);

-- Categories policies
CREATE POLICY "Users can view categories" ON categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage categories" ON categories FOR ALL TO authenticated USING (true);

-- Products policies
CREATE POLICY "Users can view products" ON products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage products" ON products FOR ALL TO authenticated USING (true);

-- Sales policies
CREATE POLICY "Users can view sales" ON sales FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create sales" ON sales FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update sales" ON sales FOR UPDATE TO authenticated USING (true);

-- Sale items policies
CREATE POLICY "Users can view sale items" ON sale_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage sale items" ON sale_items FOR ALL TO authenticated USING (true);

-- Customer credits policies
CREATE POLICY "Users can view customer credits" ON customer_credits FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage customer credits" ON customer_credits FOR ALL TO authenticated USING (true);

-- Credit transactions policies
CREATE POLICY "Users can view credit transactions" ON credit_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create credit transactions" ON credit_transactions FOR INSERT TO authenticated WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_customer ON credit_transactions(customer_id);