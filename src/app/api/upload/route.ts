import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { writeFile, mkdir } from "fs/promises"
import path from "path"

// POST - Upload de imagem
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File
    const type = formData.get("type") as string // "avatar", "group", "event"

    if (!file) {
      return NextResponse.json({ error: "Arquivo não enviado" }, { status: 400 })
    }

    // Validar tipo de arquivo
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Tipo de arquivo não permitido" }, { status: 400 })
    }

    // Validar tamanho (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Arquivo muito grande (máx 5MB)" }, { status: 400 })
    }

    // Criar diretório se não existir
    const uploadDir = path.join(process.cwd(), "public", "uploads", type || "general")
    await mkdir(uploadDir, { recursive: true })

    // Gerar nome único
    const ext = file.name.split(".").pop()
    const fileName = `${session.user.id}_${Date.now()}.${ext}`
    const filePath = path.join(uploadDir, fileName)

    // Salvar arquivo
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // URL pública
    const publicUrl = `/uploads/${type || "general"}/${fileName}`

    // Se for avatar, atualizar usuário
    if (type === "avatar") {
      await db.user.update({
        where: { id: session.user.id },
        data: { avatar: publicUrl }
      })
    }

    return NextResponse.json({ 
      success: true, 
      url: publicUrl 
    })
  } catch (error) {
    console.error("Erro no upload:", error)
    return NextResponse.json({ error: "Erro no upload" }, { status: 500 })
  }
}
