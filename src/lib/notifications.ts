import { db } from '@/lib/db'
import { sendMulticastPushNotification } from './firebase-admin'

export interface NotificationPayload {
  userId: string
  title: string
  message: string
  type: 'EVENT_INVITE' | 'EVENT_REMINDER' | 'CONFIRMATION' | 'CANCELLATION' | 'PENALTY' | 'SCALE_PUBLISHED' | 'SYSTEM'
  data?: Record<string, string>
  eventId?: string
}

/**
 * Criar notificação no banco e enviar push
 */
export async function createNotification(payload: NotificationPayload) {
  try {
    // 1. Criar notificação no banco
    const notification = await db.notification.create({
      data: {
        userId: payload.userId,
        title: payload.title,
        message: payload.message,
        type: payload.type,
        data: payload.data ? JSON.stringify(payload.data) : null,
        sentViaApp: true,
      },
    })

    // 2. Buscar tokens FCM do usuário
    const fcmTokens = await db.fcmToken.findMany({
      where: {
        userId: payload.userId,
        isActive: true,
      },
      select: { token: true },
    })

    // 3. Enviar push notification
    if (fcmTokens.length > 0) {
      const tokens = fcmTokens.map(t => t.token)
      const clickAction = payload.eventId ? `/eventos/${payload.eventId}` : '/'
      
      const result = await sendMulticastPushNotification(tokens, {
        title: payload.title,
        body: payload.message,
        click_action: clickAction,
        data: {
          notificationId: notification.id,
          type: payload.type,
          eventId: payload.eventId || '',
          ...payload.data,
        },
      })

      // 4. Remover tokens inválidos
      if (result.invalidTokens && result.invalidTokens.length > 0) {
        await db.fcmToken.deleteMany({
          where: {
            token: { in: result.invalidTokens },
          },
        })
        console.log(`🗑️ ${result.invalidTokens.length} tokens inválidos removidos`)
      }
    }

    return notification
  } catch (error) {
    console.error('Erro ao criar notificação:', error)
    throw error
  }
}

/**
 * Notificar múltiplos usuários
 */
export async function notifyUsers(
  userIds: string[],
  payload: Omit<NotificationPayload, 'userId'>
) {
  const results = await Promise.allSettled(
    userIds.map(userId => createNotification({ ...payload, userId }))
  )

  const successful = results.filter(r => r.status === 'fulfilled').length
  const failed = results.filter(r => r.status === 'rejected').length

  console.log(`📬 Notificações: ${successful} enviadas, ${failed} falhas`)

  return { successful, failed }
}

/**
 * Notificar músicos sobre novo convite
 */
export async function notifyEventInvite(
  userIds: string[],
  eventTitle: string,
  eventDate: string,
  eventId: string
) {
  return notifyUsers(userIds, {
    title: '🎵 Novo Convite!',
    message: `Você foi convidado para ${eventTitle} em ${eventDate}`,
    type: 'EVENT_INVITE',
    eventId,
    data: { eventTitle, eventDate },
  })
}

/**
 * Notificar sobre confirmação
 */
export async function notifyConfirmation(
  directorId: string,
  musicianName: string,
  eventTitle: string,
  eventId: string
) {
  return createNotification({
    userId: directorId,
    title: '✅ Confirmação',
    message: `${musicianName} confirmou presença em ${eventTitle}`,
    type: 'CONFIRMATION',
    eventId,
    data: { musicianName, eventTitle },
  })
}

/**
 * Notificar sobre cancelamento
 */
export async function notifyCancellation(
  directorId: string,
  musicianName: string,
  eventTitle: string,
  eventId: string,
  reason?: string
) {
  return createNotification({
    userId: directorId,
    title: '❌ Cancelamento',
    message: `${musicianName} cancelou ${eventTitle}${reason ? `: ${reason}` : ''}`,
    type: 'CANCELLATION',
    eventId,
    data: { musicianName, eventTitle, reason: reason || '' },
  })
}

/**
 * Notificar sobre penalidade
 */
export async function notifyPenalty(
  userId: string,
  points: number,
  totalPoints: number,
  eventTitle: string
) {
  const isBlocked = totalPoints >= 9
  
  return createNotification({
    userId,
    title: isBlocked ? '🚫 Bloqueado' : '⚠️ Penalidade',
    message: isBlocked
      ? `Você foi bloqueado por atingir ${totalPoints} pontos. Bloqueio de 30 dias.`
      : `+${points} pontos de penalidade por cancelar ${eventTitle}. Total: ${totalPoints}/9`,
    type: 'PENALTY',
    data: { points: String(points), totalPoints: String(totalPoints) },
  })
}

/**
 * Lembrete de evento
 */
export async function notifyEventReminder(
  userId: string,
  eventTitle: string,
  eventDate: string,
  eventId: string
) {
  return createNotification({
    userId,
    title: '📅 Lembrete',
    message: `${eventTitle} é amanhã! Não se esqueça.`,
    type: 'EVENT_REMINDER',
    eventId,
    data: { eventTitle, eventDate },
  })
}

/**
 * Notificar pendentes (ainda não responderam)
 */
export async function notifyPendingInvites(
  userId: string,
  count: number
) {
  return createNotification({
    userId,
    title: '⏰ Convites Pendentes',
    message: `Você tem ${count} convite${count > 1 ? 's' : ''} aguardando resposta`,
    type: 'EVENT_INVITE',
    data: { count: String(count) },
  })
}
