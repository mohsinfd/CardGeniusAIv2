import { Inter } from 'next/font/google'
import './globals.css'
import { FC, ReactNode } from 'react'

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
})

interface RootLayoutProps {
  children: ReactNode
}

const RootLayout: FC<RootLayoutProps> = ({ children }) => {
  return (
    <html lang="en" className={inter.className}>
      <body>
        {children}
      </body>
    </html>
  )
}

export default RootLayout 