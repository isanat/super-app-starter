import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

// GET - Sugerir músicos baseado em data/hora e tipo de evento
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.churchId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const dateTimeStr = searchParams.get("dateTime")
    const eventType = searchParams.get("eventType")

    if (!dateTimeStr) {
      return NextResponse.json({ error: "Data e hora são obrigatórias" }, { status: 400 })
    }

    const eventDate = new Date(dateTimeStr)
    const dayOfWeek = eventDate.getDay() // 0 = domingo, 6 = sábado
    const hour = eventDate.getHours()

    // Determinar período do dia baseado no tipo de evento e horário
    let period = ""
    
    // Mapeamento específico para eventos IASD
    if (eventType === "SABBATH_SCHOOL") {
      period = "sabado_manha"
    } else if (eventType === "DIVINE_SERVICE") {
      period = "sabado_manha"
    } else if (eventType === "SABBATH_AFTERNOON") {
      period = "sabado_tarde"
    } else if (eventType === "WEDNESDAY_SERVICE") {
      period = "quarta_noite"
    } else {
      // Lógica genérica baseada no dia/hora
      if (dayOfWeek === 6) { // Sábado
        if (hour >= 8 && hour < 12) period = "sabado_manha"
        else if (hour >= 12 && hour < 18) period = "sabado_tarde"
        else period = "sabado_noite"
      } else if (dayOfWeek === 3) { // Quarta
        if (hour >= 18) period = "quarta_noite"
        else period = "quarta_tarde"
      } else {
        period = "outros"
      }
    }

    console.log(`📅 Sugestão: ${eventType}, Data: ${eventDate.toLocaleDateString('pt-BR')}, Período: ${period}`)

    // Buscar todos os músicos da igreja
    const musicians = await db.user.findMany({
      where: {
        churchId: session.user.churchId,
        isActive: true,
        isBlocked: false,
        role: { in: ["MUSICIAN", "SINGER", "INSTRUMENTALIST"] }
      },
      include: {
        musicianProfile: true
      }
    })

    // Filtrar por disponibilidade
    const availableMusicians = musicians.filter(m => {
      if (!m.weeklyAvailability) return true // Se não configurou, assume disponível
      
      try {
        const availability = JSON.parse(m.weeklyAvailability)
        return availability[period] !== false // Disponível se não marcou como indisponível
      } catch {
        return true
      }
    })

    // Ordenar por confiabilidade (mais eventos, menos penalizações)
    const sortByReliability = (a: any, b: any) => {
      const aScore = (a.musicianProfile?.totalEvents || 0) - (a.penaltyPoints || 0)
      const bScore = (b.musicianProfile?.totalEvents || 0) - (b.penaltyPoints || 0)
      return bScore - aScore
    }

    availableMusicians.sort(sortByReliability)

    // Sugerir músicos (máximo 8)
    const suggestions = availableMusicians.slice(0, 8).map(m => ({
      userId: m.id,
      name: m.name,
      email: m.email,
      instruments: m.musicianProfile?.instruments ? JSON.parse(m.musicianProfile.instruments) : [],
      vocals: m.musicianProfile?.vocals ? JSON.parse(m.musicianProfile.vocals) : [],
      penaltyPoints: m.penaltyPoints,
      reliability: (m.musicianProfile?.totalEvents || 0) - (m.penaltyPoints || 0)
    }))

    console.log(`✅ ${suggestions.length} músicos sugeridos de ${musicians.length} total`)

    return NextResponse.json({
      suggestions,
      period,
      dayName: ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"][dayOfWeek],
      totalAvailable: availableMusicians.length,
      totalMusicians: musicians.length
    })
  } catch (error) {
    console.error("Erro ao sugerir músicos:", error)
    return NextResponse.json({ error: "Erro ao sugerir músicos" }, { status: 500 })
  }
}
