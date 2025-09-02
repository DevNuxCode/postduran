'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { StatsCard } from './StatsCard'
import { DollarSign, ShoppingCart, Users, Package, TrendingUp } from 'lucide-react'
import { format } from 'date-fns'

interface DashboardStats {
  todaySales: number
  todayOrders: number
  totalCustomers: number
  lowStockProducts: number
  totalRevenue: number
}

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    todaySales: 0,
    todayOrders: 0,
    totalCustomers: 0,
    lowStockProducts: 0,
    totalRevenue: 0
  })
  const [recentSales, setRecentSales] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const today = new Date()
      const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString()
      const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString()

      // Fetch today's sales
      const { data: todaySalesData } = await supabase
        .from('sales')
        .select('total_amount')
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay)
        .eq('status', 'completed')

      const todaySales = todaySalesData?.reduce((sum, sale) => sum + sale.total_amount, 0) || 0
      const todayOrders = todaySalesData?.length || 0

      // Fetch total customers
      const { count: customerCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })

      // Fetch low stock products
      const { count: lowStockCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .lt('stock_quantity', 10)

      // Fetch total revenue (last 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      
      const { data: revenueData } = await supabase
        .from('sales')
        .select('total_amount')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .eq('status', 'completed')

      const totalRevenue = revenueData?.reduce((sum, sale) => sum + sale.total_amount, 0) || 0

      // Fetch recent sales
      const { data: recentSalesData } = await supabase
        .from('sales')
        .select(`
          *,
          customers(name),
          users_profile(full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(5)

      setStats({
        todaySales,
        todayOrders,
        totalCustomers: customerCount || 0,
        lowStockProducts: lowStockCount || 0,
        totalRevenue
      })
      setRecentSales(recentSalesData || [])
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Panel de Control</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
              <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-20"></div>
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
        <h1 className="text-3xl font-bold text-gray-900">Panel de Control</h1>
        <p className="text-gray-600">{format(new Date(), 'EEEE, d MMMM yyyy')}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Ventas de Hoy"
          value={`$${stats.todaySales.toFixed(2)}`}
          change="+12% vs ayer"
          changeType="positive"
          icon={<DollarSign className="w-6 h-6 text-blue-600" />}
        />
        <StatsCard
          title="Órdenes de Hoy"
          value={stats.todayOrders}
          change="+5% vs ayer"
          changeType="positive"
          icon={<ShoppingCart className="w-6 h-6 text-blue-600" />}
        />
        <StatsCard
          title="Total Clientes"
          value={stats.totalCustomers}
          icon={<Users className="w-6 h-6 text-blue-600" />}
        />
        <StatsCard
          title="Stock Bajo"
          value={stats.lowStockProducts}
          change="Requiere atención"
          changeType="negative"
          icon={<Package className="w-6 h-6 text-blue-600" />}
        />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sales */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Ventas Recientes</h3>
          <div className="space-y-4">
            {recentSales.map((sale) => (
              <div key={sale.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">
                    {sale.customers?.name || 'Cliente General'}
                  </p>
                  <p className="text-sm text-gray-600">
                    {format(new Date(sale.created_at), 'HH:mm')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">${sale.total_amount.toFixed(2)}</p>
                  <p className="text-sm text-gray-600 capitalize">{sale.payment_method}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Acciones Rápidas</h3>
          <div className="grid grid-cols-2 gap-4">
            <button className="p-4 bg-blue-50 rounded-lg text-center hover:bg-blue-100 transition-colors">
              <ShoppingCart className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <span className="text-sm font-medium text-blue-700">Nueva Venta</span>
            </button>
            <button className="p-4 bg-green-50 rounded-lg text-center hover:bg-green-100 transition-colors">
              <Package className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <span className="text-sm font-medium text-green-700">Agregar Producto</span>
            </button>
            <button className="p-4 bg-purple-50 rounded-lg text-center hover:bg-purple-100 transition-colors">
              <Users className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <span className="text-sm font-medium text-purple-700">Nuevo Cliente</span>
            </button>
            <button className="p-4 bg-orange-50 rounded-lg text-center hover:bg-orange-100 transition-colors">
              <TrendingUp className="w-8 h-8 text-orange-600 mx-auto mb-2" />
              <span className="text-sm font-medium text-orange-700">Ver Reportes</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}