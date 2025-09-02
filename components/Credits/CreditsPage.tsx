'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { CreditCard, Plus, Search, DollarSign, User } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'react-hot-toast'
import { cn } from '@/lib/utils'

interface Customer {
  id: string
  name: string
  current_credit: number
  credit_limit: number
  phone?: string
  email?: string
}

interface CreditTransaction {
  id: string
  transaction_type: string
  amount: number
  balance_after: number
  description?: string
  created_at: string
  customers: { name: string }
}

export function CreditsPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [transactions, setTransactions] = useState<CreditTransaction[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCustomers()
    fetchTransactions()
  }, [])

  const fetchCustomers = async () => {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .gt('current_credit', 0)
      .order('current_credit', { ascending: false })

    if (error) {
      console.error('Error fetching customers:', error)
    } else {
      setCustomers(data || [])
    }
  }

  const fetchTransactions = async () => {
    const { data, error } = await supabase
      .from('credit_transactions')
      .select(`
        *,
        customers(name)
      `)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Error fetching transactions:', error)
    } else {
      setTransactions(data || [])
    }
    setLoading(false)
  }

  const processPayment = async () => {
    if (!selectedCustomer || !paymentAmount) {
      toast.error('Completa todos los campos')
      return
    }

    const amount = parseFloat(paymentAmount)
    if (amount <= 0 || amount > selectedCustomer.current_credit) {
      toast.error('Monto inválido')
      return
    }

    try {
      const newBalance = selectedCustomer.current_credit - amount

      // Update customer credit
      const { error: updateError } = await supabase
        .from('customers')
        .update({ current_credit: newBalance })
        .eq('id', selectedCustomer.id)

      if (updateError) throw updateError

      // Create payment transaction
      const { error: transactionError } = await supabase
        .from('credit_transactions')
        .insert({
          customer_id: selectedCustomer.id,
          transaction_type: 'payment',
          amount: -amount,
          balance_after: newBalance,
          description: 'Pago de crédito'
        })

      if (transactionError) throw transactionError

      toast.success('Pago registrado exitosamente')
      setShowPaymentModal(false)
      setPaymentAmount('')
      setSelectedCustomer(null)
      fetchCustomers()
      fetchTransactions()

    } catch (error) {
      console.error('Error processing payment:', error)
      toast.error('Error al procesar el pago')
    }
  }

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone?.includes(searchTerm) ||
    customer.email?.includes(searchTerm)
  )

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg border p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
              <div className="h-6 bg-gray-200 rounded w-32 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-16"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Gestión de Créditos</h1>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar clientes con crédito..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Credits Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total en Créditos</p>
              <p className="text-2xl font-bold text-red-600">
                ${customers.reduce((sum, customer) => sum + customer.current_credit, 0).toFixed(2)}
              </p>
            </div>
            <CreditCard className="w-8 h-8 text-red-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Clientes con Crédito</p>
              <p className="text-2xl font-bold text-blue-600">{customers.length}</p>
            </div>
            <User className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Promedio por Cliente</p>
              <p className="text-2xl font-bold text-gray-900">
                ${customers.length > 0 ? (customers.reduce((sum, customer) => sum + customer.current_credit, 0) / customers.length).toFixed(2) : '0.00'}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-gray-600" />
          </div>
        </div>
      </div>

      {/* Customers with Credit */}
      <div className="bg-white rounded-lg border">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Clientes con Crédito Pendiente</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {filteredCustomers.map((customer) => (
            <div key={customer.id} className="p-6 flex items-center justify-between hover:bg-gray-50">
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">{customer.name}</h3>
                <p className="text-sm text-gray-600">
                  {customer.phone && `Teléfono: ${customer.phone}`}
                  {customer.email && ` • Email: ${customer.email}`}
                </p>
                <div className="mt-2 flex items-center space-x-4">
                  <span className="text-sm text-gray-600">
                    Límite: ${customer.credit_limit.toFixed(2)}
                  </span>
                  <span className="text-sm font-medium text-red-600">
                    Debe: ${customer.current_credit.toFixed(2)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedCustomer(customer)
                  setShowPaymentModal(true)
                }}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                Registrar Pago
              </button>
            </div>
          ))}
        </div>
        
        {filteredCustomers.length === 0 && (
          <div className="p-12 text-center">
            <CreditCard className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay créditos pendientes</h3>
            <p className="text-gray-600">Todos los clientes están al corriente</p>
          </div>
        )}
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-lg border">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Transacciones Recientes</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {transactions.slice(0, 10).map((transaction) => (
            <div key={transaction.id} className="p-6 flex items-center justify-between">
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">{transaction.customers.name}</h3>
                <p className="text-sm text-gray-600">{transaction.description}</p>
                <p className="text-xs text-gray-500">
                  {format(new Date(transaction.created_at), 'dd/MM/yyyy HH:mm')}
                </p>
              </div>
              <div className="text-right">
                <p className={cn(
                  "font-semibold",
                  transaction.transaction_type === 'payment' 
                    ? "text-green-600" 
                    : "text-red-600"
                )}>
                  {transaction.transaction_type === 'payment' ? '-' : '+'}
                  ${Math.abs(transaction.amount).toFixed(2)}
                </p>
                <p className="text-sm text-gray-600">
                  Saldo: ${transaction.balance_after.toFixed(2)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Registrar Pago de Crédito</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cliente
                </label>
                <p className="text-gray-900 font-medium">{selectedCustomer.name}</p>
                <p className="text-sm text-red-600">
                  Debe: ${selectedCustomer.current_credit.toFixed(2)}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monto del Pago
                </label>
                <input
                  type="number"
                  step="0.01"
                  max={selectedCustomer.current_credit}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => {
                    setShowPaymentModal(false)
                    setPaymentAmount('')
                    setSelectedCustomer(null)
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={processPayment}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Registrar Pago
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}