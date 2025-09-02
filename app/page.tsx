'use client'

import { useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { LoginPage } from '@/components/Auth/LoginPage'
import { DashboardLayout } from '@/components/Layout/DashboardLayout'
import { useRouter } from 'next/navigation'

export default function Home() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user && !loading) {
      router.push('/dashboard')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return <LoginPage />
  }

  return null
}