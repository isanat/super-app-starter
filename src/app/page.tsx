"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { DirectorDashboard } from "@/components/dashboard/director-dashboard"
import { MusicianDashboard } from "@/components/dashboard/musician-dashboard"

export default function HomePage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    } else if (status === "authenticated") {
      // Músico sem igreja - redirecionar para página de entrada
      if (!session?.user?.churchId && session?.user?.role !== "DIRECTOR") {
        router.push("/entrar-igreja")
      }
    }
  }, [status, session, router])

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    )
  }

  if (status === "unauthenticated") {
    return null
  }

  // Músico sem igreja - mostrar loading enquanto redireciona
  if (!session?.user?.churchId && session?.user?.role !== "DIRECTOR") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    )
  }

  // Diretor vê dashboard do diretor
  if (session?.user?.role === "DIRECTOR") {
    return <DirectorDashboard />
  }

  // Músico vê dashboard do músico
  return <MusicianDashboard />
}
