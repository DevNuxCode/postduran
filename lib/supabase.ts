import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'

export const supabase = createClientComponentClient()

// For server-side operations
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type Database = {
  public: {
    Tables: {
      stores: {
        Row: {
          id: string
          name: string
          address: string | null
          phone: string | null
          email: string | null
          tax_rate: number
          currency: string
          created_at: string
          updated_at: string
        }
      }
      users_profile: {
        Row: {
          id: string
          full_name: string | null
          role: 'admin' | 'employee'
          store_id: string | null
          phone: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
      }
      customers: {
        Row: {
          id: string
          name: string
          email: string | null
          phone: string | null
          address: string | null
          credit_limit: number
          current_credit: number
          store_id: string | null
          created_at: string
          updated_at: string
        }
      }
      products: {
        Row: {
          id: string
          name: string
          description: string | null
          barcode: string | null
          sku: string | null
          category_id: string | null
          supplier_id: string | null
          cost_price: number
          selling_price: number
          stock_quantity: number
          min_stock_level: number
          is_active: boolean
          store_id: string | null
          created_at: string
          updated_at: string
        }
      }
      sales: {
        Row: {
          id: string
          customer_id: string | null
          user_id: string | null
          store_id: string | null
          total_amount: number
          tax_amount: number
          discount_amount: number
          payment_method: 'cash' | 'card' | 'credit'
          status: 'pending' | 'completed' | 'cancelled'
          notes: string | null
          created_at: string
          updated_at: string
        }
      }
      sale_items: {
        Row: {
          id: string
          sale_id: string
          product_id: string | null
          quantity: number
          unit_price: number
          total_price: number
          created_at: string
        }
      }
    }
  }
}