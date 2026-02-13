import type { Metadata } from 'next'
import './globals.css'
import Navigation from '@/components/Navigation'

export const metadata: Metadata = {
  title: 'Burning Plan Management',
  description: 'ระบบวางแผนจัดการเผา',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="th">
      <body>
        <Navigation />
        {children}
      </body>
    </html>
  )
}

