import { initializeApp } from 'firebase/app'
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging'

// Verificar se as credenciais estão configuradas
const hasCredentials = !!(
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
)

// Configuração do Firebase
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || '',
}

// Instâncias
let app: ReturnType<typeof initializeApp> | null = null
let messagingInstance: ReturnType<typeof getMessaging> | null = null

/**
 * Inicializar Firebase no cliente
 */
export async function initializeFirebase() {
  if (typeof window === 'undefined') return null

  if (!hasCredentials) {
    console.log('Firebase não configurado - credenciais ausentes')
    return null
  }

  try {
    if (!app) {
      app = initializeApp(firebaseConfig)
    }

    const supported = await isSupported()
    if (supported && !messagingInstance) {
      messagingInstance = getMessaging(app)
    }

    return { app, messaging: messagingInstance }
  } catch (error) {
    console.error('Erro ao inicializar Firebase:', error)
    return null
  }
}

/**
 * Solicitar permissão e obter token FCM
 */
export async function getFcmToken(): Promise<string | null> {
  try {
    const { messaging } = (await initializeFirebase()) || {}
    
    if (!messaging) {
      console.log('Messaging não suportado ou não configurado')
      return null
    }

    // Solicitar permissão
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      console.log('Permissão de notificação negada')
      return null
    }

    // Obter token
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
    if (!vapidKey) {
      console.error('VAPID key não configurada')
      return null
    }

    const token = await getToken(messaging, { vapidKey })
    return token
  } catch (error) {
    console.error('Erro ao obter token FCM:', error)
    return null
  }
}

/**
 * Listener para mensagens em primeiro plano
 */
export function onMessageListener(callback: (payload: any) => void) {
  if (typeof window === 'undefined') return () => {}

  let unsubscribe: (() => void) | undefined

  initializeFirebase().then(({ messaging }) => {
    if (messaging) {
      unsubscribe = onMessage(messaging, (payload) => {
        console.log('📨 Mensagem recebida:', payload)
        callback(payload)
      })
    }
  })

  return () => {
    if (unsubscribe) unsubscribe()
  }
}

/**
 * Verificar se notificações são suportadas
 */
export async function isNotificationSupported(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  
  const supported = await isSupported()
  return supported && 'Notification' in window && 'serviceWorker' in navigator
}

/**
 * Verificar permissão atual
 */
export function getNotificationPermission(): NotificationPermission | null {
  if (typeof window === 'undefined') return null
  return Notification.permission
}

/**
 * Verificar se Firebase está configurado
 */
export function isFirebaseConfigured(): boolean {
  return hasCredentials
}

export { messagingInstance as messaging }
