import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/components/theme-provider'
import { AuthProvider } from '@/context/AuthContext'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Aurage Admin Dashboard',
  description: 'E-commerce admin dashboard for aurage',
  generator: 'Aurage',
  icons: {
    icon: [
      { url: '/dashoard.png', media: 'dashoard.png' },
      { url: '/dashoard.png', media: 'dashoard.png' },
      { url: '/dashoard.png', type: 'dashoard.png' },
    ],
    apple: 'dashoard.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="theme-preference">
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}