import type { Metadata } from 'next'
import { Space_Grotesk, JetBrains_Mono } from 'next/font/google'
import { SolanaWalletProvider } from '@/components/providers/wallet-provider'
import './globals.css'

const spaceGrotesk = Space_Grotesk({
  variable: '--font-space-grotesk',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
})

const jetBrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'Sipzy | Watch-to-Trade Creator Economy',
  description: 'Trade creator tokens while watching content. Powered by Solana bonding curves and x402 micropayments.',
  keywords: ['Solana', 'Creator Economy', 'Bonding Curve', 'Web3', 'Trading', 'YouTube'],
  openGraph: {
    title: 'Sipzy | Watch-to-Trade Creator Economy',
    description: 'Trade creator tokens while watching content. Powered by Solana.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sipzy | Watch-to-Trade Creator Economy',
    description: 'Trade creator tokens while watching content. Powered by Solana.',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${spaceGrotesk.variable} ${jetBrainsMono.variable} font-sans antialiased bg-black text-white`}>
        <SolanaWalletProvider>
          {children}
        </SolanaWalletProvider>
      </body>
    </html>
  )
}
