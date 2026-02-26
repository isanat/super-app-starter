import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

// Dias da semana válidos
const VALID_DAYS = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"]

// Períodos válidos
const VALID_PERIODS = ["manha", "tarde", "noite"]

// Slots de disponibilidade antigos (para compatibilidade)
const LEGACY_SLOTS = ["sabado_manha", "sabado_tarde", "sabado_noite", "quarta_tarde", "quarta_noite", "outros"]

// GET - Obter disponibilidade do usuário
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { weeklyAvailability: true }
    })

    // Disponibilidade padrão - estrutura aninhada por dia
    let availability: Record<string, Record<string, boolean>> = {}

    // Inicializar todos os dias com todos os períodos como false
    for (const day of VALID_DAYS) {
      availability[day] = {}
      for (const period of VALID_PERIODS) {
        availability[day][period] = false
      }
    }

    if (user?.weeklyAvailability) {
      try {
        const parsed = JSON.parse(user.weeklyAvailability)
        
        // Verificar se é a estrutura antiga (flat) ou nova (aninhada)
        const isNestedStructure = VALID_DAYS.some(day => 
          parsed[day] && typeof parsed[day] === 'object' && !Array.isArray(parsed[day])
        )
        
        if (isNestedStructure) {
          // Estrutura nova (aninhada por dia)
          for (const day of VALID_DAYS) {
            if (parsed[day] && typeof parsed[day] === 'object') {
              for (const period of VALID_PERIODS) {
                if (typeof parsed[day][period] === 'boolean') {
                  availability[day][period] = parsed[day][period]
                }
              }
            }
          }
        } else {
          // Estrutura antiga (flat) - migrar para nova
          for (const slot of LEGACY_SLOTS) {
            if (typeof parsed[slot] === 'boolean') {
              const [day, period] = slot.split('_')
              if (day && period && availability[day]) {
                availability[day][period] = parsed[slot]
              }
            }
          }
        }
      } catch {}
    }

    return NextResponse.json({ availability })
  } catch (error) {
    console.error("Erro ao buscar disponibilidade:", error)
    return NextResponse.json({ error: "Erro ao buscar disponibilidade" }, { status: 500 })
  }
}

// PUT - Atualizar disponibilidade semanal
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { availability } = body

    // Validar e filtrar estrutura aninhada (dia -> período -> boolean)
    const filteredAvailability: Record<string, Record<string, boolean>> = {}
    
    for (const day of VALID_DAYS) {
      if (availability[day] && typeof availability[day] === 'object') {
        filteredAvailability[day] = {}
        for (const period of VALID_PERIODS) {
          if (typeof availability[day][period] === 'boolean') {
            filteredAvailability[day][period] = availability[day][period]
          } else {
            filteredAvailability[day][period] = false
          }
        }
      }
    }

    await db.user.update({
      where: { id: session.user.id },
      data: {
        weeklyAvailability: JSON.stringify(filteredAvailability)
      }
    })

    console.log("✅ Disponibilidade atualizada:", session.user.id)

    return NextResponse.json({ 
      success: true, 
      availability: filteredAvailability 
    })
  } catch (error) {
    console.error("Erro ao atualizar disponibilidade:", error)
    return NextResponse.json({ error: "Erro ao atualizar disponibilidade" }, { status: 500 })
  }
}
