import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Providers } from "@/lib/providers"
import { PWARegister } from "@/components/pwa-register"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#059669",
}

export const metadata: Metadata = {
  title: "Louvor Conectado - Sistema de Escala de Músicos",
  description: "Sistema completo para gestão de músicos e agendamento de eventos em igrejas. Organize escalas, confirme presenças e gerencie seu ministério de louvor.",
  authors: [{ name: "Louvor Conectado" }],
  keywords: ["louvor", "músicos", "igreja", "agendamento", "escala", "ministério", "adventista"],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Louvor Conectado",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "Louvor Conectado",
    title: "Louvor Conectado - Sistema de Escala de Músicos",
    description: "Sistema completo para gestão de músicos e agendamento de eventos em igrejas.",
    images: [
      {
        url: "/icons/icon-512.png",
        width: 512,
        height: 512,
        alt: "Louvor Conectado",
      },
    ],
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: ["/icons/icon-192.png"],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {/* PWA Meta Tags */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="Louvor Conectado" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Louvor" />
        <meta name="msapplication-TileColor" content="#059669" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="msapplication-navbutton-color" content="#059669" />
        
        {/* Apple Touch Icons */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        
        {/* Favicon */}
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icons/icon-512.png" />
        
        {/* PWA Manifest */}
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>
          <PWARegister />
          {children}
        </Providers>
      </body>
    </html>
  )
}
