'use client'

import { useAuth } from '@/contexts/AuthContext'
import { DashboardLayout } from '@/components/Layout/DashboardLayout'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function Suppliers() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/')
    }
  }, [user, loading, router])

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Gestión de Proveedores</h1>
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-gray-600">Próximamente: Gestión completa de proveedores</p>
        </div>
      </div>
    </DashboardLayout>
  )
}