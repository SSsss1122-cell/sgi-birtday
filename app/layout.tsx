import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Birthday Management System',
  description: 'Manage birthdays with Supabase',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}