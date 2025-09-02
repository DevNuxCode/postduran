'use client'

import { Sidebar } from './Sidebar'
import { Toaster } from 'react-hot-toast'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <main className="ml-64 transition-all duration-300">
        <div className="p-6">
          {children}
        </div>
      </main>
      <Toaster position="top-right" />
    </div>
  )
}