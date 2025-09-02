'use client'

import { useAuth } from '@/contexts/AuthContext'
import { DashboardLayout } from '@/components/Layout/DashboardLayout'
import { CreditsPage } from '@/components/Credits/CreditsPage'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function Credits() {
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
      <CreditsPage />
    </DashboardLayout>
  )
}