import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FactoHR Automation',
  description: 'Automated attendance management for FactoHR',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  )
}