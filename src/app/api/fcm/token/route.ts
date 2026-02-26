import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

/**
 * POST - Salvar token FCM do dispositivo
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { token, platform, deviceId } = body

    if (!token) {
      return NextResponse.json({ error: 'Token é obrigatório' }, { status: 400 })
    }

    // Verificar se o token já existe
    const existingToken = await db.fcmToken.findUnique({
      where: { token },
    })

    if (existingToken) {
      // Atualizar se existe
      await db.fcmToken.update({
        where: { token },
        data: {
          userId: session.user.id,
          platform: platform || existingToken.platform,
          deviceId: deviceId || existingToken.deviceId,
          isActive: true,
        },
      })
    } else {
      // Criar novo token
      await db.fcmToken.create({
        data: {
          userId: session.user.id,
          token,
          platform: platform || 'web',
          deviceId,
        },
      })
    }

    console.log('✅ Token FCM salvo:', session.user.id, platform)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao salvar token FCM:', error)
    return NextResponse.json({ error: 'Erro ao salvar token' }, { status: 500 })
  }
}

/**
 * DELETE - Remover token FCM (logout)
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json({ error: 'Token é obrigatório' }, { status: 400 })
    }

    await db.fcmToken.deleteMany({
      where: {
        token,
        userId: session.user.id,
      },
    })

    console.log('✅ Token FCM removido:', session.user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao remover token FCM:', error)
    return NextResponse.json({ error: 'Erro ao remover token' }, { status: 500 })
  }
}

/**
 * GET - Listar tokens do usuário
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const tokens = await db.fcmToken.findMany({
      where: {
        userId: session.user.id,
        isActive: true,
      },
      select: {
        id: true,
        platform: true,
        deviceId: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ tokens })
  } catch (error) {
    console.error('Erro ao listar tokens FCM:', error)
    return NextResponse.json({ error: 'Erro ao listar tokens' }, { status: 500 })
  }
}
