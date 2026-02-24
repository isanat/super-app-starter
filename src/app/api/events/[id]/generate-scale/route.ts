import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

// POST - Gerar escala automática baseada na disponibilidade
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.churchId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    if (session.user.role !== "DIRECTOR" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Apenas diretores podem gerar escala" }, { status: 403 })
    }

    const { id } = await params

    // Buscar evento
    const event = await db.event.findFirst({
      where: { id, churchId: session.user.churchId }
    })

    if (!event) {
      return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 })
    }

    const eventDate = new Date(event.date)
    const dayOfWeek = eventDate.getDay() // 0 = domingo, 6 = sábado
    const hour = eventDate.getHours()

    // Determinar período do dia
    let period = ""
    if (dayOfWeek === 6) { // Sábado
      if (hour >= 8 && hour < 12) period = "sabado_manha"
      else if (hour >= 12 && hour < 18) period = "sabado_tarde"
      else period = "sabado_noite"
    } else if (dayOfWeek === 3) { // Quarta
      if (hour >= 18) period = "quarta_noite"
      else period = "quarta_tarde"
    } else {
      period = "outro"
    }

    console.log(`📅 Evento: ${event.title}, Data: ${eventDate.toLocaleDateString('pt-BR')}, Período: ${period}`)

    // Buscar todos os músicos da igreja
    const musicians = await db.user.findMany({
      where: {
        churchId: session.user.churchId,
        isActive: true,
        isBlocked: false,
        role: { in: ["MUSICIAN", "SINGER", "INSTRUMENTALIST"] }
      },
      include: {
        profile: true
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

    // Separar por função
    const singers = availableMusicians.filter(m => 
      m.role === "SINGER" || 
      (m.profile?.vocals && JSON.parse(m.profile.vocals).length > 0)
    )

    const instrumentalists = availableMusicians.filter(m => 
      m.role === "INSTRUMENTALIST" || 
      m.role === "MUSICIAN" ||
      (m.profile?.instruments && JSON.parse(m.profile.instruments).length > 0)
    )

    // Ordenar por taxa de participação (menos penalizações primeiro)
    const sortByReliability = (a: any, b: any) => {
      const aScore = (a.profile?.totalEvents || 0) - (a.penaltyPoints || 0)
      const bScore = (b.profile?.totalEvents || 0) - (b.penaltyPoints || 0)
      return bScore - aScore
    }

    singers.sort(sortByReliability)
    instrumentalists.sort(sortByReliability)

    // Sugerir escala
    const suggestedScale = {
      singers: singers.slice(0, 4).map(s => ({
        userId: s.id,
        name: s.name,
        email: s.email,
        phone: s.phone,
        vocals: s.profile?.vocals ? JSON.parse(s.profile.vocals) : [],
        penaltyPoints: s.penaltyPoints,
        reliability: (s.profile?.totalEvents || 0) - (s.penaltyPoints || 0)
      })),
      instrumentalists: instrumentalists.slice(0, 6).map(i => ({
        userId: i.id,
        name: i.name,
        email: i.email,
        phone: i.phone,
        instruments: i.profile?.instruments ? JSON.parse(i.profile.instruments) : [],
        penaltyPoints: i.penaltyPoints,
        reliability: (i.profile?.totalEvents || 0) - (i.penaltyPoints || 0)
      })),
      period,
      dayName: ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"][dayOfWeek]
    }

    console.log(`✅ Escala sugerida: ${suggestedScale.singers.length} cantores, ${suggestedScale.instrumentalists.length} instrumentistas`)

    return NextResponse.json({
      success: true,
      suggestedScale,
      totalAvailable: availableMusicians.length,
      totalMusicians: musicians.length,
      unavailableCount: musicians.length - availableMusicians.length
    })
  } catch (error) {
    console.error("Erro ao gerar escala:", error)
    return NextResponse.json({ error: "Erro ao gerar escala" }, { status: 500 })
  }
}
