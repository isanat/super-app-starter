import admin from 'firebase-admin'

// Inicializar Firebase Admin SDK
function initializeFirebaseAdmin() {
  if (admin.apps.length) {
    return admin
  }

  try {
    const projectId = process.env.FIREBASE_PROJECT_ID
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
    let privateKey = process.env.FIREBASE_PRIVATE_KEY

    if (!projectId || !clientEmail || !privateKey) {
      console.log('⚠️ Firebase Admin: credenciais não configuradas')
      return null
    }

    // Processar a chave privada - garantir que as quebras de linha estejam corretas
    // A chave pode vir com \n literal ou com quebras de linha reais
    if (privateKey.includes('\\n')) {
      privateKey = privateKey.replace(/\\n/g, '\n')
    }

    // Remover espaços extras e garantir formato correto
    privateKey = privateKey.trim()

    // Verificar se a chave está no formato correto
    if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
      console.error('❌ Firebase Admin: chave privada inválida - falta BEGIN')
      return null
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    })
    
    console.log('✅ Firebase Admin inicializado com sucesso')
    return admin
  } catch (error: any) {
    console.error('❌ Erro ao inicializar Firebase Admin:', error.message)
    return null
  }
}

// Inicializar na primeira importação
const adminApp = initializeFirebaseAdmin()

// Exportar messaging se disponível
export const messaging = adminApp ? adminApp.messaging() : null

/**
 * Enviar notificação push para um token específico
 */
export async function sendPushNotification(
  token: string,
  data: {
    title: string
    body: string
    icon?: string
    click_action?: string
    data?: Record<string, string>
  }
) {
  if (!messaging) {
    console.log('⚠️ Firebase Messaging não disponível')
    return { success: false, error: 'Messaging não inicializado' }
  }

  try {
    const message = {
      token,
      notification: {
        title: data.title,
        body: data.body,
      },
      webpush: {
        notification: {
          icon: data.icon || '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          click_action: data.click_action || '/',
          vibrate: [100, 50, 100],
        },
      },
      data: {
        ...data.data,
        click_action: data.click_action || '/',
      },
    }

    const response = await messaging.send(message)
    console.log('✅ Push enviado:', response)
    return { success: true, messageId: response }
  } catch (error: any) {
    console.error('❌ Erro ao enviar push:', error.message)
    
    // Se o token é inválido
    if (error.code === 'messaging/invalid-registration-token' ||
        error.code === 'messaging/registration-token-not-registered') {
      return { success: false, error: 'INVALID_TOKEN' }
    }
    
    return { success: false, error: error.message }
  }
}

/**
 * Enviar notificação push para múltiplos tokens
 */
export async function sendMulticastPushNotification(
  tokens: string[],
  data: {
    title: string
    body: string
    icon?: string
    click_action?: string
    data?: Record<string, string>
  }
) {
  if (!messaging) {
    console.log('⚠️ Firebase Messaging não disponível')
    return { success: true, successCount: 0, failureCount: 0 }
  }

  if (tokens.length === 0) {
    return { success: true, successCount: 0, failureCount: 0 }
  }

  try {
    const message = {
      tokens,
      notification: {
        title: data.title,
        body: data.body,
      },
      webpush: {
        notification: {
          icon: data.icon || '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          click_action: data.click_action || '/',
          vibrate: [100, 50, 100],
        },
      },
      data: {
        ...data.data,
        click_action: data.click_action || '/',
      },
    }

    const response = await messaging.sendEachForMulticast(message)
    console.log(`✅ Push multicast: ${response.successCount} enviados, ${response.failureCount} falhas`)
    
    // Identificar tokens inválidos
    const invalidTokens: string[] = []
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        const error = resp.error
        if (error?.code === 'messaging/invalid-registration-token' ||
            error?.code === 'messaging/registration-token-not-registered') {
          invalidTokens.push(tokens[idx])
        }
      }
    })

    return { 
      success: true, 
      successCount: response.successCount, 
      failureCount: response.failureCount,
      invalidTokens 
    }
  } catch (error: any) {
    console.error('❌ Erro ao enviar multicast:', error.message)
    return { success: false, error: error.message }
  }
}

export default admin
