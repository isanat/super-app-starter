'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  getFcmToken, 
  onMessageListener, 
  isNotificationSupported,
  getNotificationPermission,
  isFirebaseConfigured
} from '@/lib/firebase'
import { toast } from 'sonner'

interface FCMState {
  isSupported: boolean
  isConfigured: boolean
  permission: NotificationPermission | null
  token: string | null
  isLoading: boolean
  error: string | null
}

export function useFCM() {
  const [state, setState] = useState<FCMState>({
    isSupported: false,
    isConfigured: false,
    permission: null,
    token: null,
    isLoading: true,
    error: null,
  })

  // Inicializar
  useEffect(() => {
    async function init() {
      try {
        const supported = await isNotificationSupported()
        const configured = isFirebaseConfigured()
        const permission = getNotificationPermission()

        setState(prev => ({
          ...prev,
          isSupported: supported && configured,
          isConfigured: configured,
          permission,
          isLoading: false,
        }))
      } catch (error) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Erro ao verificar suporte a notificações',
        }))
      }
    }

    init()
  }, [])

  // Listener para mensagens em primeiro plano
  useEffect(() => {
    if (!state.isSupported) return () => {}

    const unsubscribe = onMessageListener((payload: any) => {
      console.log('📨 Push recebido em foreground:', payload)

      // Mostrar toast
      toast.info(payload.notification?.title || 'Nova notificação', {
        description: payload.notification?.body,
        action: payload.data?.eventId
          ? {
              label: 'Ver evento',
              onClick: () => {
                window.location.href = `/eventos/${payload.data.eventId}`
              },
            }
          : undefined,
      })

      // Disparar evento customizado
      window.dispatchEvent(new CustomEvent('fcm-message', { detail: payload }))
    })

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [state.isSupported])

  // Solicitar permissão e obter token
  const requestPermission = useCallback(async () => {
    if (!state.isSupported) {
      setState(prev => ({ ...prev, error: 'Notificações não suportadas' }))
      return null
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const token = await getFcmToken()

      if (token) {
        // Salvar token no servidor
        const res = await fetch('/api/fcm/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            token, 
            platform: 'web',
            deviceId: getDeviceId(),
          }),
        })

        if (res.ok) {
          setState(prev => ({
            ...prev,
            token,
            permission: 'granted',
            isLoading: false,
          }))
          toast.success('Notificações ativadas!')
          return token
        } else {
          throw new Error('Erro ao salvar token')
        }
      } else {
        setState(prev => ({
          ...prev,
          permission: Notification.permission,
          isLoading: false,
          error: Notification.permission === 'denied'
            ? 'Permissão negada. Habilite nas configurações do navegador.'
            : 'Não foi possível obter token',
        }))
        return null
      }
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Erro ao solicitar permissão',
      }))
      return null
    }
  }, [state.isSupported])

  // Remover token (logout)
  const removeToken = useCallback(async () => {
    if (!state.token) return

    try {
      await fetch(`/api/fcm/token?token=${state.token}`, {
        method: 'DELETE',
      })
      setState(prev => ({ ...prev, token: null }))
    } catch (error) {
      console.error('Erro ao remover token:', error)
    }
  }, [state.token])

  // Verificar status
  const needsPermission = state.isSupported && state.permission === 'default'
  const hasPermission = state.permission === 'granted'
  const isDenied = state.permission === 'denied'

  return {
    ...state,
    requestPermission,
    removeToken,
    needsPermission,
    hasPermission,
    isDenied,
  }
}

// Gerar ID único do dispositivo
function getDeviceId(): string {
  if (typeof window === 'undefined') return 'server'

  let deviceId = localStorage.getItem('deviceId')
  if (!deviceId) {
    deviceId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    localStorage.setItem('deviceId', deviceId)
  }
  return deviceId
}
