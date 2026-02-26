import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

// GET - Listar eventos
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.churchId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const status = searchParams.get("status")

    const where: any = {
      churchId: session.user.churchId,
    }

    if (startDate || endDate) {
      where.date = {}
      if (startDate) where.date.gte = new Date(startDate)
      if (endDate) where.date.lte = new Date(endDate)
    }

    if (status) {
      where.status = status
    }

    const events = await db.event.findMany({
      where,
      include: {
        EventInvitation: {
          include: {
            User: {
              select: {
                id: true,
                name: true,
                phone: true,
                penaltyPoints: true,
                MusicianProfile: {
                  select: {
                    instruments: true,
                    vocals: true,
                  }
                }
              }
            }
          }
        },
        User: {
          select: { id: true, name: true }
        }
      },
      orderBy: { date: "asc" }
    })

    return NextResponse.json({ events })
  } catch (error) {
    console.error("Erro ao buscar eventos:", error)
    return NextResponse.json(
      { error: "Erro ao buscar eventos" },
      { status: 500 }
    )
  }
}

// POST - Criar evento
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.churchId || session.user.role !== "DIRECTOR") {
      return NextResponse.json({ error: "Apenas diretores podem criar eventos" }, { status: 401 })
    }

    const body = await request.json()
    const { 
      title, 
      description, 
      type, 
      date, 
      endTime, 
      location, 
      notes,
      autoSuggest // Se true, retorna músicos sugeridos ao invés de criar
    } = body

    if (!title || !type || !date) {
      return NextResponse.json(
        { error: "Título, tipo e data são obrigatórios" },
        { status: 400 }
      )
    }

    // Se autoSuggest, apenas retorna sugestões de músicos
    if (autoSuggest) {
      const eventDate = new Date(date)
      const dayOfWeek = eventDate.getDay() // 6 = sábado
      
      // Mapear dia para período
      const hour = eventDate.getHours()
      let period = "sabado_manha"
      if (hour >= 12 && hour < 18) period = "sabado_tarde"
      if (hour >= 18) period = "sabado_noite"

      // Buscar músicos disponíveis
      const musicians = await db.user.findMany({
        where: {
          churchId: session.user.churchId,
          isActive: true,
          isBlocked: false,
          role: { in: ["MUSICIAN", "SINGER", "INSTRUMENTALIST"] }
        },
        include: {
          MusicianProfile: true
        }
      })

      // Filtrar por disponibilidade
      const availableMusicians = musicians.filter(m => {
        if (!m.weeklyAvailability) return true
        try {
          const availability = JSON.parse(m.weeklyAvailability)
          return availability[period] !== false
        } catch {
          return true
        }
      })

      // Verificar se já têm eventos no mesmo horário
      const eventStart = new Date(date)
      const eventEnd = endTime ? new Date(endTime) : new Date(eventStart.getTime() + 2 * 60 * 60 * 1000)

      const musiciansWithConflicts = await Promise.all(
        availableMusicians.map(async (m) => {
          const conflicts = await db.eventInvitation.findMany({
            where: {
              userId: m.id,
              status: "CONFIRMED",
              event: {
                date: { lte: eventEnd },
                endTime: { gte: eventStart }
              }
            },
            include: { event: { select: { title: true, date: true } } }
          })
          
          return {
            ...m,
            hasConflict: conflicts.length > 0,
            conflicts: conflicts.map(c => c.event)
          }
        })
      )

      // Ordenar por: sem conflito primeiro, depois por menos penalizações
      const suggested = musiciansWithConflicts
        .filter(m => !m.hasConflict)
        .sort((a, b) => a.penaltyPoints - b.penaltyPoints)

      return NextResponse.json({
        suggestedMusicians: suggested.map(m => ({
          id: m.id,
          name: m.name,
          phone: m.phone,
          instruments: m.MusicianProfile?.instruments ? JSON.parse(m.MusicianProfile.instruments) : [],
          vocals: m.MusicianProfile?.vocals ? JSON.parse(m.MusicianProfile.vocals) : [],
          penaltyPoints: m.penaltyPoints,
          totalEvents: m.MusicianProfile?.totalEvents || 0,
        })),
        unavailableMusicians: musiciansWithConflicts
          .filter(m => m.hasConflict)
          .map(m => ({
            id: m.id,
            name: m.name,
            conflicts: m.conflicts
          }))
      })
    }

    // Criar evento
    const event = await db.event.create({
      data: {
        title,
        description,
        type,
        date: new Date(date),
        endTime: endTime ? new Date(endTime) : null,
        location,
        notes,
        churchId: session.user.churchId,
        createdById: session.user.id,
        status: "DRAFT",
      },
    })

    return NextResponse.json({ event })
  } catch (error) {
    console.error("Erro ao criar evento:", error)
    return NextResponse.json(
      { error: "Erro ao criar evento" },
      { status: 500 }
    )
  }
}
