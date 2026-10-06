import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Team Kudos Board',
  description: 'A shared space to recognize the good work happening across your team.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
