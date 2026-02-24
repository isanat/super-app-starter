import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password, phone, role, churchName, instruments, vocals } = body

    // Validação básica
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Nome, email e senha são obrigatórios" },
        { status: 400 }
      )
    }

    // Verificar se o email já existe
    const existingUser = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "Este email já está cadastrado" },
        { status: 400 }
      )
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 12)

    // Criar usuário e igreja (se for diretor)
    let church = null
    let user = null

    if (role === "DIRECTOR" && churchName) {
      // Criar usuário diretor
      user = await db.user.create({
        data: {
          name,
          email: email.toLowerCase(),
          password: hashedPassword,
          phone: phone || null,
          role: "DIRECTOR",
        },
      })

      // Criar igreja
      const slug = churchName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
      
      const uniqueSlug = `${slug}-${Date.now().toString(36)}`

      church = await db.church.create({
        data: {
          name: churchName,
          slug: uniqueSlug,
          adminId: user.id,
        },
      })

      // Atualizar usuário com churchId
      await db.user.update({
        where: { id: user.id },
        data: { churchId: church.id },
      })

      user = await db.user.findUnique({
        where: { id: user.id },
      })
    } else {
      // Criar músico/cantor
      user = await db.user.create({
        data: {
          name,
          email: email.toLowerCase(),
          password: hashedPassword,
          phone: phone || null,
          role: role || "MUSICIAN",
          weeklyAvailability: JSON.stringify({
            sabado_manha: true,
            sabado_tarde: true,
            sabado_noite: true,
          }),
        },
      })

      // Criar perfil do músico
      await db.musicianProfile.create({
        data: {
          userId: user.id,
          instruments: instruments ? JSON.stringify(instruments) : "[]",
          vocals: vocals ? JSON.stringify(vocals) : null,
        },
      })
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user!.id,
        name: user!.name,
        email: user!.email,
        role: user!.role,
      },
      church: church ? { id: church.id, name: church.name } : null,
    })
  } catch (error) {
    console.error("Erro ao registrar:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
