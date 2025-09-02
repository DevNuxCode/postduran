'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Search, ShoppingCart, Plus, Minus, Trash2, Scan, Package } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { cn } from '@/lib/utils'

interface Product {
  id: string
  name: string
  selling_price: number
  stock_quantity: number
  barcode?: string
}

interface CartItem extends Product {
  quantity: number
  total: number
}

interface Customer {
  id: string
  name: string
  current_credit: number
}

export function SalesPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'credit'>('cash')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchProducts()
    fetchCustomers()
  }, [])

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (error) {
      console.error('Error fetching products:', error)
    } else {
      setProducts(data || [])
    }
  }

  const fetchCustomers = async () => {
    const { data, error } = await supabase
      .from('customers')
      .select('id, name, current_credit')
      .order('name')

    if (error) {
      console.error('Error fetching customers:', error)
    } else {
      setCustomers(data || [])
    }
  }

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.barcode?.includes(searchTerm)
  )

  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.id === product.id)
    
    if (existingItem) {
      if (existingItem.quantity < product.stock_quantity) {
        setCart(cart.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.selling_price }
            : item
        ))
      } else {
        toast.error('Stock insuficiente')
      }
    } else {
      if (product.stock_quantity > 0) {
        setCart([...cart, {
          ...product,
          quantity: 1,
          total: product.selling_price
        }])
      } else {
        toast.error('Producto sin stock')
      }
    }
  }

  const updateQuantity = (productId: string, newQuantity: number) => {
    const product = products.find(p => p.id === productId)
    if (!product) return

    if (newQuantity <= 0) {
      removeFromCart(productId)
      return
    }

    if (newQuantity > product.stock_quantity) {
      toast.error('Stock insuficiente')
      return
    }

    setCart(cart.map(item =>
      item.id === productId
        ? { ...item, quantity: newQuantity, total: newQuantity * item.selling_price }
        : item
    ))
  }

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.id !== productId))
  }

  const getCartTotal = () => {
    return cart.reduce((sum, item) => sum + item.total, 0)
  }

  const processSale = async () => {
    if (cart.length === 0) {
      toast.error('El carrito está vacío')
      return
    }

    if (paymentMethod === 'credit' && !selectedCustomer) {
      toast.error('Selecciona un cliente para pago a crédito')
      return
    }

    setLoading(true)

    try {
      const total = getCartTotal()
      const taxAmount = total * 0.16 // 16% tax

      // Create sale
      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .insert({
          customer_id: selectedCustomer?.id,
          total_amount: total + taxAmount,
          tax_amount: taxAmount,
          payment_method: paymentMethod,
          status: 'completed'
        })
        .select()
        .single()

      if (saleError) throw saleError

      // Create sale items
      const saleItems = cart.map(item => ({
        sale_id: saleData.id,
        product_id: item.id,
        quantity: item.quantity,
        unit_price: item.selling_price,
        total_price: item.total
      }))

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItems)

      if (itemsError) throw itemsError

      // Update product stock
      for (const item of cart) {
        const { error: stockError } = await supabase
          .from('products')
          .update({ 
            stock_quantity: item.stock_quantity - item.quantity 
          })
          .eq('id', item.id)

        if (stockError) throw stockError
      }

      // Handle credit payment
      if (paymentMethod === 'credit' && selectedCustomer) {
        const newCreditBalance = selectedCustomer.current_credit + total + taxAmount

        await supabase
          .from('customers')
          .update({ current_credit: newCreditBalance })
          .eq('id', selectedCustomer.id)

        await supabase
          .from('credit_transactions')
          .insert({
            customer_id: selectedCustomer.id,
            sale_id: saleData.id,
            transaction_type: 'credit',
            amount: total + taxAmount,
            balance_after: newCreditBalance,
            description: `Venta #${saleData.id.slice(0, 8)}`
          })
      }

      toast.success('Venta procesada exitosamente')
      setCart([])
      setSelectedCustomer(null)
      setPaymentMethod('cash')
      fetchProducts() // Refresh to get updated stock

    } catch (error) {
      console.error('Error processing sale:', error)
      toast.error('Error al procesar la venta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-full flex">
      {/* Products Section */}
      <div className="flex-1 p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Punto de Venta</h1>
          
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar productos por nombre o código de barras..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              onClick={() => addToCart(product)}
              className="bg-white rounded-lg border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="h-32 bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
                <Package className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="font-semibold text-gray-900 text-sm mb-1 truncate">{product.name}</h3>
              <p className="text-lg font-bold text-blue-600">${product.selling_price.toFixed(2)}</p>
              <p className="text-xs text-gray-500">Stock: {product.stock_quantity}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Cart Section */}
      <div className="w-96 bg-white border-l border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Carrito</h2>
          <ShoppingCart className="w-6 h-6 text-gray-600" />
        </div>

        {/* Customer Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cliente (Opcional)
          </label>
          <select
            value={selectedCustomer?.id || ''}
            onChange={(e) => {
              const customer = customers.find(c => c.id === e.target.value)
              setSelectedCustomer(customer || null)
            }}
            className="w-full p-2 border border-gray-300 rounded-lg"
          >
            <option value="">Cliente General</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name} {customer.current_credit > 0 && `(Crédito: $${customer.current_credit.toFixed(2)})`}
              </option>
            ))}
          </select>
        </div>

        {/* Cart Items */}
        <div className="flex-1 mb-6">
          {cart.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Carrito vacío</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 text-sm">{item.name}</h4>
                    <p className="text-sm text-gray-600">${item.selling_price.toFixed(2)} c/u</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-7 h-7 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-8 text-center font-medium">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-7 h-7 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="w-7 h-7 bg-red-100 rounded-full flex items-center justify-center hover:bg-red-200 ml-2"
                    >
                      <Trash2 className="w-3 h-3 text-red-600" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payment Method */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Método de Pago
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'cash', label: 'Efectivo' },
              { value: 'card', label: 'Tarjeta' },
              { value: 'credit', label: 'Crédito' }
            ].map((method) => (
              <button
                key={method.value}
                onClick={() => setPaymentMethod(method.value as any)}
                className={cn(
                  "p-2 text-sm font-medium rounded-lg border transition-colors",
                  paymentMethod === method.value
                    ? "bg-blue-50 border-blue-500 text-blue-700"
                    : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                )}
              >
                {method.label}
              </button>
            ))}
          </div>
        </div>

        {/* Total */}
        <div className="border-t border-gray-200 pt-4 mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600">Subtotal:</span>
            <span className="font-medium">${getCartTotal().toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600">IVA (16%):</span>
            <span className="font-medium">${(getCartTotal() * 0.16).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold">
            <span>Total:</span>
            <span>${(getCartTotal() * 1.16).toFixed(2)}</span>
          </div>
        </div>

        {/* Process Sale Button */}
        <button
          onClick={processSale}
          disabled={cart.length === 0 || loading}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Procesando...' : 'Procesar Venta'}
        </button>
      </div>
    </div>
  )
}