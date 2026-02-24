import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Providers } from "@/lib/providers"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

export const metadata: Metadata = {
  title: "Louvor Conectado - Sistema de Escala de Músicos",
  description: "Sistema completo para gestão de músicos e agendamento de eventos em igrejas. Organize escalas, confirme presenças e gerencie seu ministério de louvor.",
  authors: [{ name: "Louvor Conectado" }],
  keywords: ["louvor", "músicos", "igreja", "agendamento", "escala", "ministério", "adventista"],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
