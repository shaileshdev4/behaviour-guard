import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'BehaviorGuard | Secure Banking',
  description: 'Continuous behavioral authentication',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}