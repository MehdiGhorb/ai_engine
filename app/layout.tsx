import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Gaming Character Simulator - AI Powered',
  description: 'Transform any image into a fully interactive gaming character with AI-powered motion generation',
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
